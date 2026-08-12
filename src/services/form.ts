/* src/services/form.ts - Vragenlijst, antwoorden en validatie
 *
 * De actieve taak-template bepaalt welke vragen er staan: de basisvragen plus de
 * extra vragen van bijvoorbeeld "werken op hoogte". Wisselt de monteur van
 * template of van taal, dan wordt de lijst opnieuw opgebouwd zonder dat de al
 * gegeven antwoorden verdwijnen.
 */
import { UI } from '../ui';
import { Category, DEFAULT_TEMPLATE_ID, getCategoriesFor, getTemplate } from '../data';
import DOMPurify from 'dompurify';

interface FormState {
    answers: Record<number, string>;
    actions: Record<number, string>;
}

export const FormService = {
    state: {
        answers: {},
        actions: {},
    } as FormState,

    templateId: DEFAULT_TEMPLATE_ID,
    containerId: 'questions-container',

    init(containerId: string, templateId: string = DEFAULT_TEMPLATE_ID): void {
        this.containerId = containerId;
        this.templateId = templateId;
        this.render(containerId);
    },

    activeCategories(): Category[] {
        return getCategoriesFor(this.templateId);
    },

    activeTemplateLabel(): string {
        return getTemplate(this.templateId).label;
    },

    /** Wisselt van template: antwoorden op vragen die blijven bestaan houden we. */
    setTemplate(templateId: string): void {
        this.templateId = templateId;
        const cats: Category[] = getCategoriesFor(templateId);
        const validIds = new Set<number>(cats.flatMap((c) => c.questions.map((q) => q.id)));
        for (const key of Object.keys(this.state.answers)) {
            if (!validIds.has(Number(key))) delete this.state.answers[Number(key)];
        }
        for (const key of Object.keys(this.state.actions)) {
            if (!validIds.has(Number(key))) delete this.state.actions[Number(key)];
        }
        this.render(this.containerId);
    },

    render(containerId?: string): void {
        const target = containerId ?? this.containerId;
        this.containerId = target;
        UI.renderCategories(
            this.activeCategories(),
            target,
            (id, val) => this.handleAnswer(id, val),
            (id, txt) => this.handleAction(id, txt)
        );
        // Eerder gegeven antwoorden weer zichtbaar maken na een re-render
        // (taalwissel of andere template).
        Object.entries(this.state.answers).forEach(([id, value]) => {
            this.paintAnswer(Number(id), value);
            if (value === 'no') {
                const input = document.getElementById(`action-input-${id}`) as HTMLInputElement | null;
                if (input) input.value = this.state.actions[Number(id)] ?? '';
            }
        });
    },

    handleAnswer(id: number, value: string): void {
        this.state.answers[id] = value;
        this.paintAnswer(id, value);
        if (value === 'yes') delete this.state.actions[id];
    },

    paintAnswer(id: number, value: string): void {
        const btnYes = document.getElementById(`btn-yes-${id}`);
        const btnNo = document.getElementById(`btn-no-${id}`);
        const actionBox = document.getElementById(`action-box-${id}`);
        if (!btnYes || !btnNo || !actionBox) return;

        const baseClass =
            'py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ';
        const inactiveClass = 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400';

        btnYes.className = baseClass + inactiveClass;
        btnNo.className = baseClass + inactiveClass;

        if (value === 'yes') {
            btnYes.className = baseClass + 'bg-green-600 text-white shadow-md';
            actionBox.classList.add('hidden');
        } else if (value === 'no') {
            btnNo.className = baseClass + 'bg-red-600 text-white shadow-md';
            actionBox.classList.remove('hidden');
        }
    },

    handleAction(id: number, text: string): void {
        this.state.actions[id] = DOMPurify.sanitize(text);
    },

    validate(): boolean {
        const totalQ = this.activeCategories().reduce((acc, cat) => acc + cat.questions.length, 0);
        if (Object.keys(this.state.answers).length < totalQ) {
            UI.showToast('Beantwoord alle vragen!');
            return false;
        }

        for (const [id, val] of Object.entries(this.state.answers)) {
            const numericId = parseInt(id, 10);
            if (val === 'no' && (!this.state.actions[numericId] || this.state.actions[numericId].trim() === '')) {
                UI.showToast("Vul actie in bij elk 'NEE' antwoord!");
                return false;
            }
        }
        return true;
    },

    getReportData(): { isSafe: boolean; failedPoints: string[] } {
        let isSafe = true;
        const failedPoints: string[] = [];

        this.activeCategories().forEach((cat) => {
            cat.questions.forEach((q) => {
                if (this.state.answers[q.id] === 'no') {
                    isSafe = false;
                    // Nederlandse brontekst: het rapport is voor de werkgever.
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
    },
};
