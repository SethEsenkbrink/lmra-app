// src/landing.ts
import './style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { supabase } from './database'; 

console.log('LMRA Pro Landing Page Loaded');

async function checkRedirect() {
    // Lees de parameters uit de URL (bijv. ?info=true of ?landing=true)
    const urlParams = new URLSearchParams(window.location.search);

    // 🛠️ DEV BYPASS: Stop de redirect als we lokaal draaien met '?landing=true' in de URL
    if (import.meta.env.DEV && urlParams.get('landing') === 'true') {
        console.warn("⚠️ DEV MODE: Redirect genegeerd. Je blijft op de landingspagina.");
        return; 
    }

    // ℹ️ INFO BYPASS: Stop de redirect als de monteur bewust via de app op de info-knop heeft geklikt
    if (urlParams.get('info') === 'true') {
        console.log("ℹ️ Gebruiker heeft bewust voor de informatiepagina gekozen. Redirect gepauzeerd.");
        return; 
    }

    // 1. Check op lokale beveiligingssleutels (De monteur heeft al eens een PIN ingesteld)
    const hasLocalSalt = localStorage.getItem('lmra_salt');
    
    // 2. Check of er een actieve Supabase sessie is (Cloud auth)
    const { data } = await supabase.auth.getSession();
    const hasCloudSession = !!data.session;

    // Als een van beide waar is (en er is geen bypass actief), is dit een bekende gebruiker -> Redirect naar App
    if (hasLocalSalt || hasCloudSession) {
        console.log("🔄 Bekende gebruiker gedetecteerd, doorsturen naar App...");
        window.location.replace('/app'); // .replace zorgt dat ze niet 'terug' kunnen klikken naar landing
    }
}

// Voer check direct uit zodra de pagina laadt
checkRedirect();