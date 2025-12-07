/* src/services/auth.ts */
import { UI } from '../ui';
import { CryptoManager, SecureStorage } from '../security';
import { SECURITY_CHECK_KEY } from '../config';

export const AuthService = {
    async init(onUnlock: () => void): Promise<void> {
        const hasSalt = localStorage.getItem('lmra_salt');
        if (!hasSalt) {
            this.startSetupFlow();
        } else {
            this.startUnlockFlow();
        }

        // Koppel event listener hier of in App
        const btn = document.getElementById('btnUnlock');
        if(btn) btn.onclick = () => this.handleUnlock(onUnlock);
        
        // PIN inputs logica
        const inputs = document.querySelectorAll('.pin-digit') as NodeListOf<HTMLInputElement>;
        inputs.forEach((input, index) => {
            input.oninput = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            };
            input.onkeydown = (e) => {
                const target = e.target as HTMLInputElement;
                if (e.key === 'Backspace' && target.value === '' && index > 0) {
                    inputs[index - 1].focus();
                }
                if (e.key === 'Enter') this.handleUnlock(onUnlock);
            };
        });
    },

    startSetupFlow(): void {
        UI.toggleElement('pinModal', true);
        UI.toggleElement('setupMode', true);
        const title = document.getElementById('pinTitle');
        const desc = document.getElementById('pinDesc');
        const btn = document.getElementById('btnUnlock');
        
        if(title) title.innerText = "Stel PIN in";
        if(desc) desc.innerText = "Kies 6 cijfers";
        if(btn) btn.innerText = "Instellen & Starten";
        
        localStorage.setItem('lmra_failed_attempts', '0');
    },

    startUnlockFlow(): void {
        UI.toggleElement('pinModal', true);
        UI.toggleElement('setupMode', false);
        
        const title = document.getElementById('pinTitle');
        const btn = document.getElementById('btnUnlock');
        
        if(title) title.innerText = "Beveiligde Toegang";
        if(btn) btn.innerText = "Ontgrendelen";
        
        setTimeout(() => (document.querySelector('.pin-digit') as HTMLInputElement)?.focus(), 100);
    },

    async handleUnlock(onSuccess: () => void): Promise<void> {
        const inputs = document.querySelectorAll('.pin-digit') as NodeListOf<HTMLInputElement>;
        let pin = '';
        inputs.forEach(i => pin += i.value);

        if (pin.length !== 6) return UI.showToast("Voer 6 cijfers in.");

        UI.setLoading('btnUnlock', true);
        const errorMsg = document.getElementById('pinError');
        if(errorMsg) {
            errorMsg.innerText = "";
            errorMsg.className = "text-red-500 text-xs font-bold h-4 mb-4";
        }

        try {
            const storedSalt = localStorage.getItem('lmra_salt');
            let attempts = parseInt(localStorage.getItem('lmra_failed_attempts') || '0');
            if (attempts >= 5) {
                await this.triggerWipe();
                throw new Error("SECURITY_LOCKOUT");
            }

            const { key, salt } = await CryptoManager.deriveKey(pin, storedSalt);
            CryptoManager.key = key;

            if (!storedSalt) {
                localStorage.setItem('lmra_salt', salt);
                await SecureStorage.set(SECURITY_CHECK_KEY, 'VALID_PIN');
                localStorage.setItem('lmra_failed_attempts', '0');
                onSuccess();
            } else {
                const check = await SecureStorage.get(SECURITY_CHECK_KEY);
                if (check === 'VALID_PIN') {
                    localStorage.setItem('lmra_failed_attempts', '0');
                    onSuccess();
                } else {
                    throw new Error("Verkeerde PIN");
                }
            }
        } catch (e) {
            console.error(e);
            CryptoManager.key = null;
            if (localStorage.getItem('lmra_salt')) {
                let attempts = parseInt(localStorage.getItem('lmra_failed_attempts') || '0');
                attempts++;
                localStorage.setItem('lmra_failed_attempts', attempts.toString());

                if(errorMsg) {
                    if (attempts >= 5) {
                        await this.triggerWipe();
                        errorMsg.innerText = "DATA GEWIST.";
                        alert("⚠️ 5 Foute pogingen. Data gewist.");
                        location.reload();
                        return;
                    } else {
                        const left = 5 - attempts;
                        errorMsg.innerText = `Foutieve code. Nog ${left} pogingen.`;
                    }
                }
            }
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        } finally {
            UI.setLoading('btnUnlock', false, "Ontgrendelen");
        }
    },

    async triggerWipe(): Promise<void> {
        await SecureStorage.wipeEverything();
        localStorage.clear();
    }
};