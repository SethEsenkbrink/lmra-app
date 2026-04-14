/* src/app.ts - v9.8.5 (Updated: Status Indicator & Version Fix) */
import { UI } from './ui';
import { Database, LMRAReport, supabase } from './database';
import { SecureStorage } from './security';
import { HISTORY_KEY, APP_VERSION } from './config';
import * as DOMPurify from 'dompurify';

// ... rest van de imports ...
import { PDFService } from './services/pdf';
import { AuthService } from './services/auth';
import { CloudAuthService } from './services/cloud-auth';
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
        console.log(`LMRA Pro v${APP_VERSION} Init...`);
        this.attachEventListeners();
        this.checkChangelog();
        this.updateConnectionStatus(); // <--- NIEUW: Check direct bij start

        if (supabase) {
            supabase.auth.onAuthStateChange(async (event) => {
                this.updateConnectionStatus(); // <--- NIEUW: Update bij login/logout
                
                if (event === 'PASSWORD_RECOVERY') {
                    console.log("🔓 Wachtwoord herstel modus geactiveerd!");
                    UI.toggleElement('cloudLoginModal', false);
                    UI.toggleElement('pinModal', false);
                    CloudAuthService.handlePasswordReset();
                }
            });
        }

        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            console.log("⏳ Recovery link gedetecteerd. Wachten op Supabase event...");
            UI.showToast("Wachtwoord herstel laden...");
            return; 
        }

        if (hash && hash.includes('error_code=otp_expired')) {
            UI.showToast("⚠️ Link is verlopen. Vraag een nieuwe aan.");
            window.location.hash = ''; 
        }

        const isCloudAuthenticated = await CloudAuthService.checkSession();

        if (isCloudAuthenticated) {
            this.startLocalSecurity(); 
        } else {
            CloudAuthService.showLogin(() => {
                this.startLocalSecurity();
                this.updateConnectionStatus(); // <--- NIEUW: Update na inloggen
            });
        }
        
        window.addEventListener('online', () => {
            this.updateConnectionStatus(); // <--- NIEUW: Update bij herstel
            UI.showToast("Verbinding hersteld. Synchroniseren...");
            Database.processSyncQueue().then(res => {
                if(res.processed > 0) UI.showToast(`✅ ${res.processed} rapporten verzonden!`);
            });
        });

        // <--- NIEUW: Listener voor offline gaan
        window.addEventListener('offline', () => {
            this.updateConnectionStatus();
            UI.showToast("⚠️ Geen internetverbinding. Offline modus.");
        });
    },

    // --- NIEUW: Status Indicator Logica ---
    // Deze functie controleert internet + database rechten en toont dit in de header
    async updateConnectionStatus(): Promise<void> {
        const el = document.getElementById('cloudStatus');
        if (!el) return;

        // Reset classes
        el.classList.remove('hidden', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'text-white');
        
        // 1. Check Internet
        if (!navigator.onLine) {
            el.className = "text-[10px] font-bold px-2 py-1 bg-red-500 text-white rounded flex items-center gap-1 shadow-sm";
            el.innerHTML = '<i class="fa-solid fa-wifi"></i> Offline';
            return;
        }

        // 2. Check Client
        if (!supabase) {
            el.className = "text-[10px] font-bold px-2 py-1 bg-slate-500 text-white rounded flex items-center gap-1 shadow-sm";
            el.innerHTML = '<i class="fa-solid fa-server"></i> Lokale Opslag';
            return;
        }

        // 3. Check Auth (Rechten)
        try {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                el.className = "text-[10px] font-bold px-2 py-1 bg-green-500 text-white rounded flex items-center gap-1 shadow-sm";
                el.innerHTML = '<i class="fa-solid fa-cloud"></i> Verbonden';
            } else {
                el.className = "text-[10px] font-bold px-2 py-1 bg-yellow-500 text-white rounded flex items-center gap-1 shadow-sm";
                el.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Niet Ingelogd';
            }
        } catch (e) {
            el.className = "text-[10px] font-bold px-2 py-1 bg-yellow-500 text-white rounded flex items-center gap-1 shadow-sm";
            el.innerHTML = '<i class="fa-solid fa-cloud-slash"></i> Cloud Fout';
        }
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
        
        // --- NIEUWE MENU EVENT LISTENERS ---
        document.getElementById('btnOpenMenu')?.addEventListener('click', () => UI.toggleElement('menuModal', true));
        document.getElementById('btnCloseMenu')?.addEventListener('click', () => UI.toggleElement('menuModal', false));
        document.getElementById('btnShowUpdates')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false); // Sluit menu eerst netjes
            this.forceShowChangelog(); // Open de update modal handmatig
        });

        // Bestaande reset functionaliteit, nu met toevoeging dat eventueel het menu sluit
        document.getElementById('btnResetApp')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            this.resetForm(true);
        });
        
        document.getElementById('btnToggleTheme')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            this.toggleTheme();
        });
        
        // NIEUW: Navigeer bewust terug naar de landingspagina voor info
        document.getElementById('btnBackToInfo')?.addEventListener('click', () => {
            window.location.href = '/?info=true';
        });
        
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
        
        // AANGEPAST: Bij annuleren updaten we nu eerst de historie
        document.getElementById('btnCancelResume')?.addEventListener('click', async () => {
            await this.expireLastSessionInHistory();
            SessionService.cancelResume(() => this.resetForm(false));
        });

        document.getElementById('buddyToggle')?.addEventListener('change', (e) => {
            UI.toggleBuddyField((e.target as HTMLInputElement).checked);
        });
    },

    async handleSubmit(): Promise<void> {
        const sanitizer = (DOMPurify as any).default?.sanitize || (DOMPurify as any).sanitize;
        const honeypot = document.getElementById('contact_email') as HTMLInputElement;
        if (honeypot && honeypot.value !== "") return;

        // 1. EERST ALLE ELEMENTEN OPHALEN (Declaraties)
        const elUserName = document.getElementById('userName') as HTMLInputElement;
        const elLocation = document.getElementById('taskLocation') as HTMLInputElement;
        const elWorkOrder = document.getElementById('workOrder') as HTMLInputElement;
        const elComments = document.getElementById('comments') as HTMLTextAreaElement;
        
        const elBuddyToggle = document.getElementById('buddyToggle') as HTMLInputElement;
        const elBuddyName = document.getElementById('buddyName') as HTMLInputElement;     
        const elBuddySig = document.getElementById('buddySignature') as HTMLInputElement; 
        const elDeclaration = document.getElementById('declarationCheck') as HTMLInputElement; // Nieuw toegevoegd
        
        // NIEUW: Haal de opgegeven eindtijd op
        const elTimeEnd = document.getElementById('timeEnd') as HTMLInputElement;

        // 2. DAARNA PAS GEBRUIKEN (Logica)
        const userName = elUserName ? sanitizer(elUserName.value) : "";
        const location = elLocation ? sanitizer(elLocation.value) : "";
        
        if (!userName || !location) return UI.showToast("Vul naam en locatie in!");

        // Check: Eigen verklaring
        if (elDeclaration && !elDeclaration.checked) {
            return UI.showToast("⚠️ Je moet verklaren dat je de LMRA naar waarheid hebt ingevuld.");
        }
        
        // Check: Buddy logica
        if (elBuddyToggle && elBuddyToggle.checked) {
            const buddyName = elBuddyName ? sanitizer(elBuddyName.value) : "";
            
            if (!buddyName) return UI.showToast("Naam van buddy is verplicht!");
            if (elBuddySig && !elBuddySig.checked) return UI.showToast("⚠️ Buddy moet de verklaring aanvinken!");
        }
        
        if (!FormService.validate()) return;

        UI.setLoading('submitBtn', true);

        const { isSafe, failedPoints } = FormService.getReportData();

        // Dynamische tijdsberekening gebaseerd op input timeEnd
        const now = new Date();
        let validUntilDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Standaard 4 uur fallback

        if (elTimeEnd && elTimeEnd.value) {
            const [endHours, endMinutes] = elTimeEnd.value.split(':').map(Number);
            validUntilDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHours, endMinutes, 0);
            
            // Als de gekozen eindtijd vóór het huidige moment ligt, is de shift over middernacht gegaan
            if (validUntilDate < now) {
                validUntilDate.setDate(validUntilDate.getDate() + 1);
            }
        }

        const buddyInfo = (elBuddyToggle && elBuddyToggle.checked) ? ` (Buddy: ${sanitizer(elBuddyName.value)})` : "";
        const report: LMRAReport = {
            report_id: (typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            monteur_naam: userName + buddyInfo,
            locatie: location,
            werkorder: elWorkOrder ? (sanitizer(elWorkOrder.value) || 'N.v.t.') : 'N.v.t.',
            is_veilig: isSafe,
            opmerkingen: elComments ? sanitizer(elComments.value) : "",
            afkeurpunten: JSON.stringify(failedPoints),
            created_at: now.toISOString(),
            valid_until: validUntilDate.toISOString() // Nu dynamisch!
        };

        try {
            await this.saveToHistory(report);
            const result = await Database.submitReport(report);

            if (isSafe) {
                // Geef de berekende tijd correct door aan sessie start
                await SessionService.startSession(userName, location, report.werkorder, report.report_id, report.valid_until);
            }

            UI.setLoading('submitBtn', false, "Beoordeel Veiligheid");
            this.showResult(isSafe, report, result.status);
        } catch (error) {
            console.error("Fout bij verzenden rapport:", error);
            UI.setLoading('submitBtn', false, "Beoordeel Veiligheid");
            UI.showToast("❌ Er ging iets mis bij het verzenden.");
        }
    },

    async saveToHistory(report: LMRAReport): Promise<void> {
        let history = await SecureStorage.get(HISTORY_KEY) as LMRAReport[] || [];
        history.unshift(report);
        if (history.length > 50) history.pop();
        await SecureStorage.set(HISTORY_KEY, history);
    },

    // ... de rest van de functies blijft ongewijzigd ...
    // NIEUWE FUNCTIE: Deze zorgt dat de laatste LMRA als 'verlopen' wordt gemarkeerd in de historie
    async expireLastSessionInHistory(): Promise<void> {
        try {
            let history = await SecureStorage.get(HISTORY_KEY) as LMRAReport[] || [];
            
            // Als er geen historie is, kunnen we niks updaten
            if (history.length === 0) return;

            // We pakken de meest recente (index 0)
            const lastReport = history[0];

            // Alleen updaten als hij Veilig was (want onveilige zijn sws al rood/afgekeurd)
            // En check of de valid_until in de toekomst ligt, zo ja: zet hem op NU.
            const now = new Date();
            const validUntil = new Date(lastReport.valid_until);

            if (lastReport.is_veilig && validUntil > now) {
                lastReport.valid_until = now.toISOString(); // Zet geldigheidsdatum naar nu (dus verlopen)
                
                // Opslaan in beveiligde opslag
                // De array is 'by reference' aangepast, dus we slaan de hele array opnieuw op
                await SecureStorage.set(HISTORY_KEY, history);
                
                UI.showToast("📁 Dossier bijgewerkt: Werkzaamheden beëindigd.");
            }
        } catch (e) {
            console.error("Kon historie niet bijwerken bij stoppen sessie", e);
        }
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
                        statusText = 'Verlopen / Gestopt'; // Tekst iets aangepast voor duidelijkheid
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
        else if (syncStatus === 'cloud_duplicate') statusText = "☁️ Reeds opgeslagen in Cloud";
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

        const afkeurPoints = JSON.parse(report.afkeurpunten || "[]");
        log.innerHTML = `<strong>STATUS: ${statusText}</strong><br>---------------------------<br>Datum: ${new Date().toLocaleString()}<br>Monteur: ${report.monteur_naam}<br>Locatie: ${report.locatie}<br>WO: ${report.werkorder}<br>---------------------------<br>${isSafe ? '✅ Geen afkeurpunten' : '⚠️ <strong>AFKEURPUNTEN:</strong><br>' + afkeurPoints.join('<br>')}`;
    },

    resetForm(askConfirm: boolean): void {
        if(askConfirm && !confirm("Formulier wissen?")) return;
        
        FormService.reset();
        
        const loc = document.getElementById('taskLocation') as HTMLInputElement;
        const wo = document.getElementById('workOrder') as HTMLInputElement;
        const comm = document.getElementById('comments') as HTMLInputElement;
        
        if(loc) loc.value = '';
        if(wo) wo.value = '';
        if(comm) comm.value = '';
        
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
};;