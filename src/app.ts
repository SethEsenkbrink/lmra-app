/* src/app.ts - v9.6.2 (FIXED: Syntax Structure & Timer) */
import { UI } from './ui';
import { Database, LMRAReport } from './database';
import { CryptoManager, SecureStorage } from './security';
import { categories } from './data';
import { 
    ACTIVE_SESSION_KEY, 
    SECURITY_CHECK_KEY, 
    HISTORY_KEY, 
    APP_VERSION 
} from './config';
import DOMPurify from 'dompurify';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// Interface voor de applicatie status
interface AppState {
    answers: Record<number, string>;
    actions: Record<number, string>;
    isUnlocked: boolean;
    viewingReport: LMRAReport | null;
    timerInterval: number | null; // Voor de countdown
}

// Interface voor opgeslagen sessie
interface StoredSession {
    date: string;
    name: string;
    task: string;
    wo: string;
}

const state: AppState = {
    answers: {},
    actions: {},
    isUnlocked: false,
    viewingReport: null,
    timerInterval: null
};

export const App = {
    async init(): Promise<void> {
        console.log(`LMRA Pro v${APP_VERSION} Init...`);
        this.attachEventListeners();
        this.checkChangelog();
        
        const hasSalt = localStorage.getItem('lmra_salt');
        if (!hasSalt) {
            this.startSetupFlow();
        } else {
            this.startUnlockFlow();
        }
        
        window.addEventListener('online', () => {
            UI.showToast("Verbinding hersteld. Synchroniseren...");
            Database.processSyncQueue().then(res => {
                if(res.processed > 0) UI.showToast(`✅ ${res.processed} rapporten verzonden!`);
            });
        });
    },

    attachEventListeners(): void {
        // Knoppen
        document.getElementById('btnUnlock')?.addEventListener('click', () => this.handleUnlock());
        document.getElementById('submitBtn')?.addEventListener('click', () => this.handleSubmit());
        document.getElementById('btnResetApp')?.addEventListener('click', () => this.resetForm());
        document.getElementById('btnToggleTheme')?.addEventListener('click', () => this.toggleTheme());
        
        // Archief & PDF
        document.getElementById('btnOpenArchive')?.addEventListener('click', () => this.openArchive());
        document.getElementById('btnCloseArchive')?.addEventListener('click', () => UI.toggleElement('archiveModal', false));
        document.getElementById('btnClearArchive')?.addEventListener('click', () => this.clearArchive());
        document.getElementById('btnGeneratePDF')?.addEventListener('click', () => this.generatePDF());

        // Modals
        document.getElementById('btnCloseModal')?.addEventListener('click', () => {
            UI.toggleElement('resultModal', false);
            // Als we een veilige sessie hebben, start timer direct na sluiten modal
            this.checkResumeState();
        });
        document.getElementById('btnCloseDetail')?.addEventListener('click', () => UI.toggleElement('detailModal', false));
        
        // Timer / Resume Knoppen in de Balk
        document.getElementById('btnTriggerResume')?.addEventListener('click', () => this.confirmResume());
        document.getElementById('btnCancelResume')?.addEventListener('click', () => this.cancelResume());

        // Buddy Check
        document.getElementById('buddyToggle')?.addEventListener('change', (e) => {
            UI.toggleBuddyField((e.target as HTMLInputElement).checked);
        });

        // PIN inputs
        const inputs = document.querySelectorAll('.pin-digit') as NodeListOf<HTMLInputElement>;
        inputs.forEach((input, index) => {
            input.oninput = (e) => {
                const target = e.target as HTMLInputElement;
                if (target.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            };
            input.onkeydown = (e) => {
                const target = e.target as HTMLInputElement;
                if (e.key === 'Backspace' && target.value === '' && index > 0) {
                    inputs[index - 1].focus();
                }
                if (e.key === 'Enter') this.handleUnlock();
            };
        });
    },

    setDefaultTimes(): void {
        const now = new Date();
        const end = new Date(now.getTime() + 4*60*60*1000); 
        
        const elStart = document.getElementById('timeStart') as HTMLInputElement;
        const elEnd = document.getElementById('timeEnd') as HTMLInputElement;
        
        if(elStart && !elStart.value) elStart.value = now.toTimeString().slice(0,5);
        if(elEnd && !elEnd.value) elEnd.value = end.toTimeString().slice(0,5);
    },

    /* --- PIN FLOW --- */
    startSetupFlow(): void {
        UI.toggleElement('pinModal', true);
        UI.toggleElement('setupMode', true);
        const title = document.getElementById('pinTitle');
        const desc = document.getElementById('pinDesc');
        const btn = document.getElementById('btnUnlock');
        
        if(title) title.innerText = "Stel PIN in";
        if(desc) desc.innerText = "Kies 6 cijfers";
        if(btn) btn.innerText = "Instellen & Starten";
        
        localStorage.setItem('lmra_failed_attempts', '0');
    },

    startUnlockFlow(): void {
        UI.toggleElement('pinModal', true);
        UI.toggleElement('setupMode', false);
        
        const title = document.getElementById('pinTitle');
        const btn = document.getElementById('btnUnlock');
        
        if(title) title.innerText = "Beveiligde Toegang";
        if(btn) btn.innerText = "Ontgrendelen";
        
        setTimeout(() => (document.querySelector('.pin-digit') as HTMLInputElement)?.focus(), 100);
    },

    async handleUnlock(): Promise<void> {
        const inputs = document.querySelectorAll('.pin-digit') as NodeListOf<HTMLInputElement>;
        let pin = '';
        inputs.forEach(i => pin += i.value);

        if (pin.length !== 6) return UI.showToast("Voer 6 cijfers in.");

        UI.setLoading('btnUnlock', true);
        const errorMsg = document.getElementById('pinError');
        if(errorMsg) {
            errorMsg.innerText = "";
            errorMsg.className = "text-red-500 text-xs font-bold h-4 mb-4";
        }

        try {
            const storedSalt = localStorage.getItem('lmra_salt');
            let attempts = parseInt(localStorage.getItem('lmra_failed_attempts') || '0');
            if (attempts >= 5) {
                await this.triggerWipe();
                throw new Error("SECURITY_LOCKOUT");
            }

            const { key, salt } = await CryptoManager.deriveKey(pin, storedSalt);
            CryptoManager.key = key;

            if (!storedSalt) {
                localStorage.setItem('lmra_salt', salt);
                await SecureStorage.set(SECURITY_CHECK_KEY, 'VALID_PIN');
                localStorage.setItem('lmra_failed_attempts', '0');
                this.unlockApp();
            } else {
                const check = await SecureStorage.get(SECURITY_CHECK_KEY);
                if (check === 'VALID_PIN') {
                    localStorage.setItem('lmra_failed_attempts', '0');
                    this.unlockApp();
                } else {
                    throw new Error("Verkeerde PIN");
                }
            }
        } catch (e) {
            console.error(e);
            CryptoManager.key = null;
            if (localStorage.getItem('lmra_salt')) {
                let attempts = parseInt(localStorage.getItem('lmra_failed_attempts') || '0');
                attempts++;
                localStorage.setItem('lmra_failed_attempts', attempts.toString());

                if(errorMsg) {
                    if (attempts >= 5) {
                        await this.triggerWipe();
                        errorMsg.innerText = "DATA GEWIST.";
                        alert("⚠️ 5 Foute pogingen. Data gewist.");
                        location.reload();
                        return;
                    } else {
                        const left = 5 - attempts;
                        errorMsg.innerText = `Foutieve code. Nog ${left} pogingen.`;
                    }
                }
            }
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        } finally {
            UI.setLoading('btnUnlock', false, "Ontgrendelen");
        }
    },

    async triggerWipe(): Promise<void> {
        await SecureStorage.wipeEverything();
        localStorage.clear();
    },

    unlockApp(): void {
        state.isUnlocked = true;
        UI.toggleElement('pinModal', false);
        UI.renderCategories(categories, 'questions-container', 
            (id: number, val: string) => this.handleAnswer(id, val), 
            (id: number, txt: string) => this.handleAction(id, txt)
        );
        this.checkResumeState();
        Database.processSyncQueue();
    },

    /* --- ACTIVE SESSION LOGIC & TIMER --- */
    async checkResumeState(): Promise<void> {
        const session = await SecureStorage.get(ACTIVE_SESSION_KEY) as StoredSession | null;
        const validUntilStr = await SecureStorage.get('lmra_valid_until') as string | null;
        
        if (session && validUntilStr) {
            // Check of datum vandaag is, anders killen we de sessie
            if (session.date === new Date().toDateString()) {
                // Sessie is van vandaag.
                
                // Formulier vullen
                const uName = document.getElementById('userName') as HTMLInputElement; 
                const tLoc = document.getElementById('taskLocation') as HTMLInputElement; 
                const wOrd = document.getElementById('workOrder') as HTMLInputElement;
                if(uName) uName.value = session.name || '';
                if(tLoc) tLoc.value = session.task || '';
                if(wOrd) wOrd.value = session.wo || '';
                
                // Activeer lock en timer
                this.activateLockedSession(new Date(validUntilStr));
            } else {
                // Oude sessie van gisteren
                this.cancelResume();
            }
        } else {
            // Geen sessie
            UI.toggleElement('resumeBar', false);
            this.toggleFormLock(false);
            this.setDefaultTimes();
        }
    },

    activateLockedSession(validUntil: Date): void {
        this.toggleFormLock(true); // Direct op slot!
        UI.toggleElement('resumeBar', true); // Balk tonen
        UI.toggleElement('submitBtn', false); // Submit knop weg
        
        // Start Timer
        if(state.timerInterval) clearInterval(state.timerInterval);
        
        const updateTimer = () => {
            const now = new Date();
            const diff = validUntil.getTime() - now.getTime();
            
            const displayEl = document.getElementById('timerDisplay');
            const infoEl = document.getElementById('sessionInfoText');
            const btnExtend = document.getElementById('btnTriggerResume');

            if(diff <= 0) {
                // Tijd is op
                if(displayEl) {
                    displayEl.innerText = "00:00:00";
                    displayEl.classList.add('text-red-600');
                }
                if(infoEl) infoEl.innerText = "Geldigheid verlopen!";
                if(btnExtend) btnExtend.classList.remove('hidden'); // NU pas mag je verlengen
                UI.toggleElement('pauseAlert', true);
            } else {
                // Nog geldig
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                if(displayEl) {
                    displayEl.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    displayEl.classList.remove('text-red-600');
                }
                if(infoEl) infoEl.innerText = `Geldig tot ${validUntil.toLocaleTimeString().slice(0,5)}`;
                
                // Verlengen knop verbergen
                if(btnExtend) btnExtend.classList.add('hidden');
                UI.toggleElement('pauseAlert', false);
            }
        };

        updateTimer(); // Directe update
        // @ts-ignore
        state.timerInterval = setInterval(updateTimer, 1000);
    },

    confirmResume(): void {
        // Dit is nu "Verlengen"
        const newEnd = new Date(Date.now() + 4*60*60*1000);
        
        SecureStorage.set('lmra_valid_until', newEnd.toISOString()).then(() => {
            UI.showToast("✅ Werkzaamheden verlengd (+4 uur)");
            this.activateLockedSession(newEnd);
        });
    },

    cancelResume(): void {
        if(state.timerInterval) clearInterval(state.timerInterval);
        SecureStorage.remove(ACTIVE_SESSION_KEY);
        SecureStorage.remove('lmra_valid_until');
        
        UI.toggleElement('resumeBar', false);
        UI.toggleElement('pauseAlert', false);
        UI.toggleElement('submitBtn', true); // Submit knop terug
        
        this.toggleFormLock(false); // Formulier open
        this.resetForm();
    },

    toggleFormLock(locked: boolean): void {
        const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('#userName, #taskLocation, #workOrder, #comments, #timeStart, #timeEnd, #buddyToggle, #buddyName, #declarationCheck');
        elements.forEach(el => el.disabled = locked);
        const buttons = document.querySelectorAll('.question-card button') as NodeListOf<HTMLButtonElement>;
        buttons.forEach(btn => btn.disabled = locked);
    },

    /* --- FORMULIER SUBMIT --- */
    handleAnswer(id: number, value: string): void {
        state.answers[id] = value;
        const btnYes = document.getElementById(`btn-yes-${id}`);
        const btnNo = document.getElementById(`btn-no-${id}`);
        const actionBox = document.getElementById(`action-box-${id}`);

        if(!btnYes || !btnNo || !actionBox) return;

        const baseClass = "py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ";
        const inactiveClass = "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400";
        
        btnYes.className = baseClass + inactiveClass;
        btnNo.className = baseClass + inactiveClass;

        if (value === 'yes') {
            btnYes.className = baseClass + "bg-green-600 text-white shadow-md";
            actionBox.classList.add('hidden');
            delete state.actions[id];
        } else {
            btnNo.className = baseClass + "bg-red-600 text-white shadow-md";
            actionBox.classList.remove('hidden');
        }
    },

    handleAction(id: number, text: string): void { state.actions[id] = text; },

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
        
        const totalQ = categories.reduce((acc, cat) => acc + cat.questions.length, 0);
        if (Object.keys(state.answers).length < totalQ) return UI.showToast("Beantwoord alle vragen!");

        for (const [id, val] of Object.entries(state.answers)) {
            const numericId = parseInt(id);
            if (val === 'no' && (!state.actions[numericId] || state.actions[numericId].trim() === '')) {
                return UI.showToast("Vul actie in bij elk 'NEE' antwoord!");
            }
        }

        UI.setLoading('submitBtn', true);

        let isSafe = true;
        const failedPoints: string[] = [];
        categories.forEach(cat => {
            cat.questions.forEach(q => {
                if (state.answers[q.id] === 'no') {
                    isSafe = false;
                    failedPoints.push(`${q.text} (Actie: ${state.actions[q.id] || 'Geen'})`);
                }
            });
        });

        const validUntilDate = new Date(new Date().getTime() + 4*60*60*1000);
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
            valid_until: validUntilDate.toISOString()
        };

        await this.saveToHistory(report);
        const result = await Database.submitReport(report);

        if (isSafe) {
            await SecureStorage.set(ACTIVE_SESSION_KEY, { 
                date: new Date().toDateString(), 
                name: userName, 
                task: location, 
                wo: report.werkorder 
            });
            await SecureStorage.set('lmra_valid_until', validUntilDate.toISOString());
            
            // DIRECT ACTIE: Formulier op slot
            this.activateLockedSession(validUntilDate);
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

    /* --- ARCHIEF & DETAILS --- */
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

    generatePDF(): void {
        const report = state.viewingReport;
        if (!report) return;
        const element = document.getElementById('pdfContent');
        if (!element) return UI.showToast("Geen inhoud voor PDF.");

        UI.showToast("PDF Genereren...");
        const opt = {
            margin: 10,
            filename: `LMRA_${report.werkorder}_${new Date(report.created_at).toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => UI.showToast("✅ PDF Gedownload")).catch((err: any) => { console.error(err); UI.showToast("❌ Fout bij PDF maken"); });
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

    resetForm(): void {
        if(!confirm("Formulier wissen?")) return;
        state.answers = {};
        state.actions = {};
        (document.getElementById('taskLocation') as HTMLInputElement).value = '';
        (document.getElementById('workOrder') as HTMLInputElement).value = '';
        (document.getElementById('comments') as HTMLInputElement).value = '';
        UI.renderCategories(categories, 'questions-container', (id, val) => this.handleAnswer(id, val), (id, txt) => this.handleAction(id, txt));
        this.setDefaultTimes();
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