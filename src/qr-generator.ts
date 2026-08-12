/* src/qr-generator.ts - Printbare QR-stickers voor machines en ruimtes
 *
 * De app kan al QR-codes scannen, maar niemand kon ze maken. Hier genereer je
 * een blad met kleine stickers (25, 35 of 50 mm) die je op een motor, kast of
 * deur plakt. Scan je die met de app of met de camera van je telefoon, dan staat
 * de locatie direct in het formulier.
 *
 * De QR wordt als vectorblokjes in de PDF getekend (geen afbeelding), dus hij
 * blijft scherp op elk formaat en het bestand blijft klein.
 */

import qrcode from 'qrcode-generator';
import jsPDF from 'jspdf';
import { UI } from './ui';
import { Diagnostics } from './diagnostics';

export interface StickerOptions {
    /** Zijde van het QR-vierkant in millimeters. */
    sizeMm: number;
    /** true = QR bevat een link naar de app, false = alleen de tekst. */
    asAppLink: boolean;
    baseUrl: string;
}

const PAGE = { width: 210, height: 297, margin: 8 };
const GUTTER = 4;
const LABEL_HEIGHT = 6;

/** Bouwt de inhoud van de QR-code voor één label. */
export function buildQrPayload(label: string, options: StickerOptions): string {
    const clean = label.trim();
    if (!options.asAppLink) return clean;
    return `${options.baseUrl.replace(/\/$/, '')}/app?loc=${encodeURIComponent(clean)}`;
}

/** Verdeelt labels over pagina's op basis van de stickergrootte. */
export function planSheet(count: number, sizeMm: number) {
    const cellWidth = sizeMm;
    const cellHeight = sizeMm + LABEL_HEIGHT;
    const usableWidth = PAGE.width - PAGE.margin * 2;
    const usableHeight = PAGE.height - PAGE.margin * 2;
    const columns = Math.max(1, Math.floor((usableWidth + GUTTER) / (cellWidth + GUTTER)));
    const rows = Math.max(1, Math.floor((usableHeight + GUTTER) / (cellHeight + GUTTER)));
    const perPage = columns * rows;
    return { columns, rows, perPage, cellWidth, cellHeight, pages: Math.max(1, Math.ceil(count / perPage)) };
}

function drawQr(
    doc: jsPDF,
    payload: string,
    x: number,
    y: number,
    sizeMm: number
): void {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();

    const modules = qr.getModuleCount();
    // Stille marge van 2 modules aan elke kant (norm is 4, maar op een sticker
    // van 25 mm kost dat te veel ruimte; 2 werkt in de praktijk prima).
    const quiet = 2;
    const total = modules + quiet * 2;
    const module = sizeMm / total;

    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, sizeMm, sizeMm, 'F');
    doc.setFillColor(0, 0, 0);

    for (let row = 0; row < modules; row++) {
        let runStart = -1;
        for (let col = 0; col <= modules; col++) {
            const dark = col < modules && qr.isDark(row, col);
            if (dark && runStart === -1) runStart = col;
            if (!dark && runStart !== -1) {
                // Aaneengesloten blokjes als één rechthoek: minder objecten, kleiner bestand.
                doc.rect(
                    x + (quiet + runStart) * module,
                    y + (quiet + row) * module,
                    (col - runStart) * module,
                    module,
                    'F'
                );
                runStart = -1;
            }
        }
    }
}

