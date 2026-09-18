/* src/pbm-manager.ts - Visuele Persoonlijke Beschermingsmiddelen (PBM) Selector */
import { I18n } from './i18n';

export interface PbmItem {
    id: string;
    label: string;
    icon: string;
}

export const PBM_ITEMS: PbmItem[] = [
    { id: 'helm', label: 'Veiligheidshelm', icon: 'fa-helmet-safety' },
    { id: 'bril', label: 'Veiligheidsbril', icon: 'fa-glasses' },
    { id: 'gehoor', label: 'Gehoorbescherming', icon: 'fa-headphones' },
    { id: 'schoenen', label: 'S3 Veiligheidsschoenen', icon: 'fa-shoe-prints' },
    { id: 'handschoenen', label: 'Werkhandschoenen', icon: 'fa-mitten' },
    { id: 'hesje', label: 'Veiligheidshesje', icon: 'fa-vest' },
    { id: 'harnas', label: 'Valbeveiliging / Harnas', icon: 'fa-person-falling' },
    { id: 'adem', label: 'Adembescherming / Gasdetectie', icon: 'fa-mask-ventilator' },
];

export const PbmManager = {
    selected: new Set<string>(['schoenen']), // Standaard S3 schoenen actief

    init(): void {
        const container = document.getElementById('pbmContainer');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.pbm-chip') as HTMLElement | null;
            if (!btn || !btn.dataset.pbm) return;
            const pbmId = btn.dataset.pbm;
            this.toggle(pbmId);
        });

        this.render();
    },

    toggle(id: string): void {
        if (this.selected.has(id)) {
            this.selected.delete(id);
        } else {
            this.selected.add(id);
        }
        this.render();
    },

    getSelected(): string[] {
        return Array.from(this.selected);
    },

    getLabel(id: string): string {
        const key = 'pbm_' + id;
        const translated = I18n.t(key);
        if (translated && translated !== key) return translated;
        const item = PBM_ITEMS.find((p) => p.id === id);
        return item ? item.label : id;
    },

    getSelectedLabels(): string[] {
        return this.getSelected().map((id) => this.getLabel(id));
    },

    setSelected(pbmIds: string[] = []): void {
        this.selected = new Set(pbmIds);
        this.render();
    },

    clear(): void {
        this.selected.clear();
        this.selected.add('schoenen');
        this.render();
    },

    render(): void {
        const container = document.getElementById('pbmContainer');
        if (!container) return;

        const buttons = container.querySelectorAll<HTMLElement>('.pbm-chip');
        buttons.forEach((btn) => {
            const id = btn.dataset.pbm;
            const isSelected = id ? this.selected.has(id) : false;
            const labelSpan = btn.querySelector('.pbm-label') || btn.querySelector('span');

            if (labelSpan && id) {
                labelSpan.textContent = this.getLabel(id);
            }

            if (isSelected) {
                btn.className =
                    'pbm-chip p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all bg-emerald-600 text-white border-emerald-600 shadow-sm active:scale-[0.98] select-none';
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = icon.className.replace(/text-\w+-\d+/, 'text-white');
                }
            } else {
                btn.className =
                    'pbm-chip p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] select-none';
                const icon = btn.querySelector('i');
                if (icon && id) {
                    const item = PBM_ITEMS.find((p) => p.id === id);
                    if (item) {
                        const defaultColor = this.getIconColor(id);
                        icon.className = `fa-solid ${item.icon} text-base ${defaultColor}`;
                    }
                }
            }
        });
    },

    getIconColor(id: string): string {
        switch (id) {
            case 'helm': return 'text-amber-500';
            case 'bril': return 'text-blue-500';
            case 'gehoor': return 'text-purple-500';
            case 'schoenen': return 'text-emerald-500';
            case 'handschoenen': return 'text-orange-500';
            case 'hesje': return 'text-yellow-500';
            case 'harnas': return 'text-red-500';
            case 'adem': return 'text-teal-500';
            default: return 'text-slate-500';
        }
    }
};
