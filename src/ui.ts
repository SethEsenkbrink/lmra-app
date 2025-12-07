/* src/ui.ts */
import DOMPurify from 'dompurify';
import { Category } from './data';

// Callbacks types
type AnswerCallback = (id: number, value: string) => void;
type ActionCallback = (id: number, text: string) => void;

export const UI = {
    showToast(msg: string): void {
        const t = document.getElementById('toast');
        const m = document.getElementById('toastMsg');
        if(!t || !m) return;
        m.innerText = msg;
        t.style.opacity = '1';
        setTimeout(() => t.style.opacity = '0', 3000);
    },

    toggleElement(id: string, show: boolean): void {
        const el = document.getElementById(id);
        if (el) show ? el.classList.remove('hidden') : el.classList.add('hidden');
    },

    // Nieuwe functie voor Buddy Check
    toggleBuddyField(show: boolean): void {
        const field = document.getElementById('buddyField');
        if (field) {
            if (show) field.classList.remove('hidden');
            else field.classList.add('hidden');
        }
    },

    setLoading(btnId: string, isLoading: boolean, originalText: string = ""): void {
        const btn = document.getElementById(btnId) as HTMLButtonElement | null;
        const txt = document.getElementById(btnId + 'Text');
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            if (txt) txt.innerText = "Verwerken...";
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            if (txt) txt.innerText = originalText;
        }
    },

    renderCategories(categories: Category[], containerId: string, onAnswer: AnswerCallback, onAction: ActionCallback): void {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        categories.forEach(cat => {
            const section = document.createElement('div');
            section.className = "bg-white dark:bg-cardbg rounded-xl shadow-sm overflow-hidden transition-colors";
            
            section.innerHTML = `
                <div class="bg-slate-50 dark:bg-slate-800/50 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <i class="fa-solid ${cat.icon} text-[#00447c] dark:text-blue-400"></i>
                    <span class="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase">${cat.title}</span>
                </div>
            `;

            const qList = document.createElement('div'); 
            qList.className = "p-2";

            cat.questions.forEach(q => {
                const item = document.createElement('div');
                item.className = "question-card p-3 mb-2 last:mb-0 rounded-lg border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors";
                
                const textDiv = document.createElement('div');
                textDiv.className = "text-sm font-medium text-slate-800 dark:text-slate-200 mb-3";
                textDiv.textContent = q.text;
                item.appendChild(textDiv);

                const btnGrid = document.createElement('div');
                btnGrid.className = "grid grid-cols-2 gap-2";
                
                const btnYes = document.createElement('button');
                btnYes.id = `btn-yes-${q.id}`;
                btnYes.className = "py-2.5 rounded-md text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2";
                btnYes.innerHTML = '<i class="fa-solid fa-check"></i> JA';
                btnYes.onclick = () => onAnswer(q.id, 'yes');

                const btnNo = document.createElement('button');
                btnNo.id = `btn-no-${q.id}`;
                btnNo.className = "py-2.5 rounded-md text-sm font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2";
                btnNo.innerHTML = '<i class="fa-solid fa-xmark"></i> NEE';
                btnNo.onclick = () => onAnswer(q.id, 'no');

                btnGrid.appendChild(btnYes);
                btnGrid.appendChild(btnNo);
                item.appendChild(btnGrid);

                const actionBox = document.createElement('div');
                actionBox.id = `action-box-${q.id}`;
                actionBox.className = "hidden mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800";
                
                actionBox.innerHTML = `
                    <label class="block text-[10px] font-bold text-red-700 dark:text-red-400 uppercase mb-1">Verplichte Actie / Maatregel</label>
                    <input type="text" id="action-input-${q.id}" class="w-full bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" placeholder="Wat doe je om dit veilig te maken?">
                `;
                
                const input = actionBox.querySelector('input') as HTMLInputElement;
                input.oninput = (e) => onAction(q.id, DOMPurify.sanitize((e.target as HTMLInputElement).value));

                item.appendChild(actionBox);
                qList.appendChild(item);
            });

            section.appendChild(qList);
            container.appendChild(section);
        });
    }
};