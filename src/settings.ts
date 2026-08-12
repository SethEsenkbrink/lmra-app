/* src/settings.ts - Lokale voorkeuren die een herstart moeten overleven
 *
 * Thema werd voorheen alleen op de <html> gezet en nergens bewaard: wie in de
 * nachtdienst donker instelde, begon de volgende dag weer in wit. De
 * handschoenmodus vergroot alle raakvlakken zodat je met werkhandschoenen aan
 * niet naast de JA/NEE-knop tikt.
 */

import { SETTINGS_KEY } from './config';
import { DEFAULT_TEMPLATE_ID } from './data';

export interface AppSettings {
    theme: 'light' | 'dark';
    gloveMode: boolean;
    lastTemplate: string;
}

const DEFAULTS: AppSettings = {
    theme: 'light',
    gloveMode: false,
    lastTemplate: DEFAULT_TEMPLATE_ID,
};

export const Settings = {
    current: { ...DEFAULTS } as AppSettings,

    load(): AppSettings {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<AppSettings>;
                this.current = { ...DEFAULTS, ...parsed };
            }
        } catch {
            this.current = { ...DEFAULTS };
        }
        return this.current;
    },

    save(): void {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.current));
        } catch {
            /* privémodus: instellingen gelden dan alleen deze sessie */
        }
    },

    /** Zet de bewaarde voorkeuren om in DOM-classes. */
    apply(): void {
        const root = document.documentElement;
        root.classList.toggle('dark', this.current.theme === 'dark');
        root.classList.toggle('glove-mode', this.current.gloveMode);
        this.updateIcons();
    },

    init(): AppSettings {
        this.load();
        // Nog geen keuze gemaakt? Volg dan de voorkeur van het toestel.
        try {
            if (!localStorage.getItem(SETTINGS_KEY) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.current.theme = 'dark';
            }
        } catch {
            /* niets */
        }
        this.apply();
        return this.current;
    },

    toggleTheme(): 'light' | 'dark' {
        this.current.theme = this.current.theme === 'dark' ? 'light' : 'dark';
        this.save();
        this.apply();
        return this.current.theme;
    },

    toggleGloveMode(): boolean {
        this.current.gloveMode = !this.current.gloveMode;
        this.save();
        this.apply();
        return this.current.gloveMode;
    },

    setLastTemplate(id: string): void {
        this.current.lastTemplate = id;
        this.save();
    },

    updateIcons(): void {
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className =
                this.current.theme === 'dark'
                    ? 'fa-solid fa-sun w-6 text-center text-amber-400 text-lg'
                    : 'fa-solid fa-moon w-6 text-center text-[#00447c] dark:text-blue-400 text-lg';
        }

        const gloveState = document.getElementById('gloveModeState');
        if (gloveState) gloveState.textContent = this.current.gloveMode ? 'AAN' : 'UIT';
    },
};
