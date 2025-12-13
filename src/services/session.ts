/* src/services/session.ts */
import { UI } from '../ui';
import { SecureStorage } from '../security';
import { ACTIVE_SESSION_KEY } from '../config';

interface StoredSession {
    date: string;
    name: string;
    task: string;
    wo: string;
}

export const SessionService = {
    timerInterval: null as number | null,

    setDefaultTimes(): void {
        const now = new Date();
        const end = new Date(now.getTime() + 4*60*60*1000); 
        
        const elStart = document.getElementById('timeStart') as HTMLInputElement;
        const elEnd = document.getElementById('timeEnd') as HTMLInputElement;
        
        // AANGEPAST: We overschrijven altijd de waarde, zodat bij een stop/reset de tijd actueel is.
        // Oude code had: if(elStart && !elStart.value) ...
        if(elStart) elStart.value = now.toTimeString().slice(0,5);
        if(elEnd) elEnd.value = end.toTimeString().slice(0,5);
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
            if (session.date === new Date().toDateString()) {
                // Herstel formulier data
                const uName = document.getElementById('userName') as HTMLInputElement; 
                const tLoc = document.getElementById('taskLocation') as HTMLInputElement; 
                const wOrd = document.getElementById('workOrder') as HTMLInputElement;
                if(uName) uName.value = session.name || '';
                if(tLoc) tLoc.value = session.task || '';
                if(wOrd) wOrd.value = session.wo || '';
                
                this.activateLockedSession(new Date(validUntilStr));
            } else {
                this.cancelResume(onReset);
            }
        } else {
            UI.toggleElement('resumeBar', false);
            this.toggleFormLock(false);
            this.setDefaultTimes();
        }
    },

    activateLockedSession(validUntil: Date): void {
        this.toggleFormLock(true); 
        UI.toggleElement('resumeBar', true); 
        UI.toggleElement('submitBtn', false); 
        
        if(this.timerInterval) clearInterval(this.timerInterval);
        
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
                if(infoEl) infoEl.innerText = `Geldig tot ${validUntil.toLocaleTimeString().slice(0,5)}`;
                
                if(btnExtend) btnExtend.classList.add('hidden');
                UI.toggleElement('pauseAlert', false);
            }
        };

        updateTimer();
        // @ts-ignore
        this.timerInterval = setInterval(updateTimer, 1000);
    },

    confirmResume(): void {
        const newEnd = new Date(Date.now() + 4*60*60*1000);
        SecureStorage.set('lmra_valid_until', newEnd.toISOString()).then(() => {
            UI.showToast("✅ Werkzaamheden verlengd (+4 uur)");
            this.activateLockedSession(newEnd);
        });
    },

    cancelResume(onReset: () => void): void {
        if(this.timerInterval) clearInterval(this.timerInterval);
        SecureStorage.remove(ACTIVE_SESSION_KEY);
        SecureStorage.remove('lmra_valid_until');
        
        UI.toggleElement('resumeBar', false);
        UI.toggleElement('pauseAlert', false);
        UI.toggleElement('submitBtn', true);
        
        this.toggleFormLock(false);
        onReset();
    },

    async startSession(name: string, location: string, wo: string): Promise<void> {
        const validUntil = new Date(Date.now() + 4*60*60*1000);
        
        await SecureStorage.set(ACTIVE_SESSION_KEY, { 
            date: new Date().toDateString(), 
            name: name, 
            task: location, 
            wo: wo 
        });
        await SecureStorage.set('lmra_valid_until', validUntil.toISOString());
        
        this.activateLockedSession(validUntil);
    }
};