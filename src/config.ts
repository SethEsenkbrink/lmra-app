/* src/config.ts */

// Versie gecentraliseerd uit vite.config.ts / package.json
// @ts-ignore
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '9.8.10';

export const ACTIVE_SESSION_KEY: string = 'lmra_active_session'; 
export const HISTORY_KEY: string = 'lmra_history';
export const SETTINGS_KEY: string = 'lmra_settings';