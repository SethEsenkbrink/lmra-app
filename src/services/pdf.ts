/* src/services/pdf.ts */
import { LMRAReport } from '../database';
import { UI } from '../ui';
import { APP_VERSION } from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PDFService = {
    async generate(report: LMRAReport | null): Promise<void> {
        if (!report) return;

        UI.showToast("PDF Genereren...");
        UI.setLoading('btnGeneratePDF', true, "Genereren...");

        try {
            // 1. Initialiseer document (A4, portrait, millimeters)
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 2. Logo inladen (Asynchroon)
            // We laden het logo vooraf in zodat we het direct kunnen plaatsen
            const logoUrl = '/icon-192.png';
            const logoImg = await this.loadImage(logoUrl);

            // --- HEADER ---
            // Blauwe balk bovenin
            doc.setFillColor(0, 68, 124); // #00447c
            doc.rect(0, 0, 210, 20, 'F');

            // Titel in wit
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text("LMRA Rapportage", 10, 13);
            
            // Subtitel
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`v${APP_VERSION} Sentinel`, 160, 13, { align: 'right' });

            // Logo rechtsboven (over de balk heen)
            if (logoImg) {
                doc.addImage(logoImg, 'PNG', 170, 2, 16, 16);
            }

            // --- INFO BLOK ---
            doc.setTextColor(0, 0, 0);
            let yPos = 30;

            // Status Banner (Gekleurd blok)
            const isSafe = report.is_veilig;
            // Kleur instellen: Groen (22, 163, 74) of Rood (220, 38, 38)
            doc.setFillColor(isSafe ? 22 : 220, isSafe ? 163 : 38, isSafe ? 74 : 38);
            doc.rect(10, yPos, 190, 12, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            const statusText = isSafe ? "VEILIG / GOEDGEKEURD" : "ONVEILIG / AFGEKEURD - STOP WERKZAAMHEDEN";
            doc.text(statusText, 105, yPos + 8, { align: 'center' });

            // Werkgegevens (Tabel vorm zonder lijnen)
            yPos += 20;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            
            const dateCreated = new Date(report.created_at);
            const dateValid = new Date(report.valid_until);

            // We gebruiken autoTable voor nette uitlijning van de header data
            autoTable(doc, {
                startY: yPos,
                theme: 'plain', // Geen lijnen
                styles: { fontSize: 10, cellPadding: 1, overflow: 'linebreak' },
                columnStyles: {
                    0: { fontStyle: 'bold', width: 40 },
                    1: { width: 60 },
                    2: { fontStyle: 'bold', width: 40 },
                    3: { width: 50 }
                },
                body: [
                    ['Monteur:', report.monteur_naam, 'Datum:', dateCreated.toLocaleDateString()],
                    ['Werkorder:', report.werkorder, 'Tijd:', dateCreated.toLocaleTimeString().slice(0,5)],
                    ['Locatie/Asset:', report.locatie, 'Geldig tot:', dateValid.toLocaleTimeString().slice(0,5)]
                ]
            });

            // Update Y positie na de eerste tabel
            // @ts-ignore (lastAutoTable wordt toegevoegd door de plugin)
            yPos = doc.lastAutoTable.finalY + 15;

            // --- RESULTATEN ---
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 68, 124);
            doc.text("Inspectie Resultaten", 10, yPos);
            
            yPos += 5;

            if (isSafe) {
                // Groene melding
                doc.setFillColor(240, 253, 244); // Lichtgroen
                doc.setDrawColor(22, 163, 74);   // Groene rand
                doc.rect(10, yPos, 190, 20, 'FD');
                
                doc.setTextColor(22, 101, 52); // Donkergroen tekst
                doc.setFontSize(10);
                doc.text("✅ Geen afwijkingen geconstateerd.", 15, yPos + 8);
                doc.setFont('helvetica', 'normal');
                doc.text("Alle controlepunten zijn positief beoordeeld. De werkzaamheden kunnen veilig starten.", 15, yPos + 14);
                yPos += 25;
            } else {
                // Afkeurpunten tabel
                const afkeurpunten = JSON.parse(report.afkeurpunten || "[]");
                const rows = afkeurpunten.map((p: string) => [p]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['🛑 Geconstateerde Risico\'s / Afkeurpunten']],
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
                    styles: { textColor: [185, 28, 28] }, // Rood tekst
                });
                 // @ts-ignore
                yPos = doc.lastAutoTable.finalY + 10;
            }

            // --- OPMERKINGEN ---
            // Check of er nog ruimte is op de pagina, anders nieuwe pagina toevoegen
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            } else {
                yPos += 5; // Wat witruimte
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(0, 68, 124);
            doc.text("Opmerkingen", 10, yPos);
            yPos += 2;

            const comments = report.opmerkingen || "Geen opmerkingen.";
            autoTable(doc, {
                startY: yPos + 3,
                body: [[comments]],
                theme: 'plain',
                styles: { 
                    fillColor: [248, 250, 252], // Grijs vlak
                    textColor: [51, 65, 85],
                    fontStyle: 'italic',
                    cellPadding: 5
                }
            });

            // --- FOOTER ---
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                const footerText = `Rapport ID: ${report.report_id} - Gegenereerd: ${new Date().toLocaleString()}`;
                doc.text(footerText, 10, 285);
                doc.text(`Pagina ${i} van ${pageCount}`, 200, 285, { align: 'right' });
            }

            // 6. Opslaan
            const filename = `LMRA_${report.werkorder.replace(/[^a-zA-Z0-9]/g, '-')}_${dateCreated.toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            UI.showToast("✅ PDF Succesvol Gedownload");

        } catch (err: any) {
            console.error("PDF Error:", err);
            UI.showToast("❌ Fout bij genereren PDF");
            alert("Fout details: " + err.message);
        } finally {
            UI.setLoading('btnGeneratePDF', false, "Download PDF");
        }
    },

    // Hulpfunctie om plaatjes te laden voor PDF
    loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = (e) => {
                console.warn("Kon logo niet laden voor PDF", e);
                // We resolven toch (met de (mogelijk lege) img), zodat de PDF doorgaat zonder te crashen
                resolve(img); 
            };
        });
    }
};