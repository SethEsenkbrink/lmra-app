// src/landing.ts
import './style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { supabase } from './database'; // Zorg dat database.ts 'supabase' exporteert (dat doet hij)

console.log('LMRA Pro Landing Page Loaded');

async function checkRedirect() {
    // 1. Check op lokale beveiligingssleutels (De monteur heeft al eens een PIN ingesteld)
    const hasLocalSalt = localStorage.getItem('lmra_salt');
    
    // 2. Check of er een actieve Supabase sessie is (Cloud auth)
    const { data } = await supabase.auth.getSession();
    const hasCloudSession = !!data.session;

    // Als een van beide waar is, is dit een bekende gebruiker -> Redirect naar App
    if (hasLocalSalt || hasCloudSession) {
        console.log("🔄 Bekende gebruiker gedetecteerd, doorsturen naar App...");
        window.location.replace('/app'); // .replace zorgt dat ze niet 'terug' kunnen naar landing
    }
}

// Voer check direct uit
checkRedirect();