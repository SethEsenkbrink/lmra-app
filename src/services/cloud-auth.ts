/* src/services/cloud-auth.ts */
import { supabase } from '../database';
import { UI } from '../ui';
import DOMPurify from 'dompurify';

export const CloudAuthService = {
    
    // Controleer of er een geldige sessie is
    async checkSession(): Promise<boolean> {
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) return false;

        // "Onthoud mij" Logica Check:
        // 1. Check of we "persistent" (30 dagen) in LocalStorage hebben staan
        const isPersistent = localStorage.getItem('lmra_auth_persist') === 'true';
        // 2. Check of we een tijdelijke sessie in SessionStorage hebben staan
        const isSession = sessionStorage.getItem('lmra_auth_session') === 'true';

        // Als BEIDE vlaggen ontbreken, betekent dit dat de gebruiker 'Onthoud mij' NIET had aangevinkt
        // én de browser heeft afgesloten (want sessionStorage is leeg).
        // Dan moeten we nu uitloggen.
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
        const emailInput = document.getElementById('cloudEmail') as HTMLInputElement;
        const passInput = document.getElementById('cloudPassword') as HTMLInputElement;
        const rememberInput = document.getElementById('rememberMe') as HTMLInputElement; // Checkbox
        const errorMsg = document.getElementById('cloudLoginError');

        if (btnLogin) {
            btnLogin.onclick = async () => {
                const email = DOMPurify.sanitize(emailInput.value);
                const password = DOMPurify.sanitize(passInput.value);
                const remember = rememberInput ? rememberInput.checked : true; // Fallback op true

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
                    // SUCCES: Nu zetten we de juiste vlaggetjes voor de sessie
                    if (remember) {
                        // Onthoud mij = AAN: Zet vlag in LocalStorage (blijft altijd bestaan)
                        localStorage.setItem('lmra_auth_persist', 'true');
                        sessionStorage.removeItem('lmra_auth_session');
                    } else {
                        // Onthoud mij = UIT: Zet vlag in SessionStorage (verdwijnt bij afsluiten browser)
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

    async signOut(): Promise<void> {
        // Ruim alle vlaggetjes op
        localStorage.removeItem('lmra_auth_persist');
        sessionStorage.removeItem('lmra_auth_session');
        
        await supabase.auth.signOut();
        window.location.reload(); 
    }
};