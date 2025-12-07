/* src/database.js */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SYNC_QUEUE_KEY } from './config.js';
import { SecureStorage } from './security.js';

// Veilige initialisatie van Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const Database = {
    
    // Hoofdfunctie om een rapport op te slaan
    async submitReport(reportData) {
        // Stap 1: Is er internet?
        if (!navigator.onLine) {
            console.warn("Geen internet. Opslaan in offline wachtrij.");
            return await this.queueReport(reportData, "Offline");
        }

        try {
            // Stap 2: Probeer direct naar Cloud
            const { error } = await supabase
                .from('lmra_reports')
                .insert([reportData]);

            if (error) {
                // Duplicate key error negeren we (is eigenlijk succes)
                if (error.code === '23505') {
                    return { success: true, status: 'cloud_duplicate' };
                }
                throw error; // Andere errors gooien we op, zodat we in catch komen
            }

            return { success: true, status: 'cloud' };

        } catch (error) {
            console.error("Supabase Error:", error);
            // Stap 3: Bij cloud-fout, alsnog lokaal opslaan
            return await this.queueReport(reportData, "Error-Fallback");
        }
    },

    // Interne functie voor offline opslag
    async queueReport(reportData, reason) {
        try {
            let queue = await SecureStorage.get(SYNC_QUEUE_KEY) || [];
            if (!Array.isArray(queue)) queue = [];
            
            queue.push(reportData);
            await SecureStorage.set(SYNC_QUEUE_KEY, queue);
            
            return { success: true, status: 'queued', reason };
        } catch (e) {
            console.error("CRITICAL: Kan niet opslaan in wachtrij!", e);
            return { success: false, error: e };
        }
    },

    // Functie om de wachtrij te verwerken (Sync)
    async processSyncQueue() {
        if (!navigator.onLine) return { processed: 0, left: 0 };

        const queue = await SecureStorage.get(SYNC_QUEUE_KEY);
        if (!queue || queue.length === 0) return { processed: 0, left: 0 };

        const remainingQueue = [];
        let successCount = 0;

        for (const report of queue) {
            try {
                const { error } = await supabase
                    .from('lmra_reports')
                    .insert([report]);

                if (!error || error.code === '23505') {
                    successCount++;
                } else {
                    remainingQueue.push(report); // Bij harde fout, bewaar voor later
                }
            } catch (e) {
                remainingQueue.push(report);
            }
        }

        // Update de wachtrij met wat overbleef
        await SecureStorage.set(SYNC_QUEUE_KEY, remainingQueue);
        return { processed: successCount, left: remainingQueue.length };
    }
};