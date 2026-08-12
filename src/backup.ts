/* src/backup.ts - Back-up en herstel van de lokale historie
 *
 * Omdat alles uitsluitend op het toestel staat, is browserdata wissen of een
 * nieuwe telefoon gelijk aan alles kwijt. Met een back-upbestand (JSON) houdt de
 * gebruiker zijn rapporten in eigen hand, zonder dat er iets naar een server gaat.
 */

import { get, set } from 'idb-keyval';
import { Database, LMRAReport } from './database';
import { UI } from './ui';
import { Diagnostics } from './diagnostics';
import { Settings } from './settings';
import { APP_VERSION } from './config';
import { SETTINGS_KEY } from './config';

const PROFILE_KEY = 'lmra_profile';

interface BackupFile {
    app: string;
    app_version: string;
    format: number;
    exported_at: string;
    history: LMRAReport[];
    settings?: unknown;
    profile?: unknown;
}

function stamp(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const Backup = {
    /** Zet alle rapporten, instellingen en het profiel in één JSON-bestand. */
    async exportAll(): Promise<void> {
        try {
            const history = await Database.getHistory();
            let profile: unknown = null;
            let settings: unknown = null;
            try {
                profile = (await get(PROFILE_KEY)) ?? null;
                settings = localStorage.getItem(SETTINGS_KEY);
            } catch {
                /* niet kritiek */
            }

            const payload: BackupFile = {
                app: 'LMRA Pro',
                app_version: APP_VERSION,
                format: 1,
                exported_at: new Date().toISOString(),
                history,
                settings,
                profile,
            };

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lmra-backup-${stamp()}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);

            UI.showToast(`✅ Back-up gemaakt van ${history.length} rapport(en)`);
            Diagnostics.log('info', 'backup', `Export: ${history.length} rapporten`);
        } catch (err) {
            Diagnostics.log('error', 'backup', `Export mislukt: ${String(err)}`);
            UI.showToast('❌ Back-up maken mislukt. Zie Diagnose & Logs.');
        }
    },

    /** Opent de bestandskiezer voor een eerder gemaakte back-up. */
    openImportDialog(): void {
        const input = document.getElementById('backupFileInput') as HTMLInputElement | null;
        if (!input) {
            UI.showToast('❌ Importveld niet gevonden.');
            return;
        }
        input.value = '';
        input.click();
    },

    async importFromFile(file: File): Promise<void> {
        try {
            const text = await file.text();
            const data = JSON.parse(text) as BackupFile;

            if (!data || data.app !== 'LMRA Pro' || !Array.isArray(data.history)) {
                UI.showToast('❌ Dit is geen geldig LMRA-back-upbestand.');
                Diagnostics.log('warn', 'backup', 'Import geweigerd: onbekend formaat');
                return;
            }

            const current = await Database.getHistory();
            const importCount = data.history.length;
            const question =
                current.length > 0
                    ? `Je hebt nu ${current.length} rapport(en) op dit toestel.\n\n` +
                      `De back-up bevat ${importCount} rapport(en) van ${new Date(data.exported_at).toLocaleDateString('nl-NL')}.\n\n` +
                      'OK = samenvoegen (dubbele rapporten worden overgeslagen)\n' +
                      'Annuleren = niets doen'
                    : `Back-up van ${new Date(data.exported_at).toLocaleDateString('nl-NL')} met ${importCount} rapport(en) terugzetten?`;

            if (!confirm(question)) {
                UI.showToast('Import geannuleerd.');
                return;
            }

            // Samenvoegen op report_id, nieuwste eerst.
            const byId = new Map<string, LMRAReport>();
            for (const report of [...current, ...data.history]) {
                if (report && typeof report.report_id === 'string') byId.set(report.report_id, report);
            }
            const merged = Array.from(byId.values()).sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            await Database.updateHistory(merged.slice(0, 200));

            if (typeof data.settings === 'string') {
                try {
                    localStorage.setItem(SETTINGS_KEY, data.settings);
                    Settings.load();
                    Settings.apply();
                } catch {
                    /* niet kritiek */
                }
            }
            if (data.profile) {
                try {
                    await set(PROFILE_KEY, data.profile);
                } catch {
                    /* niet kritiek */
                }
            }

            const added = merged.length - current.length;
            UI.showToast(`✅ ${added} nieuw(e) rapport(en) teruggezet (${merged.length} totaal)`);
            Diagnostics.log('info', 'backup', `Import: ${importCount} in bestand, ${added} nieuw, ${merged.length} totaal`);
        } catch (err) {
            Diagnostics.log('error', 'backup', `Import mislukt: ${String(err)}`);
            UI.showToast('❌ Back-up terugzetten mislukt. Is het bestand compleet?');
        }
    },
};
