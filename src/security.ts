/* src/security.ts */
import { get, set, del, clear } from 'idb-keyval';

interface CryptoKeyResult {
    key: CryptoKey;
    salt: string;
}

export const CryptoManager = {
    key: null as CryptoKey | null,
    
    async deriveKey(pin: string, salt: string | null): Promise<CryptoKeyResult> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", 
            enc.encode(pin), 
            { name: "PBKDF2" }, 
            false, 
            ["deriveKey"]
        );
        
        // Als er geen salt is, maak een nieuwe (eerste keer instellen)
        const saltBuffer = salt 
            ? Uint8Array.from(atob(salt), c => c.charCodeAt(0)) 
            : window.crypto.getRandomValues(new Uint8Array(16));
        
        const key = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: saltBuffer, iterations: 600000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
        
        return { key, salt: btoa(String.fromCharCode(...saltBuffer)) };
    },

    async encrypt(data: any): Promise<string> {
        if (!this.key) throw new Error("App is vergrendeld - Geen sleutel beschikbaar");
        
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, 
            this.key, 
            enc.encode(JSON.stringify(data))
        );
        
        const ivStr = btoa(String.fromCharCode(...iv));
        const dataStr = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        
        return `${ivStr}:${dataStr}`;
    },

    async decrypt(encryptedStr: string): Promise<any | null> {
        if (!this.key) throw new Error("App is vergrendeld");
        try {
            const parts = encryptedStr.split(':');
            if (parts.length !== 2) return null;
            
            const [ivStr, dataStr] = parts;
            if (!ivStr || !dataStr) return null;

            const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
            const data = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));
            
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv }, 
                this.key, 
                data
            );
            
            const dec = new TextDecoder();
            return JSON.parse(dec.decode(decrypted));
        } catch (e) { 
            console.error("Decryptie faalde (verkeerde sleutel of corrupte data)", e); 
            return null; 
        }
    }
};

/* Wrapper voor IndexedDB die automatisch versleutelt */
export const SecureStorage = {
    async set(key: string, value: any): Promise<void> { 
        try { 
            const encrypted = await CryptoManager.encrypt(value); 
            await set(key, encrypted); 
        } catch (e) { 
            console.error(`Opslag fout voor ${key}:`, e); 
            throw e;
        } 
    },
    
    async get(key: string): Promise<any | null> { 
        try {
            const item = await get(key); 
            if (!item) return null; 
            return await CryptoManager.decrypt(item); 
        } catch (e) {
            console.error(`Ophaal fout voor ${key}:`, e);
            return null;
        }
    },
    
    async remove(key: string): Promise<void> { 
        await del(key); 
    },

    // Self-destruct functie
    async wipeEverything(): Promise<void> {
        console.warn("SECURITY WIPE INITIATED");
        await clear();
        localStorage.clear(); // Voor de zekerheid ook oude storage legen
    }
};