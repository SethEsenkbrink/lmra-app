/* src/services/pdf.ts - Clean Professional PDF Generator
 *
 * Belangrijk over tekst in PDF's: jsPDF gebruikt de standaard Helvetica met
 * WinAnsi-encoding. Alles boven U+00FF (emoji, pijltjes, aanhalingstekens uit
 * Word) wordt daarin onleesbare rommel. Voorheen stond er letterlijk "✅ JA" in
 * de checklist, wat in de PDF als "' JA" terechtkwam. Alle tekst die in het
 * document belandt gaat daarom door toPdfText().
 *
 * Dit bestand wordt dynamisch geladen (zie app.ts) zodat jsPDF niet in de
 * initiële bundle zit. De chunk wordt na het opstarten alvast opgehaald, zodat
 * offline genereren blijft werken.
 */
import { LMRAReport } from '../database';
import { UI } from '../ui';
import { APP_VERSION } from '../config';
import { getCategoriesFor } from '../data';
import { Diagnostics } from '../diagnostics';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Size {
    width: number;
    height: number;
}

const PAGE_WIDTH = 210;
const CONTENT_BOTTOM = 272; // boven de footerlijn op 280
const MARGIN = 10;

/** Vervangt tekens die de standaard PDF-fonts niet kunnen weergeven. */
export function toPdfText(input: unknown): string {
    const text = String(input ?? '');
    return text
        // Vink- en kruistekens worden weggelaten: JA/NEE wordt door de generator
        // zelf gezet. Zou hier 'JA' staan, dan leest vrije tekst als
        // "aardlekschakelaar geplaatst JA".
        .replace(/[\u2705\u2714\u2713\u274C\u2716\u2717\u2718]/g, '')
        .replace(/\u26A0\uFE0F?/g, '!')                 // waarschuwingsteken
        .replace(/[\u2192\u21D2]/g, '->')               // pijlen
        .replace(/[\u2013\u2014]/g, '-')                // en/em dash
        .replace(/[\u2018\u2019\u201B]/g, "'")         // slimme apostrofs
        .replace(/[\u201C\u201D\u201E]/g, '"')         // slimme aanhalingstekens
        .replace(/\u20AC/g, 'EUR')                      // euroteken
        .replace(/\u00A0/g, ' ')                        // non-breaking space
        .replace(/\uFE0F/g, '')                         // losse variation selectors
        // Alles wat daarna nog buiten Latin-1 valt kan de standaard PDF-font niet
        // weergeven. \n en \t moeten expliciet blijven staan, anders sneuvelen de
        // regeleindes in de meerregelige tabelcellen.
        .replace(/[^\n\t\u0020-\u00FF]/g, '')
        .trim();
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Zoekt of een vraag is afgekeurd en haalt de bijbehorende actie eruit. */
export function findFailedPoint(points: string[], questionText: string): { failed: boolean; action: string } {
    const pattern = new RegExp('^' + escapeRegExp(questionText) + '\\s*(?:\\(Actie:\\s*([\\s\\S]*?)\\)\\s*)?$');
    for (const point of points) {
        const match = point.match(pattern);
        if (match) {
            const action = (match[1] ?? '').trim();
            return { failed: true, action: action.length > 0 ? action : 'Geen' };
        }
    }
    return { failed: false, action: '' };
}

/** Schaalt afmetingen zodat ze in een kader passen, met behoud van verhouding. */
export function fitInBox(natural: Size, maxWidth: number, maxHeight: number): Size {
    if (natural.width <= 0 || natural.height <= 0) {
        return { width: maxWidth, height: maxHeight };
    }
    const scale = Math.min(maxWidth / natural.width, maxHeight / natural.height);
    return { width: natural.width * scale, height: natural.height * scale };
}

export const PDFService = {
    async generate(report: LMRAReport | null): Promise<void> {
        if (!report) return;

        const started = performance.now();
        UI.showToast('PDF Genereren...');
        UI.setLoading('btnGeneratePDF', true, 'Genereren...');

        try {
            // compress: true houdt het bestand klein genoeg om via WhatsApp te
            // versturen op een trage verbinding.
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });

            const BRAND_COLOR = { r: 0, g: 68, b: 124 };
            const TEXT_COLOR = { r: 30, g: 41, b: 59 };
            const LABEL_COLOR = { r: 100, g: 116, b: 139 };
            const SUCCESS_COLOR = { r: 22, g: 163, b: 74 };
            const SUCCESS_BG = { r: 240, g: 253, b: 244 };
            const DANGER_COLOR = { r: 220, g: 38, b: 38 };
            const DANGER_BG = { r: 254, g: 242, b: 242 };

            /* ------------------------------------------------------- header */

            let logoImg: HTMLImageElement | null = null;
            try {
                logoImg = await this.loadImage('/icon-192.png');
            } catch {
                Diagnostics.log('warn', 'pdf', 'Logo kon niet geladen worden, PDF gaat verder zonder');
            }

            doc.setFillColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
            doc.rect(0, 0, PAGE_WIDTH, 35, 'F');

            if (logoImg) {
                try {
                    doc.addImage(logoImg, 'PNG', MARGIN, 5, 25, 25);
                } catch (imgErr) {
                    Diagnostics.log('warn', 'pdf', `Logo plaatsen mislukt: ${String(imgErr)}`);
                }
            }

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('LMRA Rapportage', 40, 16);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Laatste Minuut Risico Analyse', 40, 23);

            doc.setFontSize(8);
            doc.setTextColor(200, 200, 200);
            doc.text(`v${APP_VERSION} PWA`, 200, 10, { align: 'right' });
            doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, 200, 30, { align: 'right' });

            let yPos = 43;

            /* ------------------------------------------------------- status */

            const isSafe = report.is_veilig;
            const statusColor = isSafe ? SUCCESS_COLOR : DANGER_COLOR;
            const statusBg = isSafe ? SUCCESS_BG : DANGER_BG;
            const statusText = isSafe ? 'VEILIG / GOEDGEKEURD' : 'ONVEILIG / AFGEKEURD';

            doc.setDrawColor(statusColor.r, statusColor.g, statusColor.b);
            doc.setFillColor(statusBg.r, statusBg.g, statusBg.b);
            doc.roundedRect(MARGIN, yPos, 190, 14, 2, 2, 'FD');

            doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(statusText, 105, yPos + 9, { align: 'center' });

            yPos += 20;

            /* --------------------------------------------- project & bedrijf */

            const dateCreated = new Date(report.created_at);
            const dateValid = new Date(report.valid_until);

            const weerText = report.weer_info
                ? `\nWeer: ${report.weer_info.temperature} C, ${report.weer_info.windspeed} km/h (${toPdfText(report.weer_info.description)})`
                : '';

            autoTable(doc, {
                startY: yPos,
                theme: 'grid',
                head: [['PROJECT & BEDRIJF', 'TIJDSLIJN & GELDIGHEID']],
                body: [
                    [
                        toPdfText(
                            `Bedrijf / Opdrachtgever: ${report.bedrijf_naam || 'Niet opgegeven'}\n` +
                                `Monteur: ${report.monteur_naam}\n` +
                                `Locatie / Asset: ${report.locatie}\n` +
                                `Werkorder: ${report.werkorder}\n` +
                                `Soort werk: ${report.template_label || 'Algemeen'}`
                        ),
                        toPdfText(
                            `Aangemaakt: ${dateCreated.toLocaleDateString('nl-NL')} om ${dateCreated
                                .toLocaleTimeString('nl-NL')
                                .slice(0, 5)}\n` +
                                `Geldig tot: ${dateValid.toLocaleTimeString('nl-NL').slice(0, 5)}${weerText}`
                        ),
                    ],
                ],
                styles: {
                    lineColor: [226, 232, 240],
                    lineWidth: 0.1,
                    cellPadding: 5,
                    fontSize: 9.5,
                    textColor: [TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b],
                    valign: 'top',
                },
                headStyles: {
                    fillColor: [241, 245, 249],
                    textColor: [LABEL_COLOR.r, LABEL_COLOR.g, LABEL_COLOR.b],
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'left',
                },
                columnStyles: {
                    0: { cellWidth: 110 },
                    1: { cellWidth: 'auto' },
                },
            });

            yPos = this.tableEndY(doc, yPos) + 12;

            /* ---------------------------------------------------- checklist */

            yPos = this.sectionTitle(doc, 'VOLLEDIGE CHECKLIST', yPos, BRAND_COLOR, 50);

            const afkeurpunten: string[] = JSON.parse(report.afkeurpunten || '[]');
            const checklistRows: any[] = [];

            // De vragen van de template die bij dit rapport hoort, niet alleen de basis.
            getCategoriesFor(report.template).forEach((cat) => {
                checklistRows.push([
                    {
                        content: toPdfText(cat.title).toUpperCase(),
                        colSpan: 2,
                        styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: BRAND_COLOR },
                    },
                ]);

                cat.questions.forEach((q) => {
                    const { failed, action } = findFailedPoint(afkeurpunten, q.text);
                    const label = failed
                        ? `${toPdfText(q.text)}\n     ACTIE: ${toPdfText(action)}`
                        : toPdfText(q.text);

                    checklistRows.push([
                        { content: label, styles: { textColor: failed ? DANGER_COLOR : TEXT_COLOR } },
                        {
                            // Geen emoji: die kan de standaard PDF-font niet weergeven.
                            content: failed ? 'NEE' : 'JA',
                            styles: {
                                halign: 'center',
                                fontStyle: 'bold',
                                textColor: failed ? DANGER_COLOR : SUCCESS_COLOR,
                            },
                        },
                    ]);
                });
            });

            autoTable(doc, {
                startY: yPos,
                head: [['CONTROLEPUNT', 'ANTWOORD']],
                body: checklistRows,
                theme: 'grid',
                styles: { fontSize: 8.5, cellPadding: 3 },
                headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255] },
                columnStyles: {
                    0: { cellWidth: 155 },
                    1: { cellWidth: 'auto' },
                },
                margin: { bottom: 20 },
            });

            yPos = this.tableEndY(doc, yPos) + 12;

            /* ------------------------------------------------- weeradviezen */

            const adviezen: string[] = Array.isArray(report.weer_info?.adviezen) ? report.weer_info.adviezen : [];
            if (adviezen.length > 0) {
                yPos = this.ensureSpace(doc, yPos, 20 + adviezen.length * 8);
                yPos = this.sectionTitle(doc, 'MAATREGELEN BIJ DIT WEER', yPos, BRAND_COLOR, 70);

                autoTable(doc, {
                    startY: yPos,
                    body: adviezen.map((a) => [toPdfText(`- ${a}`)]),
                    theme: 'plain',
                    styles: {
                        fillColor: [255, 251, 235],
                        textColor: [146, 64, 14],
                        fontSize: 9,
                        cellPadding: 3,
                    },
                    margin: { bottom: 20 },
                });

                yPos = this.tableEndY(doc, yPos) + 12;
            }

            /* --------------------------------------------------- opmerkingen */

            yPos = this.ensureSpace(doc, yPos, 30);
            yPos = this.sectionTitle(doc, 'EXTRA OPMERKINGEN', yPos, BRAND_COLOR, 45);

            autoTable(doc, {
                startY: yPos,
                body: [[toPdfText(report.opmerkingen) || 'Geen extra opmerkingen toegevoegd.']],
                theme: 'plain',
                styles: {
                    fillColor: [248, 250, 252],
                    textColor: [71, 85, 105],
                    fontStyle: 'italic',
                    cellPadding: 6,
                    minCellHeight: 12,
                },
                margin: { bottom: 20 },
            });

            yPos = this.tableEndY(doc, yPos) + 12;

            /* -------------------------------------------------- handtekening */

            if (report.handtekening) {
                yPos = this.ensureSpace(doc, yPos, 45);
                yPos = this.sectionTitle(doc, 'HANDTEKENING MONTEUR', yPos, BRAND_COLOR, 55);

                try {
                    const signImg = await this.loadImage(report.handtekening);
                    const size = fitInBox(
                        { width: signImg.naturalWidth, height: signImg.naturalHeight },
                        70,
                        30
                    );
                    doc.addImage(report.handtekening, 'PNG', MARGIN, yPos, size.width, size.height);
                    yPos += size.height + 8;
                } catch (signErr) {
                    Diagnostics.log('warn', 'pdf', `Handtekening kon niet worden geplaatst: ${String(signErr)}`);
                }
            }

            /* ------------------------------------------------------- foto's */

            const photos = report.foto_bewijs ?? [];
            if (photos.length > 0) {
                doc.addPage();
                yPos = 20;
                yPos = this.sectionTitle(doc, "BEWIJSMATERIAAL (FOTO'S)", yPos, BRAND_COLOR, 65) + 4;

                const columnWidth = 90;
                const maxPhotoHeight = 95;
                const columnX = [MARGIN, MARGIN + columnWidth + 10];
                let column = 0;
                let rowHeight = 0;

                for (let i = 0; i < photos.length; i++) {
                    let size: Size = { width: columnWidth, height: maxPhotoHeight };
                    try {
                        const img = await this.loadImage(photos[i]);
                        // Verhouding behouden: een liggende foto wordt niet meer
                        // platgedrukt tot een vierkant.
                        size = fitInBox(
                            { width: img.naturalWidth, height: img.naturalHeight },
                            columnWidth,
                            maxPhotoHeight
                        );
                    } catch {
                        Diagnostics.log('warn', 'pdf', `Foto ${i + 1} kon niet worden ingelezen`);
                    }

                    if (column === 0 && yPos + size.height > CONTENT_BOTTOM) {
                        doc.addPage();
                        yPos = 20;
                        rowHeight = 0;
                    }

                    try {
                        doc.addImage(photos[i], 'JPEG', columnX[column], yPos, size.width, size.height);
                    } catch (photoErr) {
                        Diagnostics.log('warn', 'pdf', `Foto ${i + 1} niet toegevoegd: ${String(photoErr)}`);
                    }

                    rowHeight = Math.max(rowHeight, size.height);
                    column++;

                    if (column > 1) {
                        column = 0;
                        yPos += rowHeight + 10;
                        rowHeight = 0;
                    }
                }
            }

            /* ------------------------------------------------------- footer */

            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.2);
                doc.line(MARGIN, 280, 200, 280);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.setFont('helvetica', 'normal');
                doc.text(toPdfText(`Rapport ID: ${report.report_id}`), MARGIN, 285);
                doc.text(`LMRA Pro v${APP_VERSION} - Offline PWA`, 105, 285, { align: 'center' });
                doc.text(`Pagina ${i} van ${pageCount}`, 200, 285, { align: 'right' });
            }

            /* ------------------------------------------------ delen of opslaan */

            const cleanWO = (report.werkorder || 'LMRA').replace(/[^a-zA-Z0-9]/g, '-');
            const filename = `LMRA_${cleanWO}_${dateCreated.toISOString().split('T')[0]}.pdf`;
            const pdfBlob = doc.output('blob') as Blob;
            const sizeKb = Math.round(pdfBlob.size / 1024);
            const ms = Math.round(performance.now() - started);
            Diagnostics.log('info', 'pdf', `PDF gemaakt in ${ms}ms, ${pageCount} pagina(s), ${sizeKb} kB`);

            if (navigator.share && navigator.canShare) {
                const file = new File([pdfBlob], filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `LMRA Rapport: ${toPdfText(report.locatie)}`,
                            text: `Hier is het LMRA rapport voor ${toPdfText(report.locatie)} (${toPdfText(report.werkorder)}).`,
                            files: [file],
                        });
                        UI.showToast('✅ PDF succesvol gedeeld');
                        return;
                    } catch (shareErr) {
                        const name = (shareErr as Error)?.name;
                        if (name === 'AbortError') {
                            // Gebruiker sloot het deelmenu bewust: dan niet alsnog downloaden.
                            Diagnostics.log('debug', 'pdf', 'Delen geannuleerd door gebruiker');
                            UI.showToast('Delen geannuleerd.');
                            return;
                        }
                        Diagnostics.log('warn', 'pdf', `Delen mislukt (${name}), terugvallen op download`);
                    }
                }
            }

            this.downloadBlob(pdfBlob, filename);
            UI.showToast(`✅ PDF gedownload (${sizeKb} kB)`);
        } catch (err) {
            const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            Diagnostics.log('error', 'pdf', `Genereren mislukt: ${msg}`);
            // Geen alert(): die blokkeert de hele PWA. De fout staat in Diagnose & Logs.
            UI.showToast('❌ PDF maken mislukt. Zie Menu > Diagnose & Logs.');
        } finally {
            UI.setLoading('btnGeneratePDF', false, 'Download PDF');
        }
    },

    /* ---------------------------------------------------------- helpers */

    /** Y-positie waar de laatste autoTable eindigde. */
    tableEndY(doc: jsPDF, fallback: number): number {
        const finalY = (doc as any).lastAutoTable?.finalY;
        return typeof finalY === 'number' ? finalY : fallback;
    },

    /** Nieuwe pagina beginnen wanneer er niet genoeg ruimte over is. */
    ensureSpace(doc: jsPDF, yPos: number, needed: number): number {
        if (yPos + needed > CONTENT_BOTTOM) {
            doc.addPage();
            return 20;
        }
        return yPos;
    },

    sectionTitle(
        doc: jsPDF,
        title: string,
        yPos: number,
        color: { r: number; g: number; b: number },
        lineWidth: number
    ): number {
        doc.setFontSize(11);
        doc.setTextColor(color.r, color.g, color.b);
        doc.setFont('helvetica', 'bold');
        doc.text(toPdfText(title), MARGIN, yPos);
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, yPos + 2, MARGIN + lineWidth, yPos + 2);
        return yPos + 8;
    },

    downloadBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    },

    loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    },
};
