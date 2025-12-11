/* src/app.ts - v9.8.2 (Fix: Password Reset Priority) */
import { UI } from './ui';
import { Database, LMRAReport, supabase } from './database';
import { SecureStorage } from './security';
import { HISTORY_KEY, APP_VERSION } from './config';
import DOMPurify from 'dompurify';

// Services
import { PDFService } from './services/pdf';
import { AuthService } from './services/auth';
import { CloudAuthService } from './services/cloud-auth';
import { SessionService } from './services/session';
import { FormService } from './services/form';

interface AppState {
    viewingReport: LMRAReport | null;
}

const state: AppState = {
    viewingReport: null
};

export const App = {
    async init(): Promise<void> {
        console.log(`LMRA Pro v${APP_VERSION} Init...`);
        this.attachEventListeners();
        this.checkChangelog();
        
        // 1. Luister naar Auth Events (zoals Password Recovery)
        supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                console.log("🔓 Wachtwoord herstel modus geactiveerd!");
                // Sluit eventuele andere modals
                UI.toggleElement('cloudLoginModal', false);
                UI.toggleElement('pinModal', false);
                // Open de reset modal
                CloudAuthService.handlePasswordReset();
            }
        });

        // 2. CRUCIALE CHECK: Is dit een reset link?
        // Als er 'type=recovery' in de URL staat, moeten we WACHTEN op Supabase.
        // We voeren de standaard checkSession dan NIET uit, anders overruled die de reset.
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            console.log("⏳ Recovery link gedetecteerd. Wachten op Supabase event...");
            UI.showToast("Wachtwoord herstel laden...");
            return; // STOP HIER. De onAuthStateChange hierboven pakt het verder op.
        }

        // 3. Foutafhandeling (zoals in je screenshot: link expired)
        if (hash && hash.includes('error_code=otp_expired')) {
            UI.showToast("⚠️ Link is verlopen. Vraag een nieuwe aan.");
            // We laten de code hieronder doorlopen zodat het inlogscherm verschijnt
            // en ze een nieuwe kunnen aanvragen.
            window.location.hash = ''; // URL opschonen
        }

        // 4. Standaard Flow: Cloud Gatekeeper Check
        // Dit voeren we alleen uit als we NIET in een recovery flow zitten
        const isCloudAuthenticated = await CloudAuthService.checkSession();

        if (isCloudAuthenticated) {
            this.startLocalSecurity(); 
        } else {
            CloudAuthService.showLogin(() => {
                this.startLocalSecurity();
            });
        }
        
        // Luister naar netwerk herstel voor sync
        window.addEventListener('online', () => {
            UI.showToast("Verbinding hersteld. Synchroniseren...");
            Database.processSyncQueue().then(res => {
                if(res.processed > 0) UI.showToast(`✅ ${res.processed} rapporten verzonden!`);
            });
        });
    },

    startLocalSecurity(): void {
        const btnLogOutWrapper = document.getElementById('btnLogOutWrapper');
        if(btnLogOutWrapper) btnLogOutWrapper.classList.remove('hidden'); 
        
        AuthService.init(() => this.unlockApp());
    },

    unlockApp(): void {
        UI.toggleElement('pinModal', false);
        FormService.init('questions-container'); 
        SessionService.checkResumeState(() => this.resetForm(false));
        Database.processSyncQueue();
    },

    attachEventListeners(): void {
        document.getElementById('submitBtn')?.addEventListener('click', () => this.handleSubmit());
        document.getElementById('btnResetApp')?.addEventListener('click', () => this.resetForm(true));
        document.getElementById('btnToggleTheme')?.addEventListener('click', () => this.toggleTheme());
        
        document.getElementById('btnLogOut')?.addEventListener('click', () => CloudAuthService.signOut());
        
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
        document.getElementById('btnCancelResume')?.addEventListener('click', () => SessionService.cancelResume(() => this.resetForm(false)));

        document.getElementById('buddyToggle')?.addEventListener('change', (e) => {
            UI.toggleBuddyField((e.target as HTMLInputElement).checked);
        });
    },

    async handleSubmit(): Promise<void> {
        const honeypot = document.getElementById('contact_email') as HTMLInputElement;
        if (honeypot && honeypot.value !== "") return;

        const elUserName = document.getElementById('userName') as HTMLInputElement;
        const elLocation = document.getElementById('taskLocation') as HTMLInputElement;
        const elWorkOrder = document.getElementById('workOrder') as HTMLInputElement;
        const elComments = document.getElementById('comments') as HTMLTextAreaElement;
        
        const elBuddyToggle = document.getElementById('buddyToggle') as HTMLInputElement;
        const elBuddyName = document.getElementById('buddyName') as HTMLInputElement;
        const elBuddySig = document.getElementById('buddySignature') as HTMLInputElement;

        const userName = DOMPurify.sanitize(elUserName.value);
        const location = DOMPurify.sanitize(elLocation.value);
        
        if (!userName || !location) return UI.showToast("Vul naam en locatie in!");
        
        if (elBuddyToggle.checked) {
            const buddyName = DOMPurify.sanitize(elBuddyName.value);
            if (!buddyName) return UI.showToast("Naam van buddy is verplicht!");
            if (!elBuddySig.checked) return UI.showToast("Buddy moet de verklaring aanvinken!");
        }
        
        if (!FormService.validate()) return;

        UI.setLoading('submitBtn', true);

        const { isSafe, failedPoints } = FormService.getReportData();

        const buddyInfo = elBuddyToggle.checked ? ` (Buddy: ${DOMPurify.sanitize(elBuddyName.value)})` : "";
        const report: LMRAReport = {
            report_id: crypto.randomUUID(),
            monteur_naam: userName + buddyInfo,
            locatie: location,
            werkorder: DOMPurify.sanitize(elWorkOrder.value) || 'N.v.t.',
            is_veilig: isSafe,
            opmerkingen: DOMPurify.sanitize(elComments.value),
            afkeurpunten: JSON.stringify(failedPoints),
            created_at: new Date().toISOString(),
            valid_until: new Date(Date.now() + 4*60*60*1000).toISOString()
        };

        await this.saveToHistory(report);
        const result = await Database.submitReport(report);

        if (isSafe) {
            await SessionService.startSession(userName, location, report.werkorder);
        }

        UI.setLoading('submitBtn', false, "Beoordeel Veiligheid");
        this.showResult(isSafe, report, result.status);
    },

    async saveToHistory(report: LMRAReport): Promise<void> {
        let history = await SecureStorage.get(HISTORY_KEY) as LMRAReport[] || [];
        history.unshift(report);
        if (history.length > 50) history.pop();
        await SecureStorage.set(HISTORY_KEY, history);
    },

    async openArchive(): Promise<void> {
        const history = await SecureStorage.get(HISTORY_KEY) as LMRAReport[];
        const container = document.getElementById('archiveContainer');
        if(!container) return;
        container.innerHTML = '';
        
        if (!history || history.length === 0) {
            container.innerHTML = '<div class="text-center p-4 text-slate-500">Geen historie.</div>';
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
                div.className = `p-3 mb-2 bg-white dark:bg-slate-800 rounded border-l-4 ${borderColor} hover:bg-slate-50 transition-colors cursor-pointer active:scale-[0.98]`;
                div.innerHTML = `
                    <div class="flex justify-between items-start mb-1 pointer-events-none">
                        <span class="font-bold text-slate-700 dark:text-slate-200 text-sm truncate w-2/3">${h.locatie}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                            <span class="text-[10px] text-slate-500 uppercase font-bold">${statusText}</span>
                        </div>
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 pointer-events-none">
                        ${new Date(h.created_at).toLocaleString()} - ${h.monteur_naam}<br>WO: ${h.werkorder}
                    </div>
                `;
                div.onclick = () => this.showDetail(h);
                container.appendChild(div);
            });
        }
        UI.toggleElement('archiveModal', true);
    },

    async clearArchive(): Promise<void> {
        if(confirm("Weet je zeker dat je de lokale historie wilt wissen?")) {
            await SecureStorage.remove(HISTORY_KEY);
            this.openArchive();
            UI.showToast("Historie gewist.");
        }
    },

    showDetail(report: LMRAReport): void {
        state.viewingReport = report;
        const setTxt = (id: string, val: string) => { const el = document.getElementById(id); if(el) el.innerText = val; };

        const date = new Date(report.created_at);
        const validUntil = new Date(report.valid_until);

        setTxt('detailDate', date.toLocaleDateString());
        setTxt('detailTimeRange', `${date.toLocaleTimeString().slice(0,5)} - ${validUntil.toLocaleTimeString().slice(0,5)}`);
        setTxt('detailName', report.monteur_naam);
        setTxt('detailLoc', report.locatie);
        setTxt('detailWO', report.werkorder);
        setTxt('detailComments', report.opmerkingen || "Geen opmerkingen");

        const statusBox = document.getElementById('detailStatusBox');
        if(statusBox) {
            if(report.is_veilig) {
                statusBox.innerHTML = `<div class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 rounded-lg text-center border border-green-200 dark:border-green-800"><i class="fa-solid fa-check-circle text-3xl mb-1"></i><br><span class="font-bold uppercase tracking-wide">Veilig / Goedgekeurd</span></div>`;
            } else {
                statusBox.innerHTML = `<div class="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg text-center border border-red-200 dark:border-red-800"><i class="fa-solid fa-triangle-exclamation text-3xl mb-1"></i><br><span class="font-bold uppercase tracking-wide">Niet Veilig / Afgekeurd</span></div>`;
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

    showResult(isSafe: boolean, report: LMRAReport, syncStatus: string): void {
        const header = document.getElementById('resultHeader');
        const iconContainer = document.getElementById('resultIcon');
        const title = document.getElementById('resultTitle');
        const msg = document.getElementById('resultMessage');
        const log = document.getElementById('logText');
        
        UI.toggleElement('resultModal', true);

        let statusText = "";
        if (syncStatus === 'cloud') statusText = "☁️ Opgeslagen in Cloud";
        else if (syncStatus === 'queued') statusText = "💾 Offline Opgeslagen (Wachtrij)";
        else statusText = "⚠️ Lokaal Opgeslagen (Fout)";

        if(!header || !iconContainer || !title || !msg || !log) return;

        if (isSafe) {
            header.className = "p-8 text-center text-white shrink-0 bg-green-600";
            iconContainer.innerHTML = '<i class="fa-solid fa-shield-halved"></i>'; 
            title.innerText = "VEILIG";
            msg.innerText = "Werkzaamheden mogen starten.";
        } else {
            header.className = "p-8 text-center text-white shrink-0 bg-red-600";
            iconContainer.innerHTML = '<i class="fa-solid fa-hand"></i>';
            title.innerText = "STOP!";
            msg.innerText = "Risico's! Pas eerst maatregelen toe.";
        }

        log.innerHTML = `<strong>STATUS: ${statusText}</strong><br>---------------------------<br>Datum: ${new Date().toLocaleString()}<br>Monteur: ${report.monteur_naam}<br>Locatie: ${report.locatie}<br>WO: ${report.werkorder}<br>---------------------------<br>${isSafe ? '✅ Geen afkeurpunten' : '⚠️ <strong>AFKEURPUNTEN:</strong><br>' + JSON.parse(report.afkeurpunten).join('<br>')}`;
    },

    resetForm(askConfirm: boolean): void {
        if(askConfirm && !confirm("Formulier wissen?")) return;
        
        FormService.reset();
        
        (document.getElementById('taskLocation') as HTMLInputElement).value = '';
        (document.getElementById('workOrder') as HTMLInputElement).value = '';
        (document.getElementById('comments') as HTMLInputElement).value = '';
        
        FormService.render('questions-container');
        SessionService.setDefaultTimes();
    },

    checkChangelog(): void {
        const storedVersion = localStorage.getItem('lmra_version');
        if (storedVersion !== APP_VERSION) {
            UI.toggleElement('updateModal', true);
            const btn = document.getElementById('btnCloseUpdateModal');
            if(btn) btn.onclick = () => { localStorage.setItem('lmra_version', APP_VERSION); UI.toggleElement('updateModal', false); };
        }
    },

    toggleTheme(): void {
        document.documentElement.classList.toggle('dark');
    }
};