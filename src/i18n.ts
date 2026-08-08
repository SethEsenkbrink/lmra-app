/* src/i18n.ts - Handles Multilingual support */

export type Language = 'nl' | 'en';

export const translations = {
    nl: {
        'app_title': 'LMRA Pro',
        'app_subtitle': 'Laatste Minuut Risico Analyse',
        'btn_submit': 'Beoordeel Veiligheid',
        'btn_history': 'Mijn Dossier',
        'loc_label': 'Locatie / Asset',
        'comp_label': 'Bedrijf / Opdrachtgever',
        'wo_label': 'Werkorder Nr.',
        'cat_1': 'Algemeen & Fitheid',
        'q_1': 'Voel ik mij fysiek en mentaal fit voor deze klus?',
        'q_2': 'Weet ik wat te doen bij nood (alarmnummer, vluchtroute)?',
        'cat_2': 'Vergunningen & Procedures',
        'q_3': 'Is de werkvergunning correct ingevuld en getekend?',
        'q_4': 'Heb ik de taakrisicoanalyse (TRA) gelezen/begrepen?',
        'cat_3': 'Omgeving & Techniek',
        'q_5': 'Is de installatie veiliggesteld (LOTOTO / Vrij van spanning)?',
        'q_6': 'Heb ik de juiste PBM\'s en gekeurd gereedschap?',
        'q_7': 'Is de werkplek afgezet en vrij van struikelgevaar?',
        'comments': 'Opmerkingen',
        'sign_label': 'Handtekening Monteur',
        'btn_clear_sign': 'Wis',
        'photo_label': 'Bewijsmateriaal',
        'btn_take_photo': 'Maak Foto',
    },
    en: {
        'app_title': 'LMRA Pro',
        'app_subtitle': 'Last Minute Risk Analysis',
        'btn_submit': 'Assess Safety',
        'btn_history': 'My Archive',
        'loc_label': 'Location / Asset',
        'comp_label': 'Company / Client',
        'wo_label': 'Work Order No.',
        'cat_1': 'General & Fitness',
        'q_1': 'Do I feel physically and mentally fit for this job?',
        'q_2': 'Do I know what to do in an emergency (emergency number, escape route)?',
        'cat_2': 'Permits & Procedures',
        'q_3': 'Is the work permit correctly filled in and signed?',
        'q_4': 'Have I read/understood the task risk analysis (TRA)?',
        'cat_3': 'Environment & Technique',
        'q_5': 'Is the installation secured (LOTOTO / Free of voltage)?',
        'q_6': 'Do I have the correct PPE and inspected tools?',
        'q_7': 'Is the workplace cordoned off and free of tripping hazards?',
        'comments': 'Comments',
        'sign_label': 'Mechanic Signature',
        'btn_clear_sign': 'Clear',
        'photo_label': 'Evidence',
        'btn_take_photo': 'Take Photo',
    }
};

export const I18n = {
    currentLang: 'nl' as Language,

    init() {
        const savedLang = localStorage.getItem('lmra_lang') as Language;
        if (savedLang && (savedLang === 'nl' || savedLang === 'en')) {
            this.setLanguage(savedLang);
        }

        const btnLang = document.getElementById('btnToggleLang');
        if (btnLang) {
            btnLang.addEventListener('click', () => {
                const newLang = this.currentLang === 'nl' ? 'en' : 'nl';
                this.setLanguage(newLang);
            });
        }
    },

    setLanguage(lang: Language) {
        this.currentLang = lang;
        localStorage.setItem('lmra_lang', lang);
        this.applyTranslations();
        
        const btnLang = document.getElementById('btnToggleLang');
        if (btnLang) {
            btnLang.innerText = lang === 'nl' ? '🇳🇱 NL' : '🇬🇧 EN';
        }
    },

    applyTranslations() {
        const dict = translations[this.currentLang];
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (key && dict[key as keyof typeof dict]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    (el as HTMLInputElement).placeholder = dict[key as keyof typeof dict];
                } else {
                    el.textContent = dict[key as keyof typeof dict];
                }
            }
        });
    },
    
    t(key: keyof typeof translations['nl']): string {
        return translations[this.currentLang][key] || key;
    }
};
