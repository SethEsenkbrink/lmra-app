/* src/i18n.ts - Meertalige ondersteuning: Nederlands, Engels, Duits, Pools
 *
 * In de Nederlandse industrie werken veel Duitse en Poolse monteurs.
 * Veiligheidsvragen die je niet begrijpt, vink je gedachteloos af - daarom staan
 * de vragen hier in vier talen.
 *
 * Let op: het PDF-rapport blijft altijd Nederlands. Dat is het document dat de
 * werkgever of opdrachtgever leest en archiveert.
 *
 * Opzet: één regel per key met [nl, en, de, pl]. Compacter en makkelijker bij te
 * houden dan vier losse woordenboeken.
 */

export type Language = 'nl' | 'en' | 'de' | 'pl';

export const LANGUAGES: Array<{ code: Language; label: string; flag: string }> = [
    { code: 'nl', label: 'NL', flag: '🇳🇱' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'de', label: 'DE', flag: '🇩🇪' },
    { code: 'pl', label: 'PL', flag: '🇵🇱' },
];

const LANG_INDEX: Record<Language, number> = { nl: 0, en: 1, de: 2, pl: 3 };

/** [nl, en, de, pl] */
type Entry = [string, string, string, string];

export const TABLE: Record<string, Entry> = {
    /* ---------------------------------------------------------- interface */
    app_title: ['LMRA Pro', 'LMRA Pro', 'LMRA Pro', 'LMRA Pro'],
    app_subtitle: [
        'Laatste Minuut Risico Analyse',
        'Last Minute Risk Analysis',
        'Letzte-Minute-Risikoanalyse',
        'Analiza ryzyka w ostatniej minucie',
    ],
    btn_submit: ['Beoordeel Veiligheid', 'Assess Safety', 'Sicherheit bewerten', 'Oceń bezpieczeństwo'],
    btn_history: ['Mijn Dossier', 'My Archive', 'Mein Archiv', 'Moje archiwum'],
    comp_label: ['Bedrijf / Opdrachtgever', 'Company / Client', 'Firma / Auftraggeber', 'Firma / Zleceniodawca'],
    user_label: ['Monteur', 'Technician', 'Monteur', 'Monter'],
    loc_label: ['Locatie / Asset', 'Location / Asset', 'Ort / Anlage', 'Lokalizacja / Maszyna'],
    wo_label: ['Werkorder Nr.', 'Work Order No.', 'Auftragsnummer', 'Numer zlecenia'],
    task_label: ['Soort werk', 'Type of work', 'Art der Arbeit', 'Rodzaj pracy'],
    comments: ['Opmerkingen', 'Comments', 'Bemerkungen', 'Uwagi'],
    sign_label: ['Handtekening Monteur', 'Technician Signature', 'Unterschrift Monteur', 'Podpis montera'],
    btn_clear_sign: ['Wis', 'Clear', 'Löschen', 'Wyczyść'],
    btn_undo_sign: ['Herstel', 'Undo', 'Zurück', 'Cofnij'],
    photo_label: ['Bewijsmateriaal', 'Evidence', 'Nachweis', 'Dowód (zdjęcia)'],
    btn_take_photo: ['Maak Foto', 'Take Photo', 'Foto machen', 'Zrób zdjęcie'],
    answer_yes: ['JA', 'YES', 'JA', 'TAK'],
    answer_no: ['NEE', 'NO', 'NEIN', 'NIE'],
    action_label: [
        'Verplichte actie / maatregel',
        'Required action / measure',
        'Erforderliche Maßnahme',
        'Wymagane działanie',
    ],
    action_placeholder: [
        'Wat doe je om dit veilig te maken?',
        'What are you doing to make this safe?',
        'Was tun Sie, um dies sicher zu machen?',
        'Co robisz, aby było bezpiecznie?',
    ],
    menu_glove: ['Handschoenmodus', 'Glove mode', 'Handschuhmodus', 'Tryb rękawic'],
    state_on: ['AAN', 'ON', 'EIN', 'WŁ'],
    state_off: ['UIT', 'OFF', 'AUS', 'WYŁ'],
    menu_backup: ['Back-up & herstel', 'Backup & restore', 'Backup & Wiederherstellung', 'Kopia zapasowa'],
    menu_qr: ['QR-stickers maken', 'Create QR labels', 'QR-Aufkleber erstellen', 'Utwórz naklejki QR'],

    /* --------------------------------------------- formulier & modals */
    hdr_work: ['Werk- & Bedrijfsgegevens', 'Work & Company details', 'Arbeits- & Firmendaten', 'Dane pracy i firmy'],
    hint_extra: ['Extra vragen per klus', 'Extra questions per job', 'Zusatzfragen je Auftrag', 'Dodatkowe pytania'],
    time_start: ['Starttijd', 'Start time', 'Startzeit', 'Godzina rozpoczęcia'],
    time_valid: ['Geldig tot', 'Valid until', 'Gültig bis', 'Ważne do'],
    buddy_check: ['Buddy Check', 'Buddy check', 'Buddy-Check', 'Kontrola z asystą'],
    buddy_name: ['Naam Buddy', 'Buddy name', 'Name Buddy', 'Imię asystenta'],
    ph_company: ['Bijv. Brink Multimedia B.V. of Klant X', 'E.g. Acme Ltd or Client X', 'z. B. Acme GmbH oder Kunde X', 'np. Acme sp. z o.o.'],
    ph_user: ['Naam', 'Name', 'Name', 'Imię i nazwisko'],
    ph_loc: ['Bijv. E-Motor 401', 'E.g. E-Motor 401', 'z. B. E-Motor 401', 'np. Silnik E-401'],
    ph_wo: ['Bijv. WO-2026-A', 'E.g. WO-2026-A', 'z. B. WO-2026-A', 'np. WO-2026-A'],
    ph_comments: ['Bijv: Extra aardlekschakelaar geplaatst...', 'E.g. extra earth leakage breaker fitted...', 'z. B. zusätzlichen FI-Schalter gesetzt...', 'np. założono dodatkowy wyłącznik różnicowy...'],
    photo_empty: ["Geen foto's toegevoegd. Maximaal 3. (Optioneel)", 'No photos added. Maximum 3. (Optional)', 'Keine Fotos hinzugefügt. Maximal 3. (Optional)', 'Brak zdjęć. Maksymalnie 3. (Opcjonalnie)'],
    sign_hint: ['Teken hierboven met je vinger of muis', 'Sign above with your finger or mouse', 'Oben mit Finger oder Maus unterschreiben', 'Podpisz powyżej palcem lub myszką'],
    declaration: [
        "Ik verklaar dat ik deze LMRA naar waarheid heb ingevuld en de risico's begrijp.",
        'I declare that I completed this LMRA truthfully and understand the risks.',
        'Ich erklare, dass ich diese Analyse wahrheitsgemäß ausgefüllt habe und die Risiken verstehe.',
        'Oświadczam, że wypełniłem tę analizę zgodnie z prawdą i rozumiem ryzyko.',
    ],
    session_valid: ['Geldig tot --:--', 'Valid until --:--', 'Gültig bis --:--', 'Ważne do --:--'],
    session_expired: ['LMRA Verlopen', 'LMRA expired', 'Analyse abgelaufen', 'Analiza wygasła'],
    session_expired_sub: [
        'Start een nieuwe check of verleng de huidige.',
        'Start a new check or extend the current one.',
        'Neue Prüfung starten oder die aktuelle verlängern.',
        'Rozpocznij nową kontrolę lub przedłuż obecną.',
    ],
    history: ['Geschiedenis', 'History', 'Verlauf', 'Historia'],
    btn_clear: ['Wissen', 'Clear', 'Löschen', 'Wyczyść'],
    report_details: ['Rapport Details', 'Report details', 'Berichtdetails', 'Szczegóły raportu'],
    btn_close: ['Sluiten', 'Close', 'Schließen', 'Zamknij'],
    btn_copy: ['Kopieer', 'Copy', 'Kopieren', 'Kopiuj'],
    profile_title: ['Mijn Profiel', 'My profile', 'Mein Profil', 'Mój profil'],
    profile_name: ['Naam Monteur', 'Technician name', 'Name Monteur', 'Imię montera'],
    profile_company: ['Bedrijfsnaam', 'Company name', 'Firmenname', 'Nazwa firmy'],
    profile_save: ['Ik ga akkoord & Opslaan', 'I agree & save', 'Einverstanden & speichern', 'Zgadzam się i zapisz'],
    menu_title: ['Menu', 'Menu', 'Menü', 'Menu'],
    menu_theme: ['Thema Wisselen', 'Switch theme', 'Thema wechseln', 'Zmień motyw'],
    menu_info: ['Info & Landingspagina', 'Info & home page', 'Info & Startseite', 'Informacje i strona'],
    menu_knowledge: ['Kennisbank', 'Knowledge base', 'Wissensdatenbank', 'Baza wiedzy'],
    menu_release: ['Release Notes', 'Release notes', 'Versionshinweise', 'Informacje o wersji'],
    menu_terms: ['Algemene Voorwaarden', 'Terms and conditions', 'AGB', 'Regulamin'],
    menu_privacy: ['Privacyverklaring', 'Privacy statement', 'Datenschutzerklärung', 'Polityka prywatności'],
    menu_backup_export: ['Back-up maken', 'Create backup', 'Backup erstellen', 'Utwórz kopię'],
    menu_backup_import: ['Back-up terugzetten', 'Restore backup', 'Backup wiederherstellen', 'Przywróć kopię'],
    menu_cookies: ['Cookievoorkeuren', 'Cookie preferences', 'Cookie-Einstellungen', 'Ustawienia cookies'],
    menu_diag: ['Diagnose & Logs', 'Diagnostics & logs', 'Diagnose & Protokolle', 'Diagnostyka i logi'],
    menu_reset: ['Formulier Wissen', 'Clear form', 'Formular löschen', 'Wyczyść formularz'],
    qr_scan_title: ['Scan QR Code', 'Scan QR code', 'QR-Code scannen', 'Skanuj kod QR'],
    qr_scan_hint: [
        'Richt de camera op een asset QR-code.',
        'Point the camera at an asset QR code.',
        'Kamera auf den QR-Code der Anlage richten.',
        'Skieruj kamerę na kod QR maszyny.',
    ],
    qr_labels: ['Namen (één per regel)', 'Names (one per line)', 'Namen (eine pro Zeile)', 'Nazwy (jedna na wiersz)'],
    qr_size: ['Formaat', 'Size', 'Größe', 'Rozmiar'],
    qr_preview: ['Voorbeeld', 'Preview', 'Vorschau', 'Podgląd'],
    qr_as_link: [
        'Sticker opent de app met de locatie erin (aanbevolen)',
        'Sticker opens the app with the location filled in (recommended)',
        'Aufkleber öffnet die App mit dem Ort (empfohlen)',
        'Naklejka otwiera aplikację z lokalizacją (zalecane)',
    ],
    qr_download: ['Stickerblad downloaden', 'Download sticker sheet', 'Aufkleberbogen herunterladen', 'Pobierz arkusz naklejek'],

    /* ---------------------------------------------------------- templates */
    tpl_algemeen: ['Algemeen', 'General', 'Allgemein', 'Ogólne'],
    tpl_hoogte: ['Werken op hoogte', 'Working at height', 'Arbeiten in der Höhe', 'Praca na wysokości'],
    tpl_besloten: ['Besloten ruimte', 'Confined space', 'Enger Raum', 'Przestrzeń zamknięta'],
    tpl_heet: ['Heet werk', 'Hot work', 'Heißarbeiten', 'Prace gorące'],
    tpl_elektro: ['Elektrotechniek', 'Electrical work', 'Elektrotechnik', 'Elektrotechnika'],
    tpl_hijsen: ['Hijsen & takelen', 'Lifting & hoisting', 'Heben & Anschlagen', 'Podnoszenie i dźwigi'],

    /* --------------------------------------------------------- categorieën */
    cat_alg: ['Algemeen & Fitheid', 'General & Fitness', 'Allgemein & Fitness', 'Ogólne i samopoczucie'],
    cat_verg: [
        'Vergunningen & Procedures',
        'Permits & Procedures',
        'Genehmigungen & Verfahren',
        'Zezwolenia i procedury',
    ],
    cat_omg: ['Omgeving & Techniek', 'Environment & Technique', 'Umgebung & Technik', 'Otoczenie i technika'],
    cat_hoogte: ['Werken op hoogte', 'Working at height', 'Arbeiten in der Höhe', 'Praca na wysokości'],
    cat_besloten: ['Besloten ruimte', 'Confined space', 'Enger Raum', 'Przestrzeń zamknięta'],
    cat_heet: ['Heet werk', 'Hot work', 'Heißarbeiten', 'Prace gorące'],
    cat_elektro: ['Elektrotechniek', 'Electrical work', 'Elektrotechnik', 'Elektrotechnika'],
    cat_hijsen: ['Hijsen & takelen', 'Lifting & hoisting', 'Heben & Anschlagen', 'Podnoszenie i dźwigi'],

    /* -------------------------------------------------------- basisvragen */
    q_1: [
        'Voel ik mij fysiek en mentaal fit voor deze klus?',
        'Do I feel physically and mentally fit for this job?',
        'Fühle ich mich körperlich und geistig fit für diese Arbeit?',
        'Czy czuję się fizycznie i psychicznie zdolny do tej pracy?',
    ],
    q_2: [
        'Weet ik wat te doen bij nood (alarmnummer, vluchtroute)?',
        'Do I know what to do in an emergency (emergency number, escape route)?',
        'Weiß ich, was im Notfall zu tun ist (Notrufnummer, Fluchtweg)?',
        'Czy wiem, co robić w razie awarii (numer alarmowy, droga ewakuacyjna)?',
    ],
    q_3: [
        'Is de werkvergunning correct ingevuld en getekend?',
        'Is the work permit correctly filled in and signed?',
        'Ist die Arbeitserlaubnis korrekt ausgefüllt und unterschrieben?',
        'Czy zezwolenie na pracę jest poprawnie wypełnione i podpisane?',
    ],
    q_4: [
        'Heb ik de taakrisicoanalyse (TRA) gelezen en begrepen?',
        'Have I read and understood the task risk analysis (TRA)?',
        'Habe ich die Gefährdungsbeurteilung gelesen und verstanden?',
        'Czy przeczytałem i zrozumiałem analizę ryzyka zadania?',
    ],
    q_5: [
        'Is de installatie veiliggesteld (LOTOTO / vrij van spanning)?',
        'Is the installation secured (LOTOTO / free of voltage)?',
        'Ist die Anlage gesichert (LOTOTO / spannungsfrei)?',
        'Czy instalacja jest zabezpieczona (LOTOTO / bez napięcia)?',
    ],
    q_6: [
        "Heb ik de juiste PBM's en gekeurd gereedschap?",
        'Do I have the correct PPE and inspected tools?',
        'Habe ich die richtige PSA und geprüftes Werkzeug?',
        'Czy mam właściwe środki ochrony i sprawdzone narzędzia?',
    ],
    q_7: [
        'Is de werkplek afgezet en vrij van struikelgevaar?',
        'Is the workplace cordoned off and free of tripping hazards?',
        'Ist der Arbeitsplatz abgesperrt und frei von Stolperstellen?',
        'Czy miejsce pracy jest odgrodzone i wolne od przeszkód?',
    ],

    /* --------------------------------------------------- werken op hoogte */
    q_101: [
        'Is de valbeveiliging aanwezig, gekeurd en aangebracht (harnas, ankerpunt, leuning)?',
        'Is fall protection present, inspected and attached (harness, anchor point, railing)?',
        'Ist die Absturzsicherung vorhanden, geprüft und angebracht (Gurt, Anschlagpunkt, Geländer)?',
        'Czy zabezpieczenie przed upadkiem jest obecne, sprawdzone i założone (szelki, punkt zaczepienia, balustrada)?',
    ],
    q_102: [
        'Staan ladder, steiger of hoogwerker stabiel op een vlakke en draagkrachtige ondergrond?',
        'Are the ladder, scaffold or aerial platform stable on level, load-bearing ground?',
        'Stehen Leiter, Gerüst oder Hebebühne stabil auf tragfähigem, ebenem Boden?',
        'Czy drabina, rusztowanie lub podnośnik stoją stabilnie na równym i nośnym podłożu?',
    ],
    q_103: [
        'Is de zone onder het werk afgezet tegen vallende voorwerpen?',
        'Is the area below the work cordoned off against falling objects?',
        'Ist der Bereich unter der Arbeit gegen herabfallende Gegenstände abgesperrt?',
        'Czy strefa pod miejscem pracy jest odgrodzona przed spadającymi przedmiotami?',
    ],

    /* ----------------------------------------------------- besloten ruimte */
    q_201: [
        'Is de ruimte vrijgegeven, gemeten (O2, LEL, H2S) en wordt er geventileerd?',
        'Is the space released, measured (O2, LEL, H2S) and ventilated?',
        'Ist der Raum freigegeben, gemessen (O2, UEG, H2S) und wird belüftet?',
        'Czy przestrzeń jest dopuszczona, zmierzona (O2, LEL, H2S) i wentylowana?',
    ],
    q_202: [
        'Staat er een mangatwacht buiten met een werkend communicatiemiddel?',
        'Is there an attendant outside with working communication equipment?',
        'Steht ein Sicherungsposten außen mit funktionierendem Kommunikationsmittel?',
        'Czy na zewnątrz jest asekurujący z działającym środkiem łączności?',
    ],
    q_203: [
        'Is de toegang veiliggesteld en zijn redding en hulpverlening geregeld?',
        'Is access secured and are rescue and first aid arranged?',
        'Ist der Zugang gesichert und sind Rettung und Erste Hilfe geregelt?',
        'Czy wejście jest zabezpieczone, a ratownictwo i pomoc zorganizowane?',
    ],

    /* ------------------------------------------------------------ heet werk */
    q_301: [
        'Is er een geldige heet-werkvergunning en is de omgeving vrij van brandbaar materiaal?',
        'Is there a valid hot work permit and is the area free of flammable material?',
        'Liegt ein gültiger Heißarbeitsschein vor und ist die Umgebung frei von brennbarem Material?',
        'Czy jest ważne zezwolenie na prace gorące, a otoczenie wolne od materiałów palnych?',
    ],
    q_302: [
        'Staat blusmiddel binnen handbereik en is er een brandwacht aanwezig?',
        'Is extinguishing equipment within reach and is a fire watch present?',
        'Ist ein Löschmittel in Reichweite und ist eine Brandwache anwesend?',
        'Czy sprzęt gaśniczy jest pod ręką i czy jest obecna asekuracja przeciwpożarowa?',
    ],
    q_303: [
        'Zijn openingen, riolen en leidingen afgedekt tegen vonken en is nazorg geregeld?',
        'Are openings, drains and pipes covered against sparks and is aftercare arranged?',
        'Sind Öffnungen, Abläufe und Leitungen gegen Funken abgedeckt und ist die Nachkontrolle geregelt?',
        'Czy otwory, kanały i rury są zabezpieczone przed iskrami i czy zaplanowano kontrolę po pracy?',
    ],

    /* ------------------------------------------------------- elektrotechniek */
    q_401: [
        'Is de installatie spanningsloos gemaakt, vergrendeld en met een meting gecontroleerd?',
        'Has the installation been de-energised, locked out and verified by measurement?',
        'Wurde die Anlage freigeschaltet, verriegelt und durch Messung geprüft?',
        'Czy instalacja została wyłączona, zablokowana i sprawdzona pomiarem?',
    ],
    q_402: [
        "Gebruik ik gereedschap en PBM's die geschikt zijn voor deze spanning (NEN 3140)?",
        'Am I using tools and PPE suitable for this voltage?',
        'Verwende ich Werkzeug und PSA, die für diese Spannung geeignet sind?',
        'Czy używam narzędzi i środków ochrony odpowiednich do tego napięcia?',
    ],
    q_403: [
        'Weet ik wie de installatieverantwoordelijke is en is de schakelhandeling gemeld?',
        'Do I know who is responsible for the installation and has the switching been reported?',
        'Weiß ich, wer die Anlagenverantwortung hat, und ist die Schalthandlung gemeldet?',
        'Czy wiem, kto odpowiada za instalację i czy przełączenie zostało zgłoszone?',
    ],

    /* ------------------------------------------------------ hijsen & takelen */
    q_501: [
        'Zijn de hijsmiddelen gekeurd en valt het gewicht binnen de lasttabel?',
        'Is the lifting gear inspected and is the weight within the load chart?',
        'Sind die Hebemittel geprüft und liegt das Gewicht in der Lasttabelle?',
        'Czy sprzęt do podnoszenia jest sprawdzony, a masa mieści się w tabeli udźwigu?',
    ],
    q_502: [
        'Is de hijszone afgezet en blijft niemand onder of naast de last staan?',
        'Is the lifting zone cordoned off and does nobody stand under or beside the load?',
        'Ist der Hebebereich abgesperrt und hält sich niemand unter oder neben der Last auf?',
        'Czy strefa podnoszenia jest odgrodzona i nikt nie stoi pod ładunkiem ani obok niego?',
    ],
    q_503: [
        'Zijn windkracht, zicht en handsignalen afgesproken met de kraanmachinist?',
        'Have wind force, visibility and hand signals been agreed with the crane operator?',
        'Sind Windstärke, Sicht und Handzeichen mit dem Kranführer abgestimmt?',
        'Czy siła wiatru, widoczność i sygnały ręczne są ustalone z operatorem żurawia?',
    ],
};

