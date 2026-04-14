/* src/config.ts */

// Helper om environment variables veilig op te halen met fallback voor debugging
const getEnv = (key: string): string => {
    const value = import.meta.env[key];
    if (!value) {
        console.warn(`⚠️ Omgevingsvariabele ${key} ontbreekt!`);
        return "";
    }
    return value;
};

export const SUPABASE_URL: string = getEnv('VITE_SUPABASE_URL'); 
export const SUPABASE_ANON_KEY: string = getEnv('VITE_SUPABASE_ANON_KEY'); 

// DIT IS NIEUW: Versie komt nu automatisch uit de build pipeline via vite.config.ts
// @ts-ignore
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '9.8.10';

export const SYNC_QUEUE_KEY: string = 'lmra_sync_queue';
export const ACTIVE_SESSION_KEY: string = 'lmra_active_session'; 
export const HISTORY_KEY: string = 'lmra_history';
export const SECURITY_CHECK_KEY: string = 'lmra_sec_check';