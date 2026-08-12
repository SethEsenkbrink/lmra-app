/* src/app.ts - LMRA Pro Open PWA Engine */
import { UI } from './ui';
import { Database, LMRAReport } from './database';
import { Settings } from './settings';
import { Backup } from './backup';
import { TASK_TEMPLATES, getTemplate } from './data';
import { APP_VERSION } from './config';
import DOMPurify from 'dompurify';

import { SessionService } from './services/session';
import { FormService } from './services/form';
import { RELEASE_INFO } from './release';
import { initCookieAndPwaManager, showCookiePreferences } from './cookie-pwa-manager';
import { Diagnostics } from './diagnostics';
import { SignatureManager } from './signature-manager';
import { ProfileManager } from './profile-manager';
import { PhotoManager } from './photo-manager';
import { VoiceDictation } from './voice-dictation';
import { GPSWeather } from './gps-weather';
import { QRScanner } from './qr-scanner';
import { I18n } from './i18n';

interface AppState {
    viewingReport: LMRAReport | null;
}

const state: AppState = {
    viewingReport: null
};

/**
 * jsPDF is met afstand de zwaarste afhankelijkheid. Die wordt daarom pas geladen
 * wanneer er echt een PDF gemaakt wordt (dynamische import = eigen chunk).
 * Zie prefetchHeavyModules(): de chunk wordt na het opstarten alvast opgehaald,
 * zodat de service worker hem cachet en offline genereren blijft werken.
 */
async function loadPdfService() {
    const module = await import('./services/pdf');
    return module.PDFService;
}

