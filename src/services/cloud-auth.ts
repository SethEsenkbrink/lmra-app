/* src/services/cloud-auth.ts */
import { supabase } from '../database';
import { UI } from '../ui';
import DOMPurify from 'dompurify';

export const CloudAuthService = {
    
    async checkSession(): Promise<boolean> {
        if (!supabase) {
            console.warn("CloudAuthService: Geen Supabase client. Gebruik Offline-only modus.");
            return true; // Laat de gebruiker door naar de app in offline modus
        }

        try {
            const { data } = await supabase.auth.getSession();
            if (!data.session) return false;

            const isPersistent = localStorage.getItem('lmra_auth_persist') === 'true';
            const isSession = sessionStorage.getItem('lmra_auth_session') === 'true';

            if (!isPersistent && !isSession) {
                console.log("Sessie verlopen (Browser gesloten en 'Onthoud mij' stond uit).");
                await this.signOut();
                return false;
            }
            return true;
        } catch (e) {
            console.error("Fout bij ophalen sessie:", e);
            return true; // Fallback naar offline
        }
    },

    showLogin(onSuccess: () => void): void {
        if (!supabase) {
            console.warn("CloudAuthService: Geen Supabase. Sla login over.");
            onSuccess();
            return;
        }

        UI.toggleElement('cloudLoginModal', true);
        // ... rest van de code met supabase.auth aanroepen ...
        const btnLogin = document.getElementById('btnCloudLogin');
        const btnForgot = document.getElementById('btnForgotPass');
        const emailInput = document.getElementById('cloudEmail') as HTMLInputElement;
        const passInput = document.getElementById('cloudPassword') as HTMLInputElement;
        const rememberInput = document.getElementById('rememberMe') as HTMLInputElement;
        const errorMsg = document.getElementById('cloudLoginError');

        if (btnForgot) {
            btnForgot.onclick = async () => {
                if (!supabase) return;
                const email = (DOMPurify as any).sanitize(emailInput.value);
                if (!email) {
                    if (errorMsg) errorMsg.innerText = "Vul eerst je e-mailadres in.";
                    return;
                }
                
                UI.setLoading('btnCloudLogin', true, "Verwerken..."); 
                if (errorMsg) errorMsg.innerText = "";

                const redirectUrl = import.meta.env.PROD 
                    ? 'https://lmrapro.nl' 
                    : window.location.origin;

                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl,
                });

                UI.setLoading('btnCloudLogin', false, "Inloggen");

                if (error) {
                    console.error("Reset error:", error);
                    if (errorMsg) errorMsg.innerText = "Fout bij aanvragen. Controleer email.";
                } else {
                    alert(`📧 Check je e-mail! We hebben een herstellink gestuurd naar ${email}.`);
                }
            };
        }

        if (btnLogin) {
            btnLogin.onclick = async () => {
                if (!supabase) return;
                const email = (DOMPurify as any).sanitize(emailInput.value);
                const password = (DOMPurify as any).sanitize(passInput.value);
                const remember = rememberInput ? rememberInput.checked : true;

                if (!email || !password) {
                    if (errorMsg) errorMsg.innerText = "Vul alle velden in.";
                    return;
                }

                UI.setLoading('btnCloudLogin', true);
                if (errorMsg) errorMsg.innerText = "";

                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    console.error("Login fout:", error);
                    UI.setLoading('btnCloudLogin', false, "Inloggen");
                    if (errorMsg) errorMsg.innerText = "Ongeldige inloggegevens.";
                } else {
                    if (remember) {
                        localStorage.setItem('lmra_auth_persist', 'true');
                        sessionStorage.removeItem('lmra_auth_session');
                    } else {
                        localStorage.removeItem('lmra_auth_persist');
                        sessionStorage.setItem('lmra_auth_session', 'true');
                    }

                    UI.setLoading('btnCloudLogin', false, "Inloggen");
                    UI.toggleElement('cloudLoginModal', false);
                    onSuccess();
                }
            };
        }
    },

    // AANGEPAST: Forceer PIN modal dicht!
    async handlePasswordReset(): Promise<void> {
        if (!supabase) return;
        // Sluit alle mogelijke andere schermen die in de weg kunnen zitten
        UI.toggleElement('pinModal', false);        
        UI.toggleElement('cloudLoginModal', false);
        
        // Open het reset scherm
        UI.toggleElement('resetPasswordModal', true);
        
        const btnSave = document.getElementById('btnSavePassword');
        const passInput = document.getElementById('newPassword') as HTMLInputElement;
        const errorMsg = document.getElementById('resetError');

        if (btnSave) {
            btnSave.onclick = async () => {
                if (!supabase) return;
                const newPassword = (DOMPurify as any).sanitize(passInput.value);

                if (newPassword.length < 6) {
                    if (errorMsg) errorMsg.innerText = "Wachtwoord te kort (min 6 tekens).";
                    return;
                }

                UI.setLoading('btnSavePassword', true);
                if (errorMsg) errorMsg.innerText = "";

                const { error } = await supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) {
                    console.error("Update error:", error);
                    UI.setLoading('btnSavePassword', false, "Opslaan & Inloggen");
                    if (errorMsg) errorMsg.innerText = "Kon wachtwoord niet opslaan.";
                } else {
                    alert("✅ Wachtwoord succesvol gewijzigd! Je wordt nu ingelogd.");
                    UI.toggleElement('resetPasswordModal', false);
                    
                    window.history.replaceState(null, '', window.location.pathname);
                    window.location.reload();
                }
            };
        }
    },

    async signOut(): Promise<void> {
        localStorage.removeItem('lmra_auth_persist');
        sessionStorage.removeItem('lmra_auth_session');
        
        if (supabase) {
            await supabase.auth.signOut();
        }
        window.location.reload(); 
    }
};;