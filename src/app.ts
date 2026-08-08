/* src/app.ts - LMRA Pro Open PWA Engine */
import { UI } from './ui';
import { Database, LMRAReport } from './database';
import { APP_VERSION } from './config';
import DOMPurify from 'dompurify';

import { PDFService } from './services/pdf';
import { SessionService } from './services/session';
import { FormService } from './services/form';
import { RELEASE_INFO } from './release';

interface AppState {
    viewingReport: LMRAReport | null;
}

const state: AppState = {
    viewingReport: null
};

export const App = {
    async init(): Promise<void> {
        console.log(`LMRA Pro v${APP_VERSION} Open PWA Init...`);
        this.attachEventListeners();
        this.checkChangelog();
        this.updateConnectionStatus();

        // Formulier direct starten & vragen renderen (Geen inlog-drempel!)
        FormService.init('questions-container'); 
        SessionService.checkResumeState(() => this.resetForm(false));

        window.addEventListener('online', () => {
            this.updateConnectionStatus();
            UI.showToast("Verbinding hersteld.");
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus();
            UI.showToast("⚠️ Geen internetverbinding. Werkt offline.");
        });
    },

    updateConnectionStatus(): void {
        const el = document.getElementById('cloudStatus');
        if (!el) return;

        if (!navigator.onLine) {
            el.className = "text-[10px] font-bold px-2.5 py-1 bg-amber-500 text-white rounded-full flex items-center gap-1 shadow-sm";
            el.innerHTML = '<i class="fa-solid fa-wifi"></i> Offline Modus';
        } else {
            el.className = "text-[10px] font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-full flex items-center gap-1 shadow-sm";
            el.innerHTML = '<i class="fa-solid fa-bolt"></i> PWA Actief';
        }
    },

    attachEventListeners(): void {
        document.getElementById('submitBtn')?.addEventListener('click', () => this.handleSubmit());
        
        // Menu & Modals
        document.getElementById('btnOpenMenu')?.addEventListener('click', () => UI.toggleElement('menuModal', true));
        document.getElementById('btnCloseMenu')?.addEventListener('click', () => UI.toggleElement('menuModal', false));
        document.getElementById('btnShowUpdates')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            this.forceShowChangelog();
        });

        document.getElementById('btnResetApp')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            this.resetForm(true);
        });
        
        document.getElementById('btnToggleTheme')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            this.toggleTheme();
        });
        
        document.getElementById('btnBackToInfo')?.addEventListener('click', () => {
            window.location.href = '/?info=true';
        });
        
        document.getElementById('btnOpenArchive')?.addEventListener('click', () => this.openArchive());
        document.getElementById('btnCloseArchive')?.addEventListener('click', () => UI.toggleElement('archiveModal', false));
        document.getElementById('btnClearArchive')?.addEventListener('click', () => this.clearArchive());
        document.getElementById('btnGeneratePDF')?.addEventListener('click', () => PDFService.generate(state.viewingReport));

        document.getElementById('btnCloseModal')?.addEventListener('click', () => {
            UI.toggleElement('resultModal', false);
            SessionService.checkResumeState(() => {});
        });
        document.getElementById('btnCloseDetail')?.addEventListener('click', () => UI.toggleElement('detailModal', false));
        
        document.getElementById('btnTriggerResume')?.addEventListener('click', () => SessionService.confirmResume());
        
        document.getElementById('btnCancelResume')?.addEventListener('click', async () => {
            await this.expireLastSessionInHistory();
            SessionService.cancelResume(() => this.resetForm(false));
        });

        document.getElementById('buddyToggle')?.addEventListener('change', (e) => {
            UI.toggleBuddyField((e.target as HTMLInputElement).checked);
        });

        // Kopiëren logknop
        document.getElementById('btnCopyToClipboard')?.addEventListener('click', () => {
            const logEl = document.getElementById('logText');
            if (logEl) {
                navigator.clipboard.writeText(logEl.innerText).then(() => {
                    UI.showToast("📋 Log gekopieerd naar klembord!");
                }).catch(() => {
                    UI.showToast("Kon niet kopiëren.");
                });
            }
        });
    },

    async handleSubmit(): Promise<void> {
        const sanitizer = (val: string) => DOMPurify.sanitize(val);
        const honeypot = document.getElementById('contact_email') as HTMLInputElement;
        if (honeypot && honeypot.value !== "") return;

        // Elements
        const elCompany = document.getElementById('companyName') as HTMLInputElement;
        const elUserName = document.getElementById('userName') as HTMLInputElement;
        const elLocation = document.getElementById('taskLocation') as HTMLInputElement;
        const elWorkOrder = document.getElementById('workOrder') as HTMLInputElement;
        const elComments = document.getElementById('comments') as HTMLTextAreaElement;
        
        const elBuddyToggle = document.getElementById('buddyToggle') as HTMLInputElement;
        const elBuddyName = document.getElementById('buddyName') as HTMLInputElement;     
        const elBuddySig = document.getElementById('buddySignature') as HTMLInputElement; 
        const elDeclaration = document.getElementById('declarationCheck') as HTMLInputElement;
        const elTimeEnd = document.getElementById('timeEnd') as HTMLInputElement;

        // Values
        const companyName = elCompany ? sanitizer(elCompany.value.trim()) : "";
        const userName = elUserName ? sanitizer(elUserName.value.trim()) : "";
        const location = elLocation ? sanitizer(elLocation.value.trim()) : "";
        
        if (!companyName) return UI.showToast("Vul bedrijfsnaam / opdrachtgever in!");
        if (!userName || !location) return UI.showToast("Vul naam en locatie in!");

        if (elDeclaration && !elDeclaration.checked) {
            return UI.showToast("⚠️ Je moet verklaren dat je de LMRA naar waarheid hebt ingevuld.");
        }
        
        if (elBuddyToggle && elBuddyToggle.checked) {
            const buddyName = elBuddyName ? sanitizer(elBuddyName.value.trim()) : "";
            if (!buddyName) return UI.showToast("Naam van buddy is verplicht!");
            if (elBuddySig && !elBuddySig.checked) return UI.showToast("⚠️ Buddy moet de verklaring aanvinken!");
        }
        
        if (!FormService.validate()) return;

        UI.setLoading('submitBtn', true);

        const { isSafe, failedPoints } = FormService.getReportData();

        // Tijdsberekening
        const now = new Date();
        let validUntilDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 uur fallback

        if (elTimeEnd && elTimeEnd.value) {
            const [endHours, endMinutes] = elTimeEnd.value.split(':').map(Number);
            validUntilDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHours, endMinutes, 0);
            
            if (validUntilDate < now) {
                validUntilDate.setDate(validUntilDate.getDate() + 1);
            }
        }

        const buddyInfo = (elBuddyToggle && elBuddyToggle.checked) ? ` (Buddy: ${sanitizer(elBuddyName.value.trim())})` : "";
        
        const report: LMRAReport = {
            report_id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
                ? crypto.randomUUID()
                : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
                    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                ),
            monteur_naam: userName + buddyInfo,
            bedrijf_naam: companyName,
            locatie: location,
            werkorder: elWorkOrder ? (sanitizer(elWorkOrder.value.trim()) || 'N.v.t.') : 'N.v.t.',
            is_veilig: isSafe,
            opmerkingen: elComments ? sanitizer(elComments.value.trim()) : "",
            afkeurpunten: JSON.stringify(failedPoints),
            created_at: now.toISOString(),
            valid_until: validUntilDate.toISOString()
        };

        try {
            const saveRes = await Database.submitReport(report);

            if (isSafe) {
                await SessionService.startSession(userName, location, report.werkorder, report.report_id, report.valid_until);
            }

            UI.setLoading('submitBtn', false, "Beoordeel Veiligheid");
            this.showResult(isSafe, report, saveRes.reason || 'saved_locally');
        } catch (error) {
            console.error("Fout bij opslaan rapport:", error);
            UI.setLoading('submitBtn', false, "Beoordeel Veiligheid");
            UI.showToast("❌ Er ging iets mis bij het verwerken.");
        }
    },

    async expireLastSessionInHistory(): Promise<void> {
        try {
            let history = await Database.getHistory();
            if (history.length === 0) return;

            const lastReport = history[0];
            const now = new Date();
            const validUntil = new Date(lastReport.valid_until);

            if (lastReport.is_veilig && validUntil > now) {
                lastReport.valid_until = now.toISOString();
                await Database.updateHistory(history);
                UI.showToast("📁 Dossier bijgewerkt: Werkzaamheden beëindigd.");
            }
        } catch (e) {
            console.error("Kon historie niet bijwerken bij stoppen sessie", e);
        }
    },

    async openArchive(): Promise<void> {
        const history = await Database.getHistory();
        const container = document.getElementById('archiveContainer');
        if(!container) return;
        container.innerHTML = '';
        
        if (!history || history.length === 0) {
            container.innerHTML = '<div class="text-center p-6 text-slate-500 font-medium">Geen geschiedenis gevonden.</div>';
        } else {
            const now = new Date();
            history.forEach(h => {
                let statusDot = 'bg-red-500';
                let statusText = 'Afgekeurd';
                let borderColor = 'border-red-500';

                if (h.is_veilig) {
                    const validUntil = h.valid_until ? new Date(h.valid_until) : null;
                    if (validUntil && now > validUntil) {
                        statusDot = 'bg-slate-400';
                        statusText = 'Verlopen';
                        borderColor = 'border-slate-400';
                    } else {
                        statusDot = 'bg-green-500';
                        statusText = 'Actief';
                        borderColor = 'border-green-500';
                    }
                }

                const div = document.createElement('div');
                div.className = `p-3.5 mb-2 bg-white dark:bg-slate-800 rounded-xl border-l-4 ${borderColor} shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer active:scale-[0.98]`;
                div.innerHTML = `
                    <div class="flex justify-between items-start mb-1 pointer-events-none">
                        <span class="font-bold text-slate-800 dark:text-slate-200 text-sm truncate w-2/3">${h.bedrijf_naam ? h.bedrijf_naam + ' - ' : ''}${h.locatie}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                            <span class="text-[10px] text-slate-500 uppercase font-bold">${statusText}</span>
                        </div>
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 pointer-events-none">
                        ${new Date(h.created_at).toLocaleString('nl-NL')} - ${h.monteur_naam}<br>WO: ${h.werkorder}
                    </div>
                `;
                div.onclick = () => this.showDetail(h);
                container.appendChild(div);
            });
        }
        UI.toggleElement('archiveModal', true);
    },

    async clearArchive(): Promise<void> {
        if(confirm("Weet je zeker dat je de lokale geschiedenis wilt wissen?")) {
            await Database.clearHistory();
            this.openArchive();
            UI.showToast("Geschiedenis gewist.");
        }
    },

    showDetail(report: LMRAReport): void {
        state.viewingReport = report;
        const setTxt = (id: string, val: string) => { const el = document.getElementById(id); if(el) el.innerText = val; };

        const date = new Date(report.created_at);
        const validUntil = new Date(report.valid_until);

        setTxt('detailDate', date.toLocaleDateString('nl-NL'));
        setTxt('detailTimeRange', `${date.toLocaleTimeString('nl-NL').slice(0,5)} - ${validUntil.toLocaleTimeString('nl-NL').slice(0,5)}`);
        setTxt('detailCompany', report.bedrijf_naam || "Niet opgegeven");
        setTxt('detailName', report.monteur_naam);
        setTxt('detailLoc', report.locatie);
        setTxt('detailWO', report.werkorder);
        setTxt('detailComments', report.opmerkingen || "Geen opmerkingen");

        const statusBox = document.getElementById('detailStatusBox');
        if(statusBox) {
            if(report.is_veilig) {
                statusBox.innerHTML = `<div class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-xl text-center border border-green-200 dark:border-green-800"><i class="fa-solid fa-check-circle text-3xl mb-1 text-green-600"></i><br><span class="font-bold uppercase tracking-wide">VEILIG / GOEDGEKEURD</span></div>`;
            } else {
                statusBox.innerHTML = `<div class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-xl text-center border border-red-200 dark:border-red-800"><i class="fa-solid fa-hand text-3xl mb-1 text-red-600"></i><br><span class="font-bold uppercase tracking-wide">ONVEILIG / AFGEKEURD - STOP!</span></div>`;
            }
        }

        const buddyBox = document.getElementById('detailBuddyBox');
        if(buddyBox) {
            if(report.monteur_naam.includes('(Buddy:')) {
                buddyBox.classList.remove('hidden');
                const parts = report.monteur_naam.split('Buddy: ');
                if(parts.length > 1) setTxt('detailBuddy', parts[1].replace(')', ''));
            } else {
                buddyBox.classList.add('hidden');
            }
        }

        const failsContainer = document.getElementById('detailFailsContainer');
        const failsList = document.getElementById('detailFails');
        if(failsContainer && failsList) {
            const afkeur = JSON.parse(report.afkeurpunten || "[]");
            if(afkeur.length > 0) {
                failsContainer.classList.remove('hidden');
                failsList.innerHTML = afkeur.map((p: string) => `<li>${p}</li>`).join('');
            } else {
                failsContainer.classList.add('hidden');
                failsList.innerHTML = '';
            }
        }
        UI.toggleElement('archiveModal', false);
        UI.toggleElement('detailModal', true);
    },

    showResult(isSafe: boolean, report: LMRAReport, _reason?: string): void {
        const header = document.getElementById('resultHeader');
        const iconContainer = document.getElementById('resultIcon');
        const title = document.getElementById('resultTitle');
        const msg = document.getElementById('resultMessage');
        const log = document.getElementById('logText');
        
        state.viewingReport = report;
        UI.toggleElement('resultModal', true);

        const statusText = "💾 Lokaal Opgeslagen (IndexedDB)";

        if(!header || !iconContainer || !title || !msg || !log) return;

        if (isSafe) {
            header.className = "p-8 text-center text-white shrink-0 bg-emerald-600";
            iconContainer.innerHTML = '<i class="fa-solid fa-shield-halved"></i>'; 
            title.innerText = "VEILIG";
            msg.innerText = "Werkzaamheden mogen veilig starten.";
        } else {
            header.className = "p-8 text-center text-white shrink-0 bg-red-600";
            iconContainer.innerHTML = '<i class="fa-solid fa-hand"></i>';
            title.innerText = "STOP!";
            msg.innerText = "Risico's gedetecteerd! Pas eerst maatregelen toe.";
        }

        const afkeurPoints = JSON.parse(report.afkeurpunten || "[]");
        log.innerHTML = `<strong>STATUS: ${statusText}</strong><br>---------------------------<br>Datum: ${new Date().toLocaleString('nl-NL')}<br>Bedrijf: ${report.bedrijf_naam || 'N.v.t.'}<br>Monteur: ${report.monteur_naam}<br>Locatie: ${report.locatie}<br>WO: ${report.werkorder}<br>---------------------------<br>${isSafe ? '✅ Geen afkeurpunten' : '⚠️ <strong>AFKEURPUNTEN:</strong><br>' + afkeurPoints.join('<br>')}`;
    },

    resetForm(askConfirm: boolean): void {
        if(askConfirm && !confirm("Formulier wissen?")) return;
        
        FormService.reset();
        
        const comp = document.getElementById('companyName') as HTMLInputElement;
        const loc = document.getElementById('taskLocation') as HTMLInputElement;
        const wo = document.getElementById('workOrder') as HTMLInputElement;
        const comm = document.getElementById('comments') as HTMLTextAreaElement;
        const decl = document.getElementById('declarationCheck') as HTMLInputElement;
        
        if(comp) comp.value = '';
        if(loc) loc.value = '';
        if(wo) wo.value = '';
        if(comm) comm.value = '';
        if(decl) decl.checked = false;
        
        FormService.render('questions-container');
        SessionService.setDefaultTimes();
    },

    forceShowChangelog(): void {
        const elVersion = document.getElementById('updateVersionDisplay');
        const elTitle = document.getElementById('updateTitleDisplay');
        const elList = document.getElementById('updateListDisplay');

        if (elVersion) elVersion.innerText = `v${APP_VERSION}`;
        if (elTitle) elTitle.innerText = RELEASE_INFO.title;
        
        if (elList) {
            elList.innerHTML = '';
            RELEASE_INFO.features.forEach(feature => {
                const li = document.createElement('li');
                li.textContent = feature;
                elList.appendChild(li);
            });
        }

        UI.toggleElement('updateModal', true);
    },

    checkChangelog(): void {
        const storedVersion = localStorage.getItem('lmra_version');
        if (storedVersion !== APP_VERSION || RELEASE_INFO.forceShow) {
            this.forceShowChangelog();
            const btn = document.getElementById('btnCloseUpdateModal');
            if(btn) {
                btn.onclick = () => { 
                    localStorage.setItem('lmra_version', APP_VERSION); 
                    UI.toggleElement('updateModal', false); 
                };
            }
        } else {
            const btn = document.getElementById('btnCloseUpdateModal');
            if(btn) {
                btn.onclick = () => UI.toggleElement('updateModal', false);
            }
        }
    },

    toggleTheme(): void {
        document.documentElement.classList.toggle('dark');
    }
};