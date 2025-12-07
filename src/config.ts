/* src/config.ts */
export const SUPABASE_URL: string = 'https://zgbxlucbhyyrfwxqdntg.supabase.co'; 
export const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnYnhsdWNiaHl5cmZ3eHFkbnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzM0NzcsImV4cCI6MjA4MDYwOTQ3N30.fF5S84dxbwLnzC8NIrx8v_CYSRjp_zcHYKC4tb8HPnE'; 

// DIT IS NIEUW: Versie komt nu automatisch uit de build pipeline via vite.config.ts
export const APP_VERSION: string = __APP_VERSION__;

export const SYNC_QUEUE_KEY: string = 'lmra_sync_queue';
export const ACTIVE_SESSION_KEY: string = 'lmra_active_session'; 
export const HISTORY_KEY: string = 'lmra_history';
export const SECURITY_CHECK_KEY: string = 'lmra_sec_check';