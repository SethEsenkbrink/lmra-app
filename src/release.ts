// src/release.ts
//
// Release notes die in het update-scherm van de app worden getoond.
// Versienummer en codenaam komen uit config.ts, dus die hoeven hier niet hard
// in de tekst.

export interface ReleaseFeature {
    icon: string;
    iconColor: string;
    bgColor: string;
    title: string;
    description: string;
}

export const RELEASE_INFO = {
    title: 'Nieuwe functies & verbeteringen',
    features: [
        {
            icon: 'fa-shield-halved',
            iconColor: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-100 dark:bg-amber-950/50',
            title: 'STOP & GO Herbeoordelen',
            description: 'Gevaar opgelost? Vul je maatregel in en geef alsnog een veilige GO ter plaatse.',
        },
        {
            icon: 'fa-helmet-safety',
            iconColor: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-950/50',
            title: 'PBM-Knoppen met 1 Tik',
            description: 'Klik snel aan welke PBM’s (helm, bril, harnas, schoenen) gedragen worden.',
        },
        {
            icon: 'fa-cloud-bolt',
            iconColor: 'text-red-600 dark:text-red-400',
            bgColor: 'bg-red-100 dark:bg-red-950/50',
            title: 'Weer-Alerts per Taak',
            description: 'Duidelijke waarschuwing bij harde wind (> 40 km/h) of hitte (> 28°C) bij jouw klus.',
        },
        {
            icon: 'fa-clone',
            iconColor: 'text-indigo-600 dark:text-indigo-400',
            bgColor: 'bg-indigo-100 dark:bg-indigo-950/50',
            title: 'Vorige LMRA Klonen',
            description: 'Klant en locatie overnemen van je vorige klus. Vragen blijven vers om opnieuw te keuren.',
        },
        {
            icon: 'fa-share-nodes',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
            title: 'Direct Delen (WhatsApp & Mail)',
            description: 'Stuur het voltooide PDF-rapport direct vanaf je telefoon door naar je uitvoerder.',
        },
        {
            icon: 'fa-bolt',
            iconColor: 'text-yellow-600 dark:text-yellow-400',
            bgColor: 'bg-yellow-100 dark:bg-yellow-950/50',
            title: 'Snellere Engine in 4 Talen',
            description: 'Razendsnel en offline in het Nederlands, Engels, Duits en Pools (NL, EN, DE, PL).',
        },
    ] as ReleaseFeature[],
    forceShow: false,
};
