/* scripts/sync-version.js */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * =============================================================================
 * 🛡️ LMRA PRO - VERSIE UPDATE PROTOCOL (STAP-VOOR-STAP)
 * =============================================================================
 * * Volg ALTIJD deze stappen bij het uitbrengen van een nieuwe versie:
 * * STAP 1: BEREID DE RELEASE VOOR
 * [ ] Open 'package.json' en verhoog het versienummer (bijv. van 9.8.7 naar 9.8.8).
 * [ ] Open 'src/release.ts'.
 * [ ] Pas 'title' aan naar een korte beschrijving van de update.
 * [ ] Vul 'features' met bullet points van wat er nieuw/verbeterd is.
 * * STAP 2: DRAAI HET UPDATE SCRIPT
 * [ ] Type in terminal: "npm run build"
 * (Dit script 'sync-version.js' draait automatisch vóór de build).
 * * STAP 3: CONTROLE
 * [ ] Check of 'public/manifest.json' het nieuwe nummer heeft.
 * [ ] Check of 'public/sw.js' de nieuwe CACHE_NAME heeft.
 * [ ] Check of 'app.html' en 'index.html' de juiste titels hebben.
 * * STAP 4: DEPLOY
 * [ ] Commit de wijzigingen naar GitHub:
 * git add .
 * git commit -m "chore: release v9.8.8"
 * git push
 * [ ] Netlify pakt dit automatisch op en bouwt de nieuwe versie.
 * * =============================================================================
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 1. Lees de MASTER versie uit package.json (Single Source of Truth)
const pkgPath = path.join(rootDir, 'package.json');
let pkg;

try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
    console.error("❌ CRITICAL: Kan package.json niet lezen!");
    process.exit(1);
}

const newVersion = pkg.version;

console.log(`\x1b[36m%s\x1b[0m`, `🚀 Start Sync Versie: v${newVersion}`);

// Helper functie voor veilige regex updates
function updateFile(filePath, regex, replacement, description) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (regex.test(content)) {
            const newContent = content.replace(regex, replacement);
            fs.writeFileSync(filePath, newContent);
            console.log(`✅ ${description} bijgewerkt.`);
        } else {
            console.warn(`⚠️  ${description}: Regex matchte niet (controleer bestand).`);
        }
    } else {
        console.error(`❌ ${description}: Bestand niet gevonden (${filePath})`);
    }
}

// 2. Update manifest.json (Voor PWA installatie)
const manifestPath = path.join(rootDir, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.name = `LMRA Pro v${newVersion} Sentinel`;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('✅ public/manifest.json bijgewerkt');
    } catch (e) {
        console.error('❌ Fout bij updaten manifest.json', e);
    }
}

// 3. Update sw.js (Cache Naam - Cruciaal zodat gebruikers de nieuwe versie krijgen!)
updateFile(
    path.join(rootDir, 'public/sw.js'),
    /const CACHE_NAME = 'lmra-sentinel-v.*?';/,
    `const CACHE_NAME = 'lmra-sentinel-v${newVersion}';`,
    'ServiceWorker Cache'
);

// 4. Update index.html (Landingspagina titels & badges)
const indexPath = path.join(rootDir, 'index.html');
updateFile(indexPath, /<title>LMRA Pro.*?<\/title>/, `<title>LMRA Pro v${newVersion} Sentinel</title>`, 'Index Title');
updateFile(indexPath, /v\d+\.\d+(\.\d+)?(\sSentinel)?(\sEdition)?/, `v${newVersion} Sentinel Edition`, 'Index Badge');

// 5. Update app.html (Applicatie titels)
const appPath = path.join(rootDir, 'app.html');
updateFile(appPath, /<title>LMRA Pro.*?<\/title>/, `<title>LMRA Pro v${newVersion}</title>`, 'App Title');
updateFile(appPath, /v\d+\.\d+(\.\d+)? - Sentinel Safe/, `v${newVersion} - Sentinel Safe`, 'App Header Versie');

console.log(`🎉 Versie synchronisatie naar v${newVersion} voltooid!`);