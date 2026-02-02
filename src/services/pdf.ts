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
            // 1. Setup Document
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // --- MODERN KLEURENPALET ---
            const BRAND_COLOR = { r: 0, g: 68, b: 124 };    // #00447c
            const TEXT_COLOR = { r: 30, g: 41, b: 59 };     // Slate 800
            const LABEL_COLOR = { r: 100, g: 116, b: 139 }; // Slate 500
            
            const SUCCESS_COLOR = { r: 22, g: 163, b: 74 }; // Green 600
            const SUCCESS_BG = { r: 240, g: 253, b: 244 };  // Green 50
            
            const DANGER_COLOR = { r: 220, g: 38, b: 38 };  // Red 600
            const DANGER_BG = { r: 254, g: 242, b: 242 };   // Red 50

            // 2. Logo inladen (Veilig)
            const logoUrl = '/icon-192.png';
            let logoImg: HTMLImageElement | null = null;
            try {
                logoImg = await this.loadImage(logoUrl);
            } catch (e) {
                console.warn("Logo kon niet geladen worden, doorgaan zonder logo.");
            }

            // --- HEADER SECTIE ---
            // Blauwe balk
            doc.setFillColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
            doc.rect(0, 0, 210, 35, 'F');

            // Logo linksboven
            if (logoImg) {
                try {
                    doc.addImage(logoImg, 'PNG', 10, 5, 25, 25);
                } catch (imgErr) {
                    console.warn("Fout bij plaatsen logo:", imgErr);
                }
            }

            // Titel & Subtitel
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text("LMRA Rapportage", 40, 16);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Laatste Minuut Risico Analyse", 40, 23);
            
            // Meta info rechtsboven
            doc.setFontSize(8);
            doc.setTextColor(200, 200, 200);
            doc.text(`v${APP_VERSION} Sentinel`, 200, 10, { align: 'right' });
            doc.text(`Datum: ${new Date().toLocaleDateString()}`, 200, 30, { align: 'right' });

            let yPos = 45;

            // --- STATUS INDICATOR ---
            const isSafe = report.is_veilig;
            const statusColor = isSafe ? SUCCESS_COLOR : DANGER_COLOR;
            const statusBg = isSafe ? SUCCESS_BG : DANGER_BG;
            const statusText = isSafe ? "VEILIG / GOEDGEKEURD" : "ONVEILIG / AFGEKEURD";

            // Getekende 'Badge'
            doc.setDrawColor(statusColor.r, statusColor.g, statusColor.b);
            doc.setFillColor(statusBg.r, statusBg.g, statusBg.b);
            doc.roundedRect(10, yPos, 190, 14, 2, 2, 'FD');

            doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(statusText, 105, yPos + 9, { align: 'center' });

            yPos += 22;

            // --- PROJECT GEGEVENS (GRID) ---
            const dateCreated = new Date(report.created_at);
            const dateValid = new Date(report.valid_until);

            // Variabele om de eind-Y positie van de tabel veilig op te vangen
            let finalY_Project = yPos;

            autoTable(doc, {
                startY: yPos,
                theme: 'grid',
                head: [['PROJECT & MONTEUR', 'TIJDSLIJN & GELDIGHEID']],
                body: [
                    [
                        `Monteur: ${report.monteur_naam}\nWerkorder: ${report.werkorder}\nLocatie: ${report.locatie}`,
                        `Aangemaakt: ${dateCreated.toLocaleDateString()} om ${dateCreated.toLocaleTimeString().slice(0,5)}\nGeldig tot: ${dateValid.toLocaleTimeString().slice(0,5)}`
                    ]
                ],
                styles: {
                    lineColor: [226, 232, 240], // Heel licht grijs
                    lineWidth: 0.1,
                    cellPadding: 6,
                    fontSize: 10,
                    textColor: [TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b],
                    valign: 'top'
                },
                headStyles: {
                    fillColor: [241, 245, 249], // Slate 100
                    textColor: [LABEL_COLOR.r, LABEL_COLOR.g, LABEL_COLOR.b],
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 110 },
                    1: { cellWidth: 'auto' }
                },
                // VEILIGE MANIER: Gebruik de hook om de positie te bepalen
                didDrawPage: (data: any) => {
                    finalY_Project = data.cursor.y;
                }
            });

            // Update yPos veilig
            yPos = finalY_Project + 15;

            // --- RESULTATEN ---
            doc.setFontSize(12);
            doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
            doc.setFont('helvetica', 'bold');
            doc.text("INSPECTIE RESULTATEN", 10, yPos);
            doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
            doc.setLineWidth(0.5);
            doc.line(10, yPos + 2, 65, yPos + 2); // Underline
            
            yPos += 10;

            if (isSafe) {
                // Groen succes blok
                doc.setFillColor(SUCCESS_BG.r, SUCCESS_BG.g, SUCCESS_BG.b);
                doc.setDrawColor(SUCCESS_COLOR.r, SUCCESS_COLOR.g, SUCCESS_COLOR.b);
                doc.roundedRect(10, yPos, 190, 25, 2, 2, 'FD');
                
                // Icon (Text based)
                doc.setTextColor(SUCCESS_COLOR.r, SUCCESS_COLOR.g, SUCCESS_COLOR.b);
                doc.setFontSize(16);
                doc.text("OK", 20, yPos + 16); 

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text("Geen afwijkingen geconstateerd.", 35, yPos + 10);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(TEXT_COLOR.r, TEXT_COLOR.g, TEXT_COLOR.b);
                doc.text("Alle controlepunten zijn positief beoordeeld. De werkzaamheden kunnen veilig starten.", 35, yPos + 18);
                
                yPos += 35;
            } else {
                // Rode tabel voor afkeurpunten
                const afkeurpunten = JSON.parse(report.afkeurpunten || "[]");
                const rows = afkeurpunten.map((p: string) => [p]);
                
                let finalY_Risks = yPos;

                autoTable(doc, {
                    startY: yPos,
                    head: [['🛑 GECONSTATEERDE RISICO\'S & ACTIES']],
                    body: rows,
                    theme: 'striped',
                    headStyles: { 
                        fillColor: [DANGER_COLOR.r, DANGER_COLOR.g, DANGER_COLOR.b], 
                        textColor: [255, 255, 255], 
                        fontStyle: 'bold' 
                    },
                    styles: { 
                        textColor: [DANGER_COLOR.r, DANGER_COLOR.g, DANGER_COLOR.b],
                        fontSize: 10,
                        cellPadding: 4
                    }, 
                    alternateRowStyles: {
                        fillColor: [DANGER_BG.r, DANGER_BG.g, DANGER_BG.b]
                    },
                    didDrawPage: (data: any) => {
                        finalY_Risks = data.cursor.y;
                    }
                });
                
                yPos = finalY_Risks + 15;
            }

            // --- OPMERKINGEN ---
            // Check of er nog ruimte op de pagina is
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
            doc.setFont('helvetica', 'bold');
            doc.text("OPMERKINGEN", 10, yPos);
            doc.line(10, yPos + 2, 45, yPos + 2);
            
            yPos += 8;

            const comments = report.opmerkingen || "Geen bijzonderheden of opmerkingen toegevoegd.";
            
            // Grijze box voor opmerkingen
            autoTable(doc, {
                startY: yPos,
                body: [[comments]],
                theme: 'plain',
                styles: { 
                    fillColor: [248, 250, 252], 
                    textColor: [71, 85, 105], // Slate 600
                    fontStyle: 'italic',
                    cellPadding: 8,
                    minCellHeight: 20
                }
            });

            // --- FOOTER (Op elke pagina) ---
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                // Footer lijn
                doc.setDrawColor(200, 200, 200);
                doc.line(10, 280, 200, 280);

                doc.setFontSize(8);
                doc.setTextColor(150);
                
                doc.text(`Rapport ID: ${report.report_id}`, 10, 285);
                doc.text(`LMRA Pro v${APP_VERSION} - Safety First`, 105, 285, { align: 'center' });
                doc.text(`Pagina ${i} van ${pageCount}`, 200, 285, { align: 'right' });
            }

            // 3. Opslaan
            const filename = `LMRA_${report.werkorder.replace(/[^a-zA-Z0-9]/g, '-')}_${dateCreated.toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            UI.showToast("✅ PDF Succesvol Gedownload");

        } catch (err: any) {
            console.error("PDF Error:", err);
            UI.showToast("❌ Fout bij genereren PDF");
            // Verbeterde foutmelding voor de gebruiker
            alert("Er ging iets mis bij het maken van de PDF. \nDetails: " + (err.message || "Onbekende fout"));
        } finally {
            UI.setLoading('btnGeneratePDF', false, "Download PDF");
        }
    },

    // Hulpfunctie om plaatjes te laden (No-Crash versie)
    loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = (e) => {
                // We rejecten niet hard, maar loggen warning en geven resolve(img) zodat de rest doorgaat
                // Of we kunnen rejecten en opvangen in de try/catch hierboven.
                // In dit geval rejecten we om het netjes af te handelen in de main flow.
                reject(e); 
            };
        });
    }
};