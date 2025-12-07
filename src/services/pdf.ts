/* src/services/pdf.ts */
import { LMRAReport } from '../database';
import { UI } from '../ui';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const PDFService = {
    generate(report: LMRAReport | null): void {
        if (!report) return;

        const element = document.getElementById('pdfContent');
        if (!element) return UI.showToast("Geen inhoud voor PDF.");

        UI.showToast("PDF Genereren...");

        const opt = {
            margin:       10,
            filename:     `LMRA_${report.werkorder}_${new Date(report.created_at).toISOString().split('T')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // @ts-ignore
        html2pdf().set(opt).from(element).save()
            .then(() => UI.showToast("✅ PDF Gedownload"))
            .catch((err: any) => {
                console.error(err);
                UI.showToast("❌ Fout bij PDF maken");
            });
    }
};