function isLanguage(value: string | null): value is Language {
    return value === 'nl' || value === 'en' || value === 'de' || value === 'pl';
}

export const I18n = {
    currentLang: 'nl' as Language,
    onChange: null as null | (() => void),

    init(): void {
        let saved: string | null = null;
        try {
            saved = localStorage.getItem('lmra_lang');
        } catch {
            /* privémodus */
        }
        const browser = (navigator.language || 'nl').slice(0, 2).toLowerCase();
        const start: Language = isLanguage(saved) ? saved : isLanguage(browser) ? browser : 'nl';
        this.setLanguage(start);

        document.getElementById('btnToggleLang')?.addEventListener('click', () => this.next());
    },

    next(): void {
        const index = LANGUAGES.findIndex((l) => l.code === this.currentLang);
        this.setLanguage(LANGUAGES[(index + 1) % LANGUAGES.length].code);
    },

    setLanguage(lang: Language): void {
        this.currentLang = lang;
        try {
            localStorage.setItem('lmra_lang', lang);
        } catch {
            /* privémodus: taal geldt dan alleen deze sessie */
        }
        document.documentElement.setAttribute('lang', lang);
        this.applyTranslations();

        const btnLang = document.getElementById('btnToggleLang');
        const meta = LANGUAGES.find((l) => l.code === lang);
        if (btnLang && meta) btnLang.innerText = `${meta.flag} ${meta.label}`;

        // Vragenlijst opnieuw opbouwen in de nieuwe taal.
        if (this.onChange) this.onChange();
    },

    applyTranslations(): void {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const value = this.t(key);
            if (value === key) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                (el as HTMLInputElement).placeholder = value;
            } else {
                el.textContent = value;
            }
        });
    },

    /** Vertaling of de key zelf als er geen vertaling bestaat. */
    t(key: string): string {
        const entry = TABLE[key];
        if (!entry) return key;
        return entry[LANG_INDEX[this.currentLang]] || entry[0];
    },
};
