/* src/data.ts - Vragenlijsten en taak-templates
 *
 * De basisvragen gelden voor elke klus. Daarnaast kies je een taak-template
 * (werken op hoogte, besloten ruimte, heet werk, elektro, hijsen) die extra
 * vragen toevoegt die specifiek bij dat werk horen.
 *
 * Elke vraag en categorie heeft een i18n-key. De Nederlandse tekst in dit
 * bestand is de bron voor het PDF-rapport; de weergave in de app gaat via
 * I18n.t(key), zodat een Duitse of Poolse monteur de vragen in zijn eigen taal
 * ziet terwijl het rapport voor de werkgever Nederlands blijft.
 */

export type QuestionType = 'positive' | 'negative';

export interface Question {
    id: number;
    key: string;
    text: string;
    type: QuestionType;
}

export interface Category {
    key: string;
    title: string;
    icon: string;
    questions: Question[];
}

/** Koppelt weersomstandigheden aan de vragen waar ze echt over gaan. */
export interface WeatherWatch {
    windAboveKmh?: number;
    tempAboveC?: number;
    tempBelowC?: number;
    questionIds: number[];
    message: string;
}

export interface TaskTemplate {
    id: string;
    key: string;
    label: string;
    icon: string;
    /** Korte uitleg, ook gebruikt op de landingspagina van deze template. */
    description: string;
    extra: Category[];
    weatherWatch?: WeatherWatch[];
}

/* ---------------------------------------------------------------- basisvragen */

export const categories: Category[] = [
    {
        key: 'cat_alg',
        title: 'Algemeen & Fitheid',
        icon: 'fa-user-clock',
        questions: [
            { id: 1, key: 'q_1', text: 'Voel ik mij fysiek en mentaal fit voor deze klus?', type: 'positive' },
            { id: 2, key: 'q_2', text: 'Weet ik wat te doen bij nood (alarmnummer, vluchtroute)?', type: 'positive' },
        ],
    },
    {
        key: 'cat_verg',
        title: 'Vergunningen & Procedures',
        icon: 'fa-file-signature',
        questions: [
            { id: 3, key: 'q_3', text: 'Is de werkvergunning correct ingevuld en getekend?', type: 'positive' },
            { id: 4, key: 'q_4', text: 'Heb ik de taakrisicoanalyse (TRA) gelezen/begrepen?', type: 'positive' },
        ],
    },
    {
        key: 'cat_omg',
        title: 'Omgeving & Techniek',
        icon: 'fa-bolt',
        questions: [
            { id: 5, key: 'q_5', text: 'Is de installatie veiliggesteld (LOTOTO / Vrij van spanning)?', type: 'positive' },
            { id: 6, key: 'q_6', text: "Heb ik de juiste PBM's en gekeurd gereedschap?", type: 'positive' },
            { id: 7, key: 'q_7', text: 'Is de werkplek afgezet en vrij van struikelgevaar?', type: 'positive' },
        ],
    },
];

/* ------------------------------------------------------------------ templates */

