/* src/database.ts - Clean Local Database Service */
import { get, set, del } from 'idb-keyval';
import { HISTORY_KEY } from './config';
import { z } from 'zod';

// Zod Schema voor validatie van een LMRA Rapport
export const LMRAReportSchema = z.object({
    report_id: z.string().uuid(),
    monteur_naam: z.string().min(1, "Naam van de monteur is verplicht"),
    bedrijf_naam: z.string().optional().default(""), // Bedrijfsnaam / Opdrachtgever
    locatie: z.string().min(1, "Locatie / Asset is verplicht"),
    werkorder: z.string(),
    /** Gekozen taak-template (algemeen, hoogte, besloten, heet, elektro, hijsen). */
    template: z.string().optional().default('algemeen'),
    template_label: z.string().optional().default('Algemeen'),
    is_veilig: z.boolean(),
    opmerkingen: z.string(),
    afkeurpunten: z.string(), // JSON string van afgekeurde vragen + acties
    handtekening: z.string().nullable().optional(),
    foto_bewijs: z.array(z.string()).optional(),
    weer_info: z.any().optional(),
    created_at: z.string().datetime(),
    valid_until: z.string().datetime()
});

export type LMRAReport = z.infer<typeof LMRAReportSchema>;

interface SaveResult {
    success: boolean;
    reason?: string;
    error?: any;
}

export const Database = {
    // Bewaar een LMRA rapport lokaal in IndexedDB
    async submitReport(reportData: LMRAReport): Promise<SaveResult> {
        const validation = LMRAReportSchema.safeParse(reportData);
        if (!validation.success) {
            console.error("❌ Data validatie mislukt:", validation.error.format());
            return { success: false, reason: 'validation_error', error: validation.error };
        }

        const validatedData = validation.data;

        try {
            let history = (await get(HISTORY_KEY)) as LMRAReport[] || [];
            if (!Array.isArray(history)) history = [];

            // Voeg nieuwste toe aan het begin van de historie
            history.unshift(validatedData);

            // Beperk historie tot maximaal 100 rapporten om geheugen schoon te houden
            if (history.length > 100) {
                history = history.slice(0, 100);
            }

            await set(HISTORY_KEY, history);
            return { success: true, reason: 'saved_locally' };
        } catch (error) {
            console.error("❌ Fout bij opslaan rapport in IndexedDB:", error);
            return { success: false, reason: 'storage_error', error };
        }
    },

    // Haal alle lokaal opgeslagen rapporten op
    async getHistory(): Promise<LMRAReport[]> {
        try {
            const history = (await get(HISTORY_KEY)) as LMRAReport[];
            return Array.isArray(history) ? history : [];
        } catch (error) {
            console.error("❌ Fout bij ophalen historie:", error);
            return [];
        }
    },

    // Update historie (bijv. bij beëindigen van een sessie)
    async updateHistory(history: LMRAReport[]): Promise<void> {
        try {
            await set(HISTORY_KEY, history);
        } catch (error) {
            console.error("❌ Fout bij bijwerken historie:", error);
        }
    },

    // Wis alle lokale historie
    async clearHistory(): Promise<void> {
        try {
            await del(HISTORY_KEY);
        } catch (error) {
            console.error("❌ Fout bij wissen historie:", error);
        }
    }
};