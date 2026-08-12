/* src/qr-scanner.ts - Handles QR Scanning for Assets/Locations */
// Alleen het TYPE statisch importeren: dat verdwijnt bij het compileren, zodat
// de bibliotheek zelf (ruim 200 kB) niet in de hoofdbundle belandt. De echte
// import gebeurt dynamisch in startScanner().
import type { Html5Qrcode } from "html5-qrcode";
import { UI } from "./ui";
import { Diagnostics } from "./diagnostics";

export const QRScanner = {
    scanner: null as Html5Qrcode | null,
    isScanning: false,
    
    init() {
        const btn = document.getElementById('btnScanQR');
        if (btn) {
            btn.addEventListener('click', () => this.toggleScanner());
        }
        
        const closeBtn = document.getElementById('btnCloseQR');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.stopScanner());
        }
    },

    async toggleScanner() {
        if (this.isScanning) {
            await this.stopScanner();
        } else {
            await this.startScanner();
        }
    },

    async startScanner() {
        const modal = document.getElementById('qrModal');
        if (modal) modal.classList.remove('hidden');

        let Html5QrcodeCtor: typeof Html5Qrcode;
        try {
            const module = await import('html5-qrcode');
            Html5QrcodeCtor = module.Html5Qrcode;
        } catch (err) {
            Diagnostics.log('error', 'qr', `Scanner-module kon niet worden geladen: ${String(err)}`);
            UI.showToast('❌ Scanner niet beschikbaar. Ga even online en probeer opnieuw.');
            if (modal) modal.classList.add('hidden');
            return;
        }

        this.scanner = new Html5QrcodeCtor("qrReader");
        this.isScanning = true;

        try {
            await this.scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    this.onScanSuccess(decodedText);
                },
                (_errorMessage) => {
                    // Ignore background scan errors
                }
            );
        } catch (err) {
            console.error("QR Start failed:", err);
            UI.showToast("❌ Kan camera niet starten voor QR-scanner.");
            this.stopScanner();
        }
    },

    async stopScanner() {
        if (this.scanner && this.isScanning) {
            try {
                await this.scanner.stop();
                this.scanner.clear();
            } catch (err) {
                console.error("QR Stop failed:", err);
            }
        }
        this.isScanning = false;
        this.scanner = null;
        
        const modal = document.getElementById('qrModal');
        if (modal) modal.classList.add('hidden');
    },

    onScanSuccess(decodedText: string) {
        // Stop scanning after successful read
        this.stopScanner();
        
        // Vul locatie veld
        const locInput = document.getElementById('taskLocation') as HTMLInputElement;
        if (locInput) {
            // Check of het misschien een URL is
            if (decodedText.startsWith('http')) {
                // Vaak zit in de URL een ID (bijv /asset/1234)
                const parts = decodedText.split('/');
                locInput.value = `Asset: ${parts[parts.length - 1]}`;
            } else {
                locInput.value = decodedText;
            }
            
            locInput.classList.add('bg-emerald-100', 'dark:bg-emerald-900');
            setTimeout(() => locInput.classList.remove('bg-emerald-100', 'dark:bg-emerald-900'), 1000);
            
            UI.showToast("✅ QR-Code succesvol gescand!");
        }
    }
};
