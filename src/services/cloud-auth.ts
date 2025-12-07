/* src/services/cloud-auth.ts */
import { supabase } from '../database';
import { UI } from '../ui';
import DOMPurify from 'dompurify';

export const CloudAuthService = {
    
    // Controleer of er een geldige sessie is
    async checkSession(): Promise<boolean> {
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) return false;

        // "Onthoud mij" Logica Check
        const isPersistent = localStorage.getItem('lmra_auth_persist') === 'true';
        const isSession = sessionStorage.getItem('lmra_auth_session') === 'true';

        // Als BEIDE vlaggen ontbreken (browser gesloten + onthoud mij stond uit), log uit.
        if (!isPersistent && !isSession) {
            console.log("Sessie verlopen (Browser gesloten en 'Onthoud mij' stond uit).");
            await this.signOut();
            return false;
        }

        return true;
    },

    // Toon het inlogscherm
    showLogin(onSuccess: () => void): void {
        UI.toggleElement('cloudLoginModal', true);
        
        const btnLogin = document.getElementById('btnCloudLogin');
        const btnForgot = document.getElementById('btnForgotPass');
        const emailInput = document.getElementById('cloudEmail') as HTMLInputElement;
        const passInput = document.getElementById('cloudPassword') as HTMLInputElement;
        const rememberInput = document.getElementById('rememberMe') as HTMLInputElement;
        const errorMsg = document.getElementById('cloudLoginError');

        // Wachtwoord vergeten logica
        if (btnForgot) {
            btnForgot.onclick = async () => {
                const email = DOMPurify.sanitize(emailInput.value);
                if (!email) {
                    if (errorMsg) errorMsg.innerText = "Vul eerst je e-mailadres in.";
                    return;
                }
                
                UI.setLoading('btnCloudLogin', true, "Verwerken..."); 
                if (errorMsg) errorMsg.innerText = "";

                // AANGEPAST: Slimme redirect keuze
                // Als we in 'productie' mode zijn (live), gebruiken we ALTIJD jouw officiële URL.
                // Als we lokaal aan het ontwikkelen zijn, gebruiken we localhost.
                const redirectUrl = import.meta.env.PROD 
                    ? 'https://lmrapro.nl' 
                    : window.location.origin;

                console.log("Wachtwoord reset link verwijst naar:", redirectUrl);

                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl,
                });

                UI.setLoading('btnCloudLogin', false, "Inloggen");

                if (error) {
                    console.error("Reset error:", error);
                    if (errorMsg) errorMsg.innerText = "Fout bij aanvragen. Controleer email.";
                } else {
                    alert(`📧 Check je e-mail! We hebben een herstellink gestuurd naar ${email}.\n(Link verwijst naar: ${redirectUrl})`);
                }
            };
        }

        // Inlog logica
        if (btnLogin) {
            btnLogin.onclick = async () => {
                const email = DOMPurify.sanitize(emailInput.value);
                const password = DOMPurify.sanitize(passInput.value);
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

    // Functie voor het afhandelen van de reset NA het klikken op de link
    async handlePasswordReset(): Promise<void> {
        // Zorg dat de login modal weg is, mocht die open staan
        UI.toggleElement('cloudLoginModal', false);
        UI.toggleElement('resetPasswordModal', true);
        
        const btnSave = document.getElementById('btnSavePassword');
        const passInput = document.getElementById('newPassword') as HTMLInputElement;
        const errorMsg = document.getElementById('resetError');

        if (btnSave) {
            btnSave.onclick = async () => {
                const newPassword = DOMPurify.sanitize(passInput.value);

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
                    if (errorMsg) errorMsg.innerText = "Kon wachtwoord niet opslaan. Sessie mogelijk verlopen.";
                } else {
                    alert("✅ Wachtwoord succesvol gewijzigd! Je wordt nu ingelogd.");
                    UI.toggleElement('resetPasswordModal', false);
                    
                    // Schoon de URL op (verwijder tokens)
                    window.history.replaceState(null, '', window.location.pathname);
                    window.location.reload();
                }
            };
        }
    },

    async signOut(): Promise<void> {
        localStorage.removeItem('lmra_auth_persist');
        sessionStorage.removeItem('lmra_auth_session');
        
        await supabase.auth.signOut();
        window.location.reload(); 
    }
};