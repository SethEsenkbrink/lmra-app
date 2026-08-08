/* src/profile-manager.ts - Handles User Profiles and Disclaimers in IndexedDB */
import { get, set } from 'idb-keyval';
import { UI } from './ui';

export interface UserProfile {
    monteur_naam: string;
    bedrijf_naam: string;
    disclaimer_accepted: boolean;
}

const PROFILE_KEY = 'lmra_user_profile';

export const ProfileManager = {
    async getProfile(): Promise<UserProfile | null> {
        try {
            return await get(PROFILE_KEY) || null;
        } catch (e) {
            console.error("Could not read profile", e);
            return null;
        }
    },

    async saveProfile(profile: UserProfile): Promise<boolean> {
        try {
            await set(PROFILE_KEY, profile);
            return true;
        } catch (e) {
            console.error("Could not save profile", e);
            return false;
        }
    },

    async checkAndShowDisclaimerIfNeeded(): Promise<void> {
        const profile = await this.getProfile();
        
        // Show disclaimer if profile doesn't exist or disclaimer not accepted
        if (!profile || !profile.disclaimer_accepted) {
            this.showProfileModal(true);
        } else {
            // Auto-fill form if profile exists
            this.autoFillForm(profile);
        }
    },

    showProfileModal(isFirstTime: boolean = false) {
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        
        UI.toggleElement('profileModal', true);

        const title = document.getElementById('profileModalTitle');
        if (title) title.innerText = isFirstTime ? "Welkom bij LMRA Pro!" : "Mijn Profiel";

        const disclaimerBlock = document.getElementById('profileDisclaimerBlock');
        if (disclaimerBlock) {
            if (isFirstTime) {
                disclaimerBlock.classList.remove('hidden');
            } else {
                disclaimerBlock.classList.add('hidden');
            }
        }

        // Fill existing data if any
        this.getProfile().then(profile => {
            if (profile) {
                const nameInput = document.getElementById('profileName') as HTMLInputElement;
                const companyInput = document.getElementById('profileCompany') as HTMLInputElement;
                if (nameInput) nameInput.value = profile.monteur_naam;
                if (companyInput) companyInput.value = profile.bedrijf_naam;
            }
        });
    },

    async saveFromModal(): Promise<void> {
        const nameInput = document.getElementById('profileName') as HTMLInputElement;
        const companyInput = document.getElementById('profileCompany') as HTMLInputElement;
        
        if (!nameInput || !nameInput.value.trim()) {
            UI.showToast("⚠️ Vul a.u.b. je naam in.");
            return;
        }

        const profile: UserProfile = {
            monteur_naam: nameInput.value.trim(),
            bedrijf_naam: companyInput ? companyInput.value.trim() : '',
            disclaimer_accepted: true
        };

        const success = await this.saveProfile(profile);
        if (success) {
            UI.toggleElement('profileModal', false);
            UI.showToast("✅ Profiel opgeslagen!");
            this.autoFillForm(profile);
        }
    },

    autoFillForm(profile: UserProfile) {
        const nameInput = document.getElementById('userName') as HTMLInputElement;
        const companyInput = document.getElementById('companyName') as HTMLInputElement;
        
        if (nameInput && !nameInput.value) nameInput.value = profile.monteur_naam;
        if (companyInput && !companyInput.value) companyInput.value = profile.bedrijf_naam;
    }
};