export const TASK_TEMPLATES: TaskTemplate[] = [
    {
        id: 'algemeen',
        key: 'tpl_algemeen',
        label: 'Algemeen',
        icon: 'fa-clipboard-check',
        description:
            'De standaard LMRA met de zeven basisvragen over fitheid, vergunningen, omgeving en gereedschap. ' +
            "Geschikt voor onderhoud, storingsdienst en montagewerk zonder bijzondere risico's.",
        extra: [],
    },
    {
        id: 'hoogte',
        key: 'tpl_hoogte',
        label: 'Werken op hoogte',
        icon: 'fa-person-falling-burst',
        description:
            'Vallen van hoogte is nog altijd de meest voorkomende oorzaak van dodelijke arbeidsongevallen. ' +
            'Deze LMRA controleert valbeveiliging, de stabiliteit van ladder, steiger of hoogwerker en de zone ' +
            'onder het werk. Windkracht wordt automatisch meegewogen.',
        extra: [
            {
                key: 'cat_hoogte',
                title: 'Werken op hoogte',
                icon: 'fa-person-falling-burst',
                questions: [
                    { id: 101, key: 'q_101', text: 'Is de valbeveiliging aanwezig, gekeurd en aangebracht (harnas, ankerpunt, leuning)?', type: 'positive' },
                    { id: 102, key: 'q_102', text: 'Staan ladder, steiger of hoogwerker stabiel op een vlakke en draagkrachtige ondergrond?', type: 'positive' },
                    { id: 103, key: 'q_103', text: 'Is de zone onder het werk afgezet tegen vallende voorwerpen?', type: 'positive' },
                ],
            },
        ],
        weatherWatch: [
            {
                windAboveKmh: 40,
                questionIds: [102, 103],
                message: 'Windkracht 6 of hoger: hoogwerkers en steigers niet gebruiken. Controleer de grens van de fabrikant.',
            },
        ],
    },
    {
        id: 'besloten',
        key: 'tpl_besloten',
        label: 'Besloten ruimte',
        icon: 'fa-box-archive',
        description:
            'Werken in een tank, put, silo of kruipruimte is levensgevaarlijk zonder metingen en toezicht. ' +
            'Deze LMRA controleert vrijgave en gasmeting, de mangatwacht buiten en de reddingsvoorziening.',
        extra: [
            {
                key: 'cat_besloten',
                title: 'Besloten ruimte',
                icon: 'fa-box-archive',
                questions: [
                    { id: 201, key: 'q_201', text: 'Is de ruimte vrijgegeven, gemeten (O2, LEL, H2S) en wordt er geventileerd?', type: 'positive' },
                    { id: 202, key: 'q_202', text: 'Staat er een mangatwacht buiten met een werkend communicatiemiddel?', type: 'positive' },
                    { id: 203, key: 'q_203', text: 'Is de toegang veiliggesteld en zijn redding en hulpverlening geregeld?', type: 'positive' },
                ],
            },
        ],
        weatherWatch: [
            {
                tempAboveC: 27,
                questionIds: [201],
                message: 'Warm weer: in een besloten ruimte loopt de temperatuur snel op. Beperk de werkduur en ventileer extra.',
            },
        ],
    },
    {
        id: 'heet',
        key: 'tpl_heet',
        label: 'Heet werk',
        icon: 'fa-fire',
        description:
            'Snijden, slijpen, solderen en lassen veroorzaken vonken die uren later nog brand kunnen geven. ' +
            'Deze LMRA controleert de heet-werkvergunning, blusmiddelen en brandwacht en het afdekken van openingen.',
        extra: [
            {
                key: 'cat_heet',
                title: 'Heet werk',
                icon: 'fa-fire',
                questions: [
                    { id: 301, key: 'q_301', text: 'Is er een geldige heet-werkvergunning en is de omgeving vrij van brandbaar materiaal?', type: 'positive' },
                    { id: 302, key: 'q_302', text: 'Staat blusmiddel binnen handbereik en is er een brandwacht aanwezig?', type: 'positive' },
                    { id: 303, key: 'q_303', text: 'Zijn openingen, riolen en leidingen afgedekt tegen vonken en is nazorg geregeld?', type: 'positive' },
                ],
            },
        ],
        weatherWatch: [
            {
                windAboveKmh: 30,
                questionIds: [303],
                message: 'Wind verspreidt vonken verder dan je denkt. Vergroot de afzetting of stel het werk uit.',
            },
        ],
    },
    {
        id: 'elektro',
        key: 'tpl_elektro',
        label: 'Elektrotechniek',
        icon: 'fa-bolt-lightning',
        description:
            'Werken aan elektrische installaties valt onder NEN 3140 en de VIAG/BEI. Deze LMRA controleert ' +
            'spanningsloos maken en meten, geschikt gereedschap en PBM, en de melding aan de ' +
            'installatieverantwoordelijke.',
        extra: [
            {
                key: 'cat_elektro',
                title: 'Elektrotechniek',
                icon: 'fa-bolt-lightning',
                questions: [
                    { id: 401, key: 'q_401', text: 'Is de installatie spanningsloos gemaakt, vergrendeld en met een meting gecontroleerd?', type: 'positive' },
                    { id: 402, key: 'q_402', text: "Gebruik ik gereedschap en PBM's die geschikt zijn voor deze spanning (NEN 3140)?", type: 'positive' },
                    { id: 403, key: 'q_403', text: 'Weet ik wie de installatieverantwoordelijke is en is de schakelhandeling gemeld?', type: 'positive' },
                ],
            },
        ],
    },
    {
        id: 'hijsen',
        key: 'tpl_hijsen',
        label: 'Hijsen & takelen',
        icon: 'fa-arrows-up-to-line',
        description:
            'Bij hijsen gaat het mis door een te zware last, een niet gekeurd hijsmiddel of iemand die onder de ' +
            'last loopt. Deze LMRA controleert keuring en lasttabel, de afzetting van de hijszone en de ' +
            'afspraken met de kraanmachinist.',
        extra: [
            {
                key: 'cat_hijsen',
                title: 'Hijsen & takelen',
                icon: 'fa-arrows-up-to-line',
                questions: [
                    { id: 501, key: 'q_501', text: 'Zijn de hijsmiddelen gekeurd en valt het gewicht binnen de lasttabel?', type: 'positive' },
                    { id: 502, key: 'q_502', text: 'Is de hijszone afgezet en blijft niemand onder of naast de last staan?', type: 'positive' },
                    { id: 503, key: 'q_503', text: 'Zijn windkracht, zicht en handsignalen afgesproken met de kraanmachinist?', type: 'positive' },
                ],
            },
        ],
        weatherWatch: [
            {
                windAboveKmh: 40,
                questionIds: [503],
                message: 'Boven windkracht 6 mag er in de regel niet gehesen worden. Overleg met de kraanmachinist.',
            },
        ],
    },
];

export const DEFAULT_TEMPLATE_ID = 'algemeen';

export function getTemplate(id: string | null | undefined): TaskTemplate {
    return TASK_TEMPLATES.find((t) => t.id === id) ?? TASK_TEMPLATES[0];
}

/** Basisvragen plus de extra vragen van de gekozen template. */
export function getCategoriesFor(templateId: string | null | undefined): Category[] {
    const template = getTemplate(templateId);
    return [...categories, ...template.extra];
}
