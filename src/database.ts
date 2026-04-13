/* src/database.ts */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SYNC_QUEUE_KEY } from './config';
import { SecureStorage } from './security';
import { z } from 'zod';

// Zod Schema voor validatie
const LMRAReportSchema = z.object({
    report_id: z.string().uuid(),
    monteur_naam: z.string().min(1, "Naam is verplicht"),
    locatie: z.string().min(1, "Locatie is verplicht"),
    werkorder: z.string(),
    is_veilig: z.boolean(),
    opmerkingen: z.string(),
    afkeurpunten: z.string(), // Moet een valide JSON string zijn, maar z.string() is voor nu ok
    created_at: z.string().datetime(),
    valid_until: z.string().datetime()
});

// Infer het type direct vanuit Zod
export type LMRAReport = z.infer<typeof LMRAReportSchema>;

// Return types voor database acties
interface SubmitResult {
    success: boolean;
    status: 'cloud' | 'cloud_duplicate' | 'queued' | 'error' | 'validation_error';
    reason?: string;
    error?: any;
}

interface QueueResult {
    processed: number;
    left: number;
}

// Veilige initialisatie van Supabase
// AANGEPAST: We exporteren de client nu voor gebruik in Auth services
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const Database = {
    
    // Hoofdfunctie om een rapport op te slaan
    async submitReport(reportData: LMRAReport): Promise<SubmitResult> {
        // Stap 0: Validatie met Zod
        const validation = LMRAReportSchema.safeParse(reportData);
        if (!validation.success) {
            console.error("❌ Data validatie mislukt:", validation.error.format());
            return { success: false, status: 'validation_error', error: validation.error };
        }

        // Gebruik gevalideerde data
        const validatedData = validation.data;

        // Stap 1: Is er internet?
        if (!navigator.onLine) {
            console.warn("Geen internet. Opslaan in offline wachtrij.");
            return await this.queueReport(validatedData, "Offline");
        }

        try {
            // Stap 2: Probeer direct naar Cloud
            const { error } = await supabase
                .from('lmra_reports')
                .insert([validatedData]);

            if (error) {
                // Duplicate key error negeren we (is eigenlijk succes)
                if (error.code === '23505') {
                    return { success: true, status: 'cloud_duplicate' };
                }
                
                // Gedetailleerde logging voor debugging
                console.error("Supabase Upload Fout Details:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                
                throw error; // Gooi error op zodat we in de catch komen
            }

            return { success: true, status: 'cloud' };

        } catch (error) {
            // Stap 3: Bij cloud-fout, alsnog lokaal opslaan
            return await this.queueReport(validatedData, "Error-Fallback");
        }
    },

    // Interne functie voor offline opslag
    async queueReport(reportData: LMRAReport, reason: string): Promise<SubmitResult> {
        try {
            let queue = (await SecureStorage.get(SYNC_QUEUE_KEY)) as LMRAReport[] || [];
            if (!Array.isArray(queue)) queue = [];
            
            queue.push(reportData);
            await SecureStorage.set(SYNC_QUEUE_KEY, queue);
            
            return { success: true, status: 'queued', reason };
        } catch (e) {
            console.error("CRITICAL: Kan niet opslaan in wachtrij!", e);
            return { success: false, status: 'error', error: e };
        }
    },

    // Functie om de wachtrij te verwerken (Sync)
    // Functie om de wachtrij te verwerken (Sync) - VERBETERDE VERSIE
    async processSyncQueue(): Promise<QueueResult> {
        if (!navigator.onLine) return { processed: 0, left: 0 };

        const queue = (await SecureStorage.get(SYNC_QUEUE_KEY)) as LMRAReport[];
        if (!queue || queue.length === 0) return { processed: 0, left: 0 };

        console.log(`🔄 Sync start: ${queue.length} items in wachtrij...`);

        const remainingQueue: LMRAReport[] = [];
        let successCount = 0;

        for (const report of queue) {
            try {
                const { error } = await supabase
                    .from('lmra_reports')
                    .insert([report]);

                if (!error) {
                    successCount++;
                } else if (error.code === '23505') {
                    // Duplicate key error = Al opgeslagen = Succes voor ons
                    console.log("ℹ️ Rapport bestond al (duplicate), verwijderd uit queue.");
                    successCount++;
                } else {
                    // Echte fout (bv. database validatie of RLS policy)
                    console.error("❌ Sync error voor rapport:", error.message, error.details);
                    
                    // We laten hem in de queue staan, maar loggen wel hard zodat je het ziet
                    remainingQueue.push(report); 
                }
            } catch (e) {
                console.error("❌ Onverwachte netwerkfout tijdens sync:", e);
                remainingQueue.push(report);
            }
        }

        // Update de wachtrij met wat overbleef
        await SecureStorage.set(SYNC_QUEUE_KEY, remainingQueue);
        
        if (remainingQueue.length === 0 && successCount > 0) {
            console.log("✅ Sync volledig voltooid!");
        }

        return { processed: successCount, left: remainingQueue.length };
    }
};