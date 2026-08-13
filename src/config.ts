/* src/config.ts */

// Versie gecentraliseerd uit vite.config.ts / package.json
// @ts-ignore
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '11.0.0';

/* --- Serie-benaming --------------------------------------------------------
 *
 * Van versie 0.0.0 tot en met 10.2.1 heette de reeks "Sentinel Safe".
 * Vanaf 11.0.0 loopt de Horizon-serie. Elke major-versie is een eigen periode
 * met een eigen codenaam; de minor- en patch-releases binnen die periode
 * houden dezelfde naam. v11.3.2 is dus ook nog "Horizon Dawn".
 *
 * Dit is de ENIGE plek waar de namen staan. scripts/sync-version.js leest deze
 * tabel uit tijdens de prebuild en zet de naam door naar manifest.json, sw.js
 * en de HTML-pagina's. Nieuwe periode toevoegen? Alleen hier een regel bij.
 */
export const APP_SERIES = 'Horizon';

export const RELEASE_NAMES: Record<number, string> = {
    11: 'Dawn',      // eerste licht: start van de Horizon-serie
    12: 'Compass',   // richting geven, navigatie
    13: 'Beacon',    // baken: signaleren en waarschuwen
    14: 'Meridian',  // vast ijkpunt, standaardisatie
    15: 'Summit',    // overzicht vanaf hoogte, rapportage
    16: 'Polaris',   // vast referentiepunt, betrouwbaarheid
    17: 'Aurora',    // zichtbaarheid, visuele laag
    18: 'Zenith',    // hoogste stand, performance
    19: 'Vanguard',  // voorhoede, nieuwe technieken
    20: 'Infinity',  // horizon zonder einde: afsluiting van de serie
};

/** Naam van de reeks vóór Horizon. Alleen voor historische weergave. */
export const LEGACY_SERIES = 'Sentinel Safe';

function majorOf(version: string): number {
    const parsed = Number.parseInt(String(version).split('.')[0], 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Codenaam van de huidige periode, bijvoorbeeld "Horizon Dawn".
 * Staat er nog geen naam in de tabel (major > 20), dan valt hij terug op de
 * serienaam zelf. Zo staat er nooit "undefined" in de UI of in een PDF.
 */
export const APP_RELEASE_NAME: string = (() => {
    const major = majorOf(APP_VERSION);
    const name = RELEASE_NAMES[major];
    if (name) return APP_SERIES + ' ' + name;
    return major >= 11 ? APP_SERIES : LEGACY_SERIES;
})();

/** Kort label voor koppen en footers: v11.0.0 Horizon Dawn */
export const APP_LABEL: string = 'v' + APP_VERSION + ' ' + APP_RELEASE_NAME;

/** Volledig label met aanhalingstekens: LMRA Pro v11.0.0 "Horizon Dawn" */
export const APP_FULL_LABEL: string = 'LMRA Pro v' + APP_VERSION + ' "' + APP_RELEASE_NAME + '"';

export const ACTIVE_SESSION_KEY: string = 'lmra_active_session';
export const HISTORY_KEY: string = 'lmra_history';
export const SETTINGS_KEY: string = 'lmra_settings';