export const QRGenerator = {
    open(): void {
        UI.toggleElement('qrGenModal', true);
        this.renderPreview();
    },

    close(): void {
        UI.toggleElement('qrGenModal', false);
    },

    readLabels(): string[] {
        const field = document.getElementById('qrGenLabels') as HTMLTextAreaElement | null;
        if (!field) return [];
        return field.value
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .slice(0, 200);
    },

    readOptions(): StickerOptions {
        const size = document.getElementById('qrGenSize') as HTMLSelectElement | null;
        const asLink = document.getElementById('qrGenAsLink') as HTMLInputElement | null;
        return {
            sizeMm: size ? Number(size.value) || 35 : 35,
            asAppLink: asLink ? asLink.checked : true,
            baseUrl: window.location.origin.includes('localhost') ? 'https://lmrapro.nl' : window.location.origin,
        };
    },

    /** Live voorbeeld van de eerste sticker op een canvas. */
    renderPreview(): void {
        const canvas = document.getElementById('qrGenPreview') as HTMLCanvasElement | null;
        const info = document.getElementById('qrGenInfo');
        if (!canvas) return;

        const labels = this.readLabels();
        const options = this.readOptions();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 160;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        if (labels.length === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Typ een naam', size / 2, size / 2);
            if (info) info.textContent = 'Nog geen labels ingevuld.';
            return;
        }

        const qr = qrcode(0, 'M');
        qr.addData(buildQrPayload(labels[0], options));
        qr.make();
        const modules = qr.getModuleCount();
        const quiet = 2;
        const module = size / (modules + quiet * 2);

        ctx.fillStyle = '#000000';
        for (let row = 0; row < modules; row++) {
            for (let col = 0; col < modules; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect((col + quiet) * module, (row + quiet) * module, module + 0.4, module + 0.4);
                }
            }
        }

        if (info) {
            const plan = planSheet(labels.length, options.sizeMm);
            info.textContent =
                `${labels.length} sticker(s) van ${options.sizeMm} mm · ${plan.columns} x ${plan.rows} per blad · ` +
                `${plan.pages} pagina('s) · voorbeeld: ${labels[0]}`;
        }
    },

    async generatePdf(): Promise<void> {
        const labels = this.readLabels();
        if (labels.length === 0) {
            UI.showToast('Vul eerst minimaal één naam in.');
            return;
        }

        const options = this.readOptions();
        const started = performance.now();

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
            const plan = planSheet(labels.length, options.sizeMm);

            labels.forEach((label, index) => {
                const positionOnPage = index % plan.perPage;
                if (index > 0 && positionOnPage === 0) doc.addPage();

                const column = positionOnPage % plan.columns;
                const row = Math.floor(positionOnPage / plan.columns);
                const x = PAGE.margin + column * (plan.cellWidth + GUTTER);
                const y = PAGE.margin + row * (plan.cellHeight + GUTTER);

                // Snijlijn zodat je de stickers recht uit het blad knipt.
                doc.setDrawColor(210, 210, 210);
                doc.setLineWidth(0.1);
                doc.rect(x - 1, y - 1, plan.cellWidth + 2, plan.cellHeight + 2);

                drawQr(doc, buildQrPayload(label, options), x, y, options.sizeMm);

                doc.setFontSize(options.sizeMm >= 50 ? 9 : options.sizeMm >= 35 ? 7.5 : 6);
                doc.setTextColor(20, 20, 20);
                doc.setFont('helvetica', 'bold');
                const printable = label.replace(/[^ -ÿ]/g, '');
                const lines = doc.splitTextToSize(printable, options.sizeMm) as string[];
                doc.text(lines.slice(0, 1), x + options.sizeMm / 2, y + options.sizeMm + 4, { align: 'center' });
            });

            const blob = doc.output('blob') as Blob;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lmra-qr-stickers-${options.sizeMm}mm.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);

            const ms = Math.round(performance.now() - started);
            Diagnostics.log(
                'info',
                'qr',
                `${labels.length} stickers van ${options.sizeMm}mm in ${plan.pages} pagina(s), ${ms}ms, ${Math.round(blob.size / 1024)}kB`
            );
            UI.showToast(`✅ ${labels.length} stickers gedownload`);
        } catch (err) {
            Diagnostics.log('error', 'qr', `Stickers maken mislukt: ${String(err)}`);
            UI.showToast('❌ Stickers maken mislukt. Zie Diagnose & Logs.');
        }
    },

    bind(): void {
        document.getElementById('btnCloseQrGen')?.addEventListener('click', () => this.close());
        document.getElementById('btnQrGenPdf')?.addEventListener('click', () => void this.generatePdf());
        document.getElementById('qrGenLabels')?.addEventListener('input', () => this.renderPreview());
        document.getElementById('qrGenSize')?.addEventListener('change', () => this.renderPreview());
        document.getElementById('qrGenAsLink')?.addEventListener('change', () => this.renderPreview());
    },
};
