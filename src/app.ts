/* src/app.ts - v9.5 (Full & Complete - Self Destruct Enabled) */
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

// Interface voor de applicatie status
interface AppState {
    answers: Record<number, string>;
    actions: Record<number, string>;
    isUnlocked: boolean;
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
    isUnlocked: false
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
        
        // Archief
        document.getElementById('btnOpenArchive')?.addEventListener('click', () => this.openArchive());
        document.getElementById('btnCloseArchive')?.addEventListener('click', () => UI.toggleElement('archiveModal', false));
        document.getElementById('btnClearArchive')?.addEventListener('click', () => this.clearArchive());

        // Modals
        document.getElementById('btnCloseModal')?.addEventListener('click', () => UI.toggleElement('resultModal', false));
        document.getElementById('btnCloseDetail')?.addEventListener('click', () => UI.toggleElement('detailModal', false));
        
        // Resume Knoppen
        document.getElementById('btnTriggerResume')?.addEventListener('click', () => UI.toggleElement('resumeCheckModal', true));
        document.getElementById('btnConfirmResume')?.addEventListener('click', () => this.confirmResume());
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
        
        // Alleen invullen als ze leeg zijn
        if(elStart && !elStart.value) elStart.value = now.toTimeString().slice(0,5);
        if(elEnd && !elEnd.value) elEnd.value = end.toTimeString().slice(0,5);
    },

    /* --- PIN FLOW (MET SELF-DESTRUCT) --- */
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
            
            // Check lockdown status
            let attempts = parseInt(localStorage.getItem('lmra_failed_attempts') || '0');
            if (attempts >= 5) {
                await this.triggerWipe();
                throw new Error("SECURITY_LOCKOUT");
            }

            const { key, salt } = await CryptoManager.deriveKey(pin, storedSalt);
            CryptoManager.key = key;

            if (!storedSalt) {
                // Setup
                localStorage.setItem('lmra_salt', salt);
                await SecureStorage.set(SECURITY_CHECK_KEY, 'VALID_PIN');
                localStorage.setItem('lmra_failed_attempts', '0');
                this.unlockApp();
            } else {
                // Decryptie check
                const check = await SecureStorage.get(SECURITY_CHECK_KEY);
                if (check === 'VALID_PIN') {
                    localStorage.setItem('lmra_failed_attempts', '0'); // Succes! Reset teller.
                    this.unlockApp();
                } else {
                    throw new Error("Verkeerde PIN");
                }
            }
        } catch (e) {
            console.error(e);
            CryptoManager.key = null;
            
            // Foutafhandeling & Teller
            if (localStorage.getItem('lmra_salt')) {
                let attempts = parseInt(localStorage.getItem('lmra_failed_attempts') || '0');
                attempts++;
                localStorage.setItem('lmra_failed_attempts', attempts.toString());

                if(errorMsg) {
                    if (attempts >= 5) {
                        await this.triggerWipe();
                        errorMsg.innerText = "BEVEILIGING GEACTIVEERD: DATA GEWIST.";
                        errorMsg.className = "text-red-600 font-black text-xs h-4 mb-4 animate-pulse";
                        alert("⚠️ 5 Foute pogingen.\n\nUit veiligheidsoverwegingen is alle lokale data permanent gewist.");
                        location.reload();
                        return;
                    } else {
                        const left = 5 - attempts;
                        errorMsg.innerText = `Foutieve code. Nog ${left} pogingen.`;
                    }
                }
            } else if (errorMsg) {
                errorMsg.innerText = "Fout bij instellen.";
            }

            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        } finally {
            UI.setLoading('btnUnlock', false, "Ontgrendelen");
        }
    },

    async triggerWipe(): Promise<void> {
        console.warn("🚨 SELF DESTRUCT INITIATED 🚨");
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

    /* --- RESUME & SESSION LOGIC --- */
    async checkResumeState(): Promise<void> {
        const session = await SecureStorage.get(ACTIVE_SESSION_KEY) as StoredSession | null;
        
        if (session) {
            const today = new Date().toDateString();
            if (session.date === today) {
                UI.toggleElement('resumeBar', true);
                
                const uName = document.getElementById('userName') as HTMLInputElement; 
                const tLoc = document.getElementById('taskLocation') as HTMLInputElement; 
                const wOrd = document.getElementById('workOrder') as HTMLInputElement;
                
                if(uName) uName.value = session.name || '';
                if(tLoc) tLoc.value = session.task || '';
                if(wOrd) wOrd.value = session.wo || '';
                
                this.toggleFormLock(true);
            } else {
                await SecureStorage.remove(ACTIVE_SESSION_KEY);
                UI.toggleElement('resumeBar', false);
                this.setDefaultTimes();
            }
        } else {
            UI.toggleElement('resumeBar', false);
            this.setDefaultTimes();
        }

        const validUntil = await SecureStorage.get('lmra_valid_until') as string | null;
        if (validUntil) {
            const now = new Date();
            const endTime = new Date(validUntil);
            if (!isNaN(endTime.getTime()) && now > endTime) {
                UI.toggleElement('pauseAlert', true);
            }
        }
    },

    confirmResume(): void {
        UI.toggleElement('resumeCheckModal', false);
        UI.toggleElement('resumeBar', false); 
        this.toggleFormLock(false); 
        
        const now = new Date();
        const end = new Date(now.getTime() + 4*60*60*1000);
        const elStart = document.getElementById('timeStart') as HTMLInputElement;
        const elEnd = document.getElementById('timeEnd') as HTMLInputElement;
        
        if(elStart) elStart.value = now.toTimeString().slice(0,5);
        if(elEnd) elEnd.value = end.toTimeString().slice(0,5);
        
        UI.showToast("✅ Werkzaamheden hervat. Tijd verlengd.");
    },

    cancelResume(): void {
        UI.toggleElement('resumeCheckModal', false);
        UI.toggleElement('resumeBar', false);
        SecureStorage.remove(ACTIVE_SESSION_KEY);
        SecureStorage.remove('lmra_valid_until');
        this.toggleFormLock(false);
        this.resetForm();
    },

    toggleFormLock(locked: boolean): void {
        const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('#userName, #taskLocation, #workOrder, #comments, #timeStart, #timeEnd, #buddyToggle, #buddyName, #declarationCheck');
        elements.forEach(el => el.disabled = locked);
        const buttons = document.querySelectorAll('.question-card button') as NodeListOf<HTMLButtonElement>;
        buttons.forEach(btn => btn.disabled = locked);
    },

    /* --- FORMULIER --- */
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
        const elUserName = document.getElementById('userName') as HTMLInputElement;
        const elLocation = document.getElementById('taskLocation') as HTMLInputElement;
        const elWorkOrder = document.getElementById('workOrder') as HTMLInputElement;
        const elComments = document.getElementById('comments') as HTMLTextAreaElement;

        const userName = DOMPurify.sanitize(elUserName.value);
        const location = DOMPurify.sanitize(elLocation.value);
        
        if (!userName || !location) return UI.showToast("Vul naam en locatie in!");
        
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

        // BEREKEN GELDIGHEID
        const validUntilDate = new Date(new Date().getTime() + 4*60*60*1000);

        const report: LMRAReport = {
            report_id: crypto.randomUUID(),
            monteur_naam: userName,
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

    /* --- ARCHIEF MET STATUS --- */
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
                div.className = `p-3 mb-2 bg-white dark:bg-slate-800 rounded border-l-4 ${borderColor} hover:bg-slate-50 transition-colors cursor-default`;
                div.innerHTML = `
                    <div class="flex justify-between items-start mb-1">
                        <span class="font-bold text-slate-700 dark:text-slate-200 text-sm truncate w-2/3">${h.locatie}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                            <span class="text-[10px] text-slate-500 uppercase font-bold">${statusText}</span>
                        </div>
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                        ${new Date(h.created_at).toLocaleString()} - ${h.monteur_naam}<br>
                        WO: ${h.werkorder}
                    </div>
                `;
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

        // Gratis iconen
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

        log.innerHTML = `
            <strong>STATUS: ${statusText}</strong><br>
            ---------------------------<br>
            Datum: ${new Date().toLocaleString()}<br>
            Monteur: ${report.monteur_naam}<br>
            Locatie: ${report.locatie}<br>
            WO: ${report.werkorder}<br>
            ---------------------------<br>
            ${isSafe ? '✅ Geen afkeurpunten' : '⚠️ <strong>AFKEURPUNTEN:</strong><br>' + JSON.parse(report.afkeurpunten).join('<br>')}
        `;
    },

    resetForm(): void {
        if(!confirm("Formulier wissen?")) return;
        state.answers = {};
        state.actions = {};
        (document.getElementById('taskLocation') as HTMLInputElement).value = '';
        (document.getElementById('workOrder') as HTMLInputElement).value = '';
        (document.getElementById('comments') as HTMLInputElement).value = '';
        UI.renderCategories(categories, 'questions-container', 
            (id, val) => this.handleAnswer(id, val), 
            (id, txt) => this.handleAction(id, txt)
        );
        this.setDefaultTimes();
    },

    checkChangelog(): void {
        const storedVersion = localStorage.getItem('lmra_version');
        if (storedVersion !== APP_VERSION) {
            UI.toggleElement('updateModal', true);
            const btn = document.getElementById('btnCloseUpdateModal');
            if(btn) btn.onclick = () => {
                localStorage.setItem('lmra_version', APP_VERSION);
                UI.toggleElement('updateModal', false);
            };
        }
    },

    toggleTheme(): void {
        document.documentElement.classList.toggle('dark');
    }
};