/* src/services/session.ts */
import { UI } from '../ui';
import { SecureStorage } from '../security';
import { ACTIVE_SESSION_KEY, HISTORY_KEY } from '../config'; // HISTORY_KEY toegevoegd
import { LMRAReport } from '../database'; // Type import toegevoegd

interface StoredSession {
    date: string;
    name: string;
    task: string;
    wo: string;
    reportId?: string; // NIEUW: We moeten weten welk rapport bij deze sessie hoort
}

// FIX: Throttling voorkomen door update af te dwingen als de app weer in beeld komt
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && SessionService.timerInterval) {
        const validUntilStr = await SecureStorage.get('lmra_valid_until') as string;
        if (validUntilStr) SessionService.activateLockedSession(new Date(validUntilStr));
    }
});

export const SessionService = {
    timerInterval: null as number | null,
    currentReportId: null as string | null, // NIEUW: Lokale state

    setDefaultTimes(): void {
        const now = new Date();
        const end = new Date(now.getTime() + 4*60*60*1000); 
        
        const elStart = document.getElementById('timeStart') as HTMLInputElement;
        const elEnd = document.getElementById('timeEnd') as HTMLInputElement;
        
        // FIX: Hard afgedwongen Nederlandse 24-uursnotatie (HH:MM) voor de tijdsvelden
        if(elStart) elStart.value = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        if(elEnd) elEnd.value = end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    },

    toggleFormLock(locked: boolean): void {
        const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('#userName, #taskLocation, #workOrder, #comments, #timeStart, #timeEnd, #buddyToggle, #buddyName, #declarationCheck');
        elements.forEach(el => el.disabled = locked);
        const buttons = document.querySelectorAll('.question-card button') as NodeListOf<HTMLButtonElement>;
        buttons.forEach(btn => btn.disabled = locked);
    },

    async checkResumeState(onReset: () => void): Promise<void> {
        const session = await SecureStorage.get(ACTIVE_SESSION_KEY) as StoredSession | null;
        const validUntilStr = await SecureStorage.get('lmra_valid_until') as string | null;
        
        if (session && validUntilStr) {
            const validUntil = new Date(validUntilStr);
            const now = new Date();

            // FIX: Geen dag string vergelijken meer (Voorkomt de Midnight bug). Check uitsluitend of eindtijd > nu is.
            if (validUntil > now) {
                const uName = document.getElementById('userName') as HTMLInputElement; 
                const tLoc = document.getElementById('taskLocation') as HTMLInputElement; 
                const wOrd = document.getElementById('workOrder') as HTMLInputElement;
                
                if(uName) uName.value = session.name || '';
                if(tLoc) tLoc.value = session.task || '';
                if(wOrd) wOrd.value = session.wo || '';
                
                // NIEUW: Herstel het ID
                if(session.reportId) SessionService.currentReportId = session.reportId;

                SessionService.activateLockedSession(validUntil);
            } else {
                SessionService.cancelResume(onReset);
            }
        } else {
            UI.toggleElement('resumeBar', false);
            SessionService.toggleFormLock(false);
            SessionService.setDefaultTimes();
        }
    },

    activateLockedSession(validUntil: Date): void {
        SessionService.toggleFormLock(true); 
        UI.toggleElement('resumeBar', true); 
        UI.toggleElement('submitBtn', false); 
        
        // Browser-safe opruimen van het oude interval
        if(SessionService.timerInterval) window.clearInterval(SessionService.timerInterval);
        
        const updateTimer = () => {
            const now = new Date();
            const diff = validUntil.getTime() - now.getTime();
            
            const displayEl = document.getElementById('timerDisplay');
            const infoEl = document.getElementById('sessionInfoText');
            const btnExtend = document.getElementById('btnTriggerResume');

            if(diff <= 0) {
                if(displayEl) {
                    displayEl.innerText = "00:00:00";
                    displayEl.classList.add('text-red-600');
                }
                if(infoEl) infoEl.innerText = "Geldigheid verlopen!";
                if(btnExtend) btnExtend.classList.remove('hidden');
                UI.toggleElement('pauseAlert', true);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                if(displayEl) {
                    displayEl.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    displayEl.classList.remove('text-red-600');
                }
                
                // FIX: Hard afgedwongen Nederlandse 24-uursnotatie (HH:MM) voor de bar tekst
                const formattedTime = validUntil.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                if(infoEl) infoEl.innerText = `Geldig tot ${formattedTime}`;
                
                if(btnExtend) btnExtend.classList.add('hidden');
                UI.toggleElement('pauseAlert', false);
            }
        };

        updateTimer();
        // FIX: window context expliciet meegegeven om @ts-ignore te verwijderen
        SessionService.timerInterval = window.setInterval(updateTimer, 1000);
    },

    // NIEUW: Deze functie update nu ook de historie en verlengt met 2 uur ipv 4
    async confirmResume(): Promise<void> {
        const newEnd = new Date(Date.now() + 2*60*60*1000); // 2 uur verlenging voor een vlottere flow
        
        // 1. Update Sessie Validatie
        await SecureStorage.set('lmra_valid_until', newEnd.toISOString());

        // 2. Update Historie (De Fix)
        if (SessionService.currentReportId) {
            try {
                const history = await SecureStorage.get(HISTORY_KEY) as LMRAReport[] || [];
                const reportIndex = history.findIndex(r => r.report_id === SessionService.currentReportId);
                
                if (reportIndex !== -1) {
                    // Update de tijd in de historie array
                    history[reportIndex].valid_until = newEnd.toISOString();
                    // Sla de hele array weer beveiligd op
                    await SecureStorage.set(HISTORY_KEY, history);
                    console.log("✅ Historie bijgewerkt met nieuwe eindtijd");
                }
            } catch (e) {
                console.error("Kon historie niet updaten", e);
            }
        }

        UI.showToast("✅ Werkzaamheden verlengd (+2 uur)");
        SessionService.activateLockedSession(newEnd);
    },

    cancelResume(onReset: () => void): void {
        if(SessionService.timerInterval) window.clearInterval(SessionService.timerInterval);
        SecureStorage.remove(ACTIVE_SESSION_KEY);
        SecureStorage.remove('lmra_valid_until');
        
        SessionService.currentReportId = null; // Reset ID

        UI.toggleElement('resumeBar', false);
        UI.toggleElement('pauseAlert', false);
        UI.toggleElement('submitBtn', true);
        
        SessionService.toggleFormLock(false);
        onReset();
    },

    // AANGEPAST: Accepteert nu ook de berekende validUntil string van de input
    async startSession(name: string, location: string, wo: string, reportId: string, validUntilStr: string): Promise<void> {
        const validUntil = new Date(validUntilStr);
        SessionService.currentReportId = reportId;
        
        await SecureStorage.set(ACTIVE_SESSION_KEY, { 
            // Datum hier is nu puur voor referentie, validatie loopt op de ISO string
            date: new Date().toDateString(), 
            name: name, 
            task: location, 
            wo: wo,
            reportId: reportId // Opslaan
        });
        await SecureStorage.set('lmra_valid_until', validUntil.toISOString());
        
        SessionService.activateLockedSession(validUntil);
    }
};