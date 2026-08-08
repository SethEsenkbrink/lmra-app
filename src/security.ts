/* src/security.ts - Clean Local Storage Wrapper */
import { get, set, del, clear } from 'idb-keyval';

export const SecureStorage = {
    async set(key: string, value: any): Promise<void> { 
        try { 
            await set(key, value); 
        } catch (e) { 
            console.error(`Opslag fout voor ${key}:`, e); 
            throw e;
        } 
    },
    
    async get(key: string): Promise<any | null> { 
        try {
            const item = await get(key); 
            return item ?? null; 
        } catch (e) {
            console.error(`Ophaal fout voor ${key}:`, e);
            return null;
        }
    },
    
    async remove(key: string): Promise<void> { 
        await del(key); 
    },

    async wipeEverything(): Promise<void> {
        await clear();
        localStorage.clear();
    }
};