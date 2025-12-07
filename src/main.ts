/* src/main.ts */
import './style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { App } from './app';

// Start de applicatie
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Service Worker Registratie (voor offline gebruik)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            // AANGEPAST: 'reg' vervangen door '()' omdat we de variabele niet gebruiken
            .then(() => console.log('✅ Service Worker Geregistreerd'))
            .catch(err => console.log('❌ Service Worker Fout', err));
    });
}