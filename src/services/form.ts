/* src/services/form.ts */
import { UI } from '../ui';
import { categories } from '../data';
import * as DOMPurify from 'dompurify';

interface FormState {
    answers: Record<number, string>;
    actions: Record<number, string>;
}

export const FormService = {
    state: {
        answers: {},
        actions: {}
    } as FormState,

    init(containerId: string): void {
        this.render(containerId);
    },

    render(containerId: string): void {
        UI.renderCategories(categories, containerId, 
            (id, val) => this.handleAnswer(id, val), 
            (id, txt) => this.handleAction(id, txt)
        );
    },

    handleAnswer(id: number, value: string): void {
        this.state.answers[id] = value;
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
            delete this.state.actions[id];
        } else {
            btnNo.className = baseClass + "bg-red-600 text-white shadow-md";
            actionBox.classList.remove('hidden');
        }
    },

    handleAction(id: number, text: string): void {
        const sanitizer = (DOMPurify as any).default?.sanitize || (DOMPurify as any).sanitize;
        this.state.actions[id] = sanitizer(text);
    },

    validate(): boolean {
        const totalQ = categories.reduce((acc, cat) => acc + cat.questions.length, 0);
        if (Object.keys(this.state.answers).length < totalQ) {
            UI.showToast("Beantwoord alle vragen!");
            return false;
        }

        for (const [id, val] of Object.entries(this.state.answers)) {
            const numericId = parseInt(id);
            if (val === 'no' && (!this.state.actions[numericId] || this.state.actions[numericId].trim() === '')) {
                UI.showToast("Vul actie in bij elk 'NEE' antwoord!");
                return false;
            }
        }
        return true;
    },

    getReportData(): { isSafe: boolean, failedPoints: string[] } {
        let isSafe = true;
        const failedPoints: string[] = [];
        
        categories.forEach(cat => {
            cat.questions.forEach(q => {
                if (this.state.answers[q.id] === 'no') {
                    isSafe = false;
                    failedPoints.push(`${q.text} (Actie: ${this.state.actions[q.id] || 'Geen'})`);
                }
            });
        });

        return { isSafe, failedPoints };
    },

    reset(): void {
        this.state.answers = {};
        this.state.actions = {};
        // UI reset gebeurt via de render call in App.ts
    }
};