export const App = {
    async init(): Promise<void> {
        // Diagnostics als eerste: vangt fouten uit alle modules die hierna starten.
        Diagnostics.init();
        console.log(`LMRA Pro v${APP_VERSION} Open PWA Init...`);
        // Voorkeuren (thema, handschoenmodus) vóór de eerste weergave toepassen.
        Settings.init();
        initCookieAndPwaManager(true);
        SignatureManager.init('signatureCanvas', 'btnClearSignature', 'btnUndoSignature');
        PhotoManager.init();
        VoiceDictation.init();
        GPSWeather.init();
        QRScanner.init();
        I18n.init();
        
        this.attachEventListeners();
        this.checkChangelog();
        this.updateConnectionStatus();

        // Check for Profile & Disclaimer
        await ProfileManager.checkAndShowDisclaimerIfNeeded();

        // Taal wijzigen betekent de vragenlijst opnieuw opbouwen.
        I18n.onChange = () => FormService.render();

        // Soort werk: uit de URL (QR-sticker of landingspagina) of de laatste keuze.
        const params = new URLSearchParams(window.location.search);
        const urlTemplate = params.get('template');
        const startTemplate = getTemplate(urlTemplate ?? Settings.current.lastTemplate).id;

        // Formulier direct starten & vragen renderen (Geen inlog-drempel!)
        FormService.init('questions-container', startTemplate);
        this.renderTemplateChips(startTemplate);
        GPSWeather.taskTemplateId = startTemplate;

        // Locatie uit een gescande QR-sticker: /app?loc=E-Motor%20401
        const urlLoc = params.get('loc');
        if (urlLoc) {
            const locInput = document.getElementById('taskLocation') as HTMLInputElement | null;
            if (locInput) {
                locInput.value = urlLoc.slice(0, 50);
                locInput.classList.add('bg-emerald-100', 'dark:bg-emerald-900');
                setTimeout(() => locInput.classList.remove('bg-emerald-100', 'dark:bg-emerald-900'), 1500);
            }
            UI.showToast(`📍 Locatie uit QR-code: ${urlLoc.slice(0, 30)}`);
            Diagnostics.log('info', 'qr', `Locatie via URL ingevuld: ${urlLoc}`);
        } 
        SessionService.checkResumeState(() => this.resetForm(false));

        // Zware modules op de achtergrond binnenhalen zodat ze in de service
        // worker cache staan voordat iemand zonder bereik op PDF drukt.
        this.prefetchHeavyModules();

        window.addEventListener('online', () => {
            this.updateConnectionStatus();
            UI.showToast("Verbinding hersteld.");
            // Toestel startte mogelijk offline: nu alsnog voorladen.
            this.prefetchHeavyModules();
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus();
            UI.showToast("⚠️ Geen internetverbinding. Werkt offline.");
        });
    },

    prefetchDone: false,

    /**
     * Haalt de losse chunks (PDF-generator en QR-scanner) op zodra de browser
     * even niets te doen heeft. Dat houdt de eerste pagina-load licht, terwijl
     * de service worker de chunks alsnog cachet: cruciaal, want een monteur kan
     * later zonder bereik in een kelder op "Download PDF" drukken.
     */
    prefetchHeavyModules(): void {
        if (this.prefetchDone) return;
        if (!navigator.onLine) {
            Diagnostics.log('debug', 'prefetch', 'Offline: voorladen uitgesteld tot er verbinding is');
            return;
        }
        this.prefetchDone = true;

        const run = (): void => {
            void import('./services/pdf')
                .then(() => Diagnostics.log('debug', 'prefetch', 'PDF-module voorgeladen en gecached'))
                .catch((err) => {
                    this.prefetchDone = false;
                    Diagnostics.log('warn', 'prefetch', `PDF-module voorladen mislukt: ${String(err)}`);
                });
            void import('html5-qrcode')
                .then(() => Diagnostics.log('debug', 'prefetch', 'QR-scanner voorgeladen en gecached'))
                .catch((err) => Diagnostics.log('warn', 'prefetch', `QR-scanner voorladen mislukt: ${String(err)}`));
        };

        const idle = (window as any).requestIdleCallback;
        if (typeof idle === 'function') idle(run, { timeout: 5000 });
        else setTimeout(run, 2500);
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
        
        // Profile
        document.getElementById('btnSaveProfile')?.addEventListener('click', () => ProfileManager.saveFromModal());
        document.getElementById('btnCloseProfileModal')?.addEventListener('click', () => UI.toggleElement('profileModal', false));
        document.getElementById('btnOpenProfile')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            ProfileManager.showProfileModal(false);
        });

        // Dictation
        document.getElementById('btnDictateComments')?.addEventListener('click', () => {
            VoiceDictation.toggleDictation('comments', 'btnDictateComments');
        });

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

        // Soort werk kiezen
        document.getElementById('templateChips')?.addEventListener('click', (e) => {
            const chip = (e.target as HTMLElement).closest('[data-template]') as HTMLElement | null;
            if (chip?.dataset.template) this.setTemplate(chip.dataset.template);
        });

        // Handschoenmodus
        document.getElementById('btnGloveMode')?.addEventListener('click', () => {
            const on = Settings.toggleGloveMode();
            UI.showToast(on ? '🧤 Handschoenmodus aan: grotere knoppen' : 'Handschoenmodus uit');
        });

        // Back-up & herstel
        document.getElementById('btnBackupExport')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            void Backup.exportAll();
        });
        document.getElementById('btnBackupImport')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            Backup.openImportDialog();
        });
        document.getElementById('backupFileInput')?.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            const file = input.files?.[0];
            if (file) void Backup.importFromFile(file).then(() => this.openArchive());
        });

        // QR-stickers maken (module wordt pas geladen bij gebruik)
        document.getElementById('btnOpenQrGen')?.addEventListener('click', async () => {
            UI.toggleElement('menuModal', false);
            try {
                const { QRGenerator } = await import('./qr-generator');
                QRGenerator.bind();
                QRGenerator.open();
            } catch (err) {
                Diagnostics.log('error', 'qr', `Sticker-module laden mislukt: ${String(err)}`);
                UI.showToast('❌ Onderdeel niet beschikbaar. Ga even online en probeer opnieuw.');
            }
        });

        document.getElementById('btnCookieSettings')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            showCookiePreferences();
        });

        document.getElementById('btnOpenDiagnostics')?.addEventListener('click', () => {
            UI.toggleElement('menuModal', false);
            Diagnostics.open();
        });
        
        document.getElementById('btnOpenArchive')?.addEventListener('click', () => this.openArchive());
        document.getElementById('btnCloseArchive')?.addEventListener('click', () => UI.toggleElement('archiveModal', false));
        document.getElementById('btnClearArchive')?.addEventListener('click', () => this.clearArchive());
        document.getElementById('btnGeneratePDF')?.addEventListener('click', async () => {
            UI.setLoading('btnGeneratePDF', true, 'Genereren...');
            try {
                const service = await loadPdfService();
                await service.generate(state.viewingReport);
            } catch (err) {
                Diagnostics.log('error', 'pdf', `PDF-module kon niet worden geladen: ${String(err)}`);
                UI.showToast('❌ PDF-onderdeel niet beschikbaar. Ga even online en probeer opnieuw.');
                UI.setLoading('btnGeneratePDF', false, 'Download PDF');
            }
        });

        document.getElementById('btnCloseModal')?.addEventListener('click', () => {
            UI.toggleElement('resultModal', false);
            SessionService.checkResumeState(() => {});
        });
        document.getElementById('btnCloseDetail')?.addEventListener('click', () => UI.toggleElement('detailModal', false));
        document.getElementById('btnDuplicateReport')?.addEventListener('click', () => {
            if (state.viewingReport) {
                this.duplicateReport(state.viewingReport);
            }
        });
        
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
            template: FormService.templateId,
            template_label: getTemplate(FormService.templateId).label,
            is_veilig: isSafe,
            opmerkingen: elComments ? sanitizer(elComments.value.trim()) : "",
            afkeurpunten: JSON.stringify(failedPoints),
            handtekening: SignatureManager.getBase64(),
            foto_bewijs: PhotoManager.getPhotos(),
            weer_info: GPSWeather.currentWeather,
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

        
        const dDate = document.getElementById('detailDate');
        const dTimeRange = document.getElementById('detailTimeRange');
        const dStatusBox = document.getElementById('detailStatusBox');
        
        const dCompany = document.getElementById('detailCompany');
        const dName = document.getElementById('detailName');
        const dLoc = document.getElementById('detailLoc');
        const dWO = document.getElementById('detailWO');
        const dBuddyBox = document.getElementById('detailBuddyBox');
        const dBuddy = document.getElementById('detailBuddy');
        
        const dFailsContainer = document.getElementById('detailFailsContainer');
        const dFails = document.getElementById('detailFails');
        const dComments = document.getElementById('detailComments');
        
        if(dDate) dDate.innerText = new Date(report.created_at).toLocaleDateString('nl-NL');
        if(dTimeRange) {
            const start = new Date(report.created_at).toLocaleTimeString('nl-NL').slice(0,5);
            const end = report.valid_until ? new Date(report.valid_until).toLocaleTimeString('nl-NL').slice(0,5) : '??:??';
            dTimeRange.innerText = `${start} - ${end}`;
        }
        
        if (dStatusBox) {
            if (report.is_veilig) {
                dStatusBox.className = "mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3";
                dStatusBox.innerHTML = '<i class="fa-solid fa-shield-halved text-2xl text-emerald-600 dark:text-emerald-400"></i><div><h4 class="font-bold text-emerald-800 dark:text-emerald-400 uppercase text-sm tracking-wide">Goedgekeurd</h4><p class="text-xs text-emerald-600 dark:text-emerald-500">Veilig gewerkt</p></div>';
            } else {
                dStatusBox.className = "mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3";
                dStatusBox.innerHTML = '<i class="fa-solid fa-hand text-2xl text-red-600 dark:text-red-400"></i><div><h4 class="font-bold text-red-800 dark:text-red-400 uppercase text-sm tracking-wide">Afgekeurd</h4><p class="text-xs text-red-600 dark:text-red-500">Risico\'s gedetecteerd</p></div>';
            }
        }
        
        if(dCompany) dCompany.innerText = report.bedrijf_naam || 'Niet opgegeven';
        if(dName) {
            const n = report.monteur_naam;
            if (n.includes('(Buddy:')) {
                const parts = n.split('(Buddy:');
                dName.innerText = parts[0].trim();
                if(dBuddyBox && dBuddy) {
                    dBuddyBox.classList.remove('hidden');
                    dBuddy.innerText = parts[1].replace(')', '').trim();
                }
            } else {
                dName.innerText = n;
                if(dBuddyBox) dBuddyBox.classList.add('hidden');
            }
        }
        if(dLoc) dLoc.innerText = report.locatie;
        if(dWO) dWO.innerText = report.werkorder;
        
        const afkeur = JSON.parse(report.afkeurpunten || "[]");
        if(dFailsContainer && dFails) {
            if (afkeur.length > 0) {
                dFailsContainer.classList.remove('hidden');
                dFails.innerHTML = afkeur.map((a: string) => `<li>${a}</li>`).join('');
            } else {
                dFailsContainer.classList.add('hidden');
                dFails.innerHTML = '';
            }
        }
        
        if(dComments) {
            dComments.innerText = report.opmerkingen || 'Geen opmerkingen';
        }
        
        UI.toggleElement('detailModal', true);
    },

    duplicateReport(report: LMRAReport): void {
        UI.toggleElement('detailModal', false);
        UI.toggleElement('archiveModal', false);
        
        const loc = document.getElementById('taskLocation') as HTMLInputElement;
        const wo = document.getElementById('workOrder') as HTMLInputElement;
        const comp = document.getElementById('companyName') as HTMLInputElement;
        
        if (loc) loc.value = report.locatie;
        if (wo) wo.value = report.werkorder !== 'N.v.t.' ? report.werkorder : '';
        if (comp) comp.value = report.bedrijf_naam;
        
        UI.showToast("📄 Rapportgegevens overgenomen. U kunt nu opnieuw keuren.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        
        SignatureManager.clear();
        PhotoManager.clear();
        GPSWeather.clear();

        document.getElementById('buddyContainer')?.classList.add('hidden');
        document.getElementById('declarationCheckContainer')?.classList.add('hidden');
        
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
        const theme = Settings.toggleTheme();
        // Handtekening opnieuw tekenen zodat de inktkleur bij het thema past.
        SignatureManager.updateThemeColor();
        UI.showToast(theme === 'dark' ? '🌙 Donker thema' : '☀️ Licht thema');
    },

    /** Chips bovenaan het formulier om het soort werk te kiezen. */
    renderTemplateChips(activeId: string): void {
        const container = document.getElementById('templateChips');
        if (!container) return;
        container.innerHTML = '';

        TASK_TEMPLATES.forEach((tpl) => {
            const active = tpl.id === activeId;
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.dataset.template = tpl.id;
            chip.className =
                'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ' +
                (active
                    ? 'bg-[#00447c] text-white border-[#00447c] shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700');
            chip.innerHTML = `<i class="fa-solid ${tpl.icon}"></i><span data-i18n="${tpl.key}">${I18n.t(tpl.key)}</span>`;
            container.appendChild(chip);
        });
    },

    setTemplate(id: string): void {
        const tpl = getTemplate(id);
        FormService.setTemplate(tpl.id);
        Settings.setLastTemplate(tpl.id);
        GPSWeather.taskTemplateId = tpl.id;
        this.renderTemplateChips(tpl.id);

        // Weeradvies opnieuw beoordelen voor de nieuwe vragenlijst.
        const weather = GPSWeather.currentWeather;
        if (weather) GPSWeather.applyWeatherWatch(weather.temperature, weather.windspeed);

        const extra = tpl.extra.reduce((acc, cat) => acc + cat.questions.length, 0);
        UI.showToast(extra > 0 ? `${I18n.t(tpl.key)}: ${extra} extra vragen` : I18n.t(tpl.key));
        Diagnostics.log('info', 'form', `Template gewisseld naar ${tpl.id} (+${extra} vragen)`);
    }
};