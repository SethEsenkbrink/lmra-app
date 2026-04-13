/* src/config.ts */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL; 
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY; 

// DIT IS NIEUW: Versie komt nu automatisch uit de build pipeline via vite.config.ts
export const APP_VERSION: string = __APP_VERSION__;

export const SYNC_QUEUE_KEY: string = 'lmra_sync_queue';
export const ACTIVE_SESSION_KEY: string = 'lmra_active_session'; 
export const HISTORY_KEY: string = 'lmra_history';
export const SECURITY_CHECK_KEY: string = 'lmra_sec_check';