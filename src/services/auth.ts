/* src/services/auth.ts */
import { UI } from '../ui';
import { CryptoManager, SecureStorage } from '../security';
import { SECURITY_CHECK_KEY } from '../config';
import { get, set } from 'idb-keyval';

const ATTEMPTS_KEY = 'lmra_failed_attempts_idb';

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

    async startSetupFlow(): Promise<void> {
        UI.toggleElement('pinModal', true);
        UI.toggleElement('setupMode', true);
        const title = document.getElementById('pinTitle');
        const desc = document.getElementById('pinDesc');
        const btn = document.getElementById('btnUnlock');
        
        if(title) title.innerText = "Stel PIN in";
        if(desc) desc.innerText = "Kies 6 cijfers";
        if(btn) btn.innerText = "Instellen & Starten";
        
        await set(ATTEMPTS_KEY, 0);
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

        // 1. Controleer DIRECT aan de poort of de gebruiker al geblokkeerd is
        const currentAttempts = (await get(ATTEMPTS_KEY)) as number || 0;
        if (currentAttempts >= 5) {
            await this.triggerWipe();
            if(errorMsg) errorMsg.innerText = "DATA GEWIST.";
            alert("⚠️ Applicatie vergrendeld. Data is gewist.");
            location.reload();
            return;
        }

        try {
            const storedSalt = localStorage.getItem('lmra_salt');

            // Genereer de cryptografische sleutel op basis van de pincode
            const { key, salt } = await CryptoManager.deriveKey(pin, storedSalt);
            CryptoManager.key = key;

            if (!storedSalt) {
                // Eerste keer instellen
                localStorage.setItem('lmra_salt', salt);
                await SecureStorage.set(SECURITY_CHECK_KEY, 'VALID_PIN');
                await set(ATTEMPTS_KEY, 0);
                onSuccess();
            } else {
                // Bestaande pincode controleren via ontgrendeling van de kluis
                const check = await SecureStorage.get(SECURITY_CHECK_KEY);
                if (check === 'VALID_PIN') {
                    await set(ATTEMPTS_KEY, 0);
                    onSuccess();
                } else {
                    throw new Error("Verkeerde PIN");
                }
            }
        } catch (e) {
            console.error(e);
            CryptoManager.key = null;

            if (localStorage.getItem('lmra_salt')) {
                // Haal de meest actuele stand op, verhoog deze direct
                let attempts = (await get(ATTEMPTS_KEY)) as number || 0;
                attempts++;
                await set(ATTEMPTS_KEY, attempts);

                if(errorMsg) {
                    if (attempts >= 5) {
                        await this.triggerWipe();
                        errorMsg.innerText = "DATA GEWIST.";
                        alert("⚠️ 5 Foute pogingen bereikt. Data is permanent gewist.");
                        location.reload();
                        return;
                    } else {
                        const left = 5 - attempts;
                        errorMsg.innerText = `Foutieve code. Nog ${left} ${left === 1 ? 'poging' : 'pogingen'}.`;
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
        await set(ATTEMPTS_KEY, 0);
    }
};