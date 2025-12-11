/* src/services/pdf.ts */
import { LMRAReport } from '../database';
import { UI } from '../ui';
import { APP_VERSION } from '../config';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export const PDFService = {
    async generate(report: LMRAReport | null): Promise<void> {
        if (!report) return;

        UI.showToast("PDF Genereren... Even geduld.");

        // 1. Container aanmaken
        // We gebruiken 'fixed' op 0,0 zodat het altijd bovenaan de viewport staat.
        // z-index -9999 zorgt dat het achter je huidige scherm staat (niet zichtbaar voor jou, wel voor de generator).
        const container = document.createElement('div');
        container.style.position = 'fixed'; 
        container.style.left = '0';
        container.style.top = '0'; 
        container.style.zIndex = '-9999'; 
        container.style.width = '210mm'; 
        container.style.minHeight = '297mm';
        container.style.backgroundColor = '#ffffff'; // Forceer wit canvas
        container.style.color = '#333';
        container.style.fontFamily = 'Arial, sans-serif';
        
        document.body.appendChild(container);

        try {
            // 2. Template vullen
            container.innerHTML = this.buildTemplate(report);

            // 3. Wachten op afbeeldingen (Het logo)
            const images = Array.from(container.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => { 
                    img.onload = resolve; 
                    img.onerror = resolve; 
                });
            }));

            // 4. Korte pauze voor rendering (zodat de browser tijd heeft om fonts/kleuren te tekenen)
            await new Promise(r => setTimeout(r, 500));

            // 5. Configuratie
            // CRUCIAAL: scrollX/Y en x/y op 0 zetten voorkomt dat de PDF wit is als je gescrold bent.
            const opt: any = {
                margin:       [10, 10, 15, 10], 
                filename:     `LMRA_${report.werkorder.replace(/[^a-zA-Z0-9]/g, '-')}_${new Date(report.created_at).toISOString().split('T')[0]}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false, // Zet op true als je errors in console wilt zien van html2canvas
                    scrollX: 0,     // FIX: Negeer horizontale scroll
                    scrollY: 0,     // FIX: Negeer verticale scroll
                    x: 0,           // FIX: Start capture exact linksboven
                    y: 0,           // FIX: Start capture exact linksboven
                    windowWidth: 1200 // Forceer desktop breedte voor consistente layout
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // 6. Genereren
            await html2pdf().set(opt).from(container).save();
            UI.showToast("✅ PDF Succesvol Gedownload");

        } catch (err: any) {
            console.error("PDF Error:", err);
            UI.showToast("❌ Fout bij genereren PDF");
        } finally {
            // 7. Opruimen
            if(document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
    },

    buildTemplate(report: LMRAReport): string {
        const dateCreated = new Date(report.created_at);
        const dateValid = new Date(report.valid_until);
        const afkeurpunten = JSON.parse(report.afkeurpunten || "[]");
        const statusColor = report.is_veilig ? '#16a34a' : '#dc2626'; 
        const statusText = report.is_veilig ? 'VEILIG / GOEDGEKEURD' : 'ONVEILIG / AFGEKEURD';
        const statusIcon = report.is_veilig ? '✓' : '⚠️';

        // Inline CSS is essentieel voor PDF generatie
        return `
            <div style="padding: 20px; font-size: 14px; line-height: 1.5; background-color: #ffffff;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00447c; padding-bottom: 15px; margin-bottom: 20px;">
                    <div>
                        <h1 style="color: #00447c; font-size: 24px; font-weight: bold; margin: 0;">LMRA Rapportage</h1>
                        <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Laatste Minuut Risico Analyse</div>
                    </div>
                    <div style="text-align: right;">
                        <img src="/icon-192.png" style="height: 50px; width: auto;" alt="Logo" />
                    </div>
                </div>

                <div style="background-color: ${statusColor}; color: white; padding: 10px 15px; font-weight: bold; text-align: center; border-radius: 6px; margin-bottom: 25px; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="margin-right: 10px; font-size: 18px;">${statusIcon}</span> ${statusText}
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                    <div style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Monteur / Uitvoerende</div>
                        <div style="font-weight: bold; color: #1e293b;">${report.monteur_naam}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Werkorder (WO)</div>
                        <div style="font-weight: bold; color: #1e293b;">${report.werkorder}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Locatie / Asset</div>
                        <div style="font-weight: bold; color: #1e293b;">${report.locatie}</div>
                    </div>
                    <div style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-bottom: 4px;">Datum & Tijd</div>
                        <div style="font-weight: bold; color: #1e293b;">${dateCreated.toLocaleDateString()} ${dateCreated.toLocaleTimeString().slice(0,5)}</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Geldig tot: ${dateValid.toLocaleTimeString().slice(0,5)}</div>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; color: #334155; font-size: 16px; margin-bottom: 15px;">🔍 Resultaten Inspectie</h3>
                    
                    ${report.is_veilig 
                        ? `<div style="padding: 15px; border-left: 4px solid #16a34a; background: #f0fdf4; color: #166534;">
                                <strong>✅ Geen afwijkingen.</strong> Alle controlepunten zijn positief beoordeeld. De werkzaamheden kunnen veilig starten conform de procedures.
                           </div>`
                        : `<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <thead>
                                    <tr style="background: #fee2e2;">
                                        <th style="text-align: left; padding: 8px; border: 1px solid #fca5a5; color: #991b1b;">🛑 Geconstateerd Risico / Afkeurpunt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${afkeurpunten.map((punt: string) => `
                                        <tr>
                                            <td style="padding: 8px; border: 1px solid #fecaca; color: #b91c1c;">${punt}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                           </table>`
                    }
                </div>

                <div style="margin-bottom: 40px;">
                    <h3 style="border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; color: #334155; font-size: 16px; margin-bottom: 15px;">📝 Opmerkingen</h3>
                    <div style="padding: 15px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; font-style: italic; color: #475569; min-height: 60px;">
                        "${report.opmerkingen || 'Geen opmerkingen toegevoegd.'}"
                    </div>
                </div>

                <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
                    <div>
                        <strong>LMRA Pro v${APP_VERSION}</strong><br>
                        Digital Safety System
                    </div>
                    <div style="text-align: right;">
                        Report ID: ${report.report_id}<br>
                        Gegenereerd: ${new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        `;
    }
};