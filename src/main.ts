/* src/main.ts - Entrypoint van de app (app.html) */
import './style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { App } from './app';

// Start de applicatie. Module scripts zijn deferred, maar de readyState-check
// voorkomt dat init nooit draait wanneer het event al is geweest.
function boot(): void {
    void App.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

// Service worker wordt geregistreerd in cookie-pwa-manager.ts (initPwaInstallPrompt).
// Dubbele registratie hier is verwijderd: dat leverde twee registraties per load op.
