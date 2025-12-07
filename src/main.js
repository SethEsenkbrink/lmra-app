/* src/main.js */
import './style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { App } from './app.js';

// Start de applicatie
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Service Worker Registratie (voor offline gebruik)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker Geregistreerd'))
            .catch(err => console.log('❌ Service Worker Fout', err));
    });
}