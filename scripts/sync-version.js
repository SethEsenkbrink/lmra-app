/* scripts/sync-version.js */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 1. Lees de MASTER versie uit package.json (Single Source of Truth)
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const newVersion = pkg.version;

console.log(`\x1b[36m%s\x1b[0m`, `🚀 Start Sync Versie: v${newVersion}`);

// Functie om veilig bestanden te updaten met regex
function updateFile(filePath, regex, replacement, description) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (regex.test(content)) {
            const newContent = content.replace(regex, replacement);
            fs.writeFileSync(filePath, newContent);
            console.log(`✅ ${description} bijgewerkt.`);
        } else {
            console.warn(`⚠️  ${description}: Regex matchte niet (mogelijk al up-to-date of formaat gewijzigd).`);
        }
    } else {
        console.error(`❌ ${description}: Bestand niet gevonden (${filePath})`);
    }
}

// 2. Update manifest.json
const manifestPath = path.join(rootDir, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.name = `LMRA Pro v${newVersion} Sentinel`;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ public/manifest.json bijgewerkt');
}

// 3. Update sw.js (Cache Naam - Cruciaal voor PWA updates)
updateFile(
    path.join(rootDir, 'public/sw.js'),
    /const CACHE_NAME = 'lmra-sentinel-v.*?';/,
    `const CACHE_NAME = 'lmra-sentinel-v${newVersion}';`,
    'ServiceWorker Cache'
);

// 4. Update index.html (Landingspagina titels & badges)
const indexPath = path.join(rootDir, 'index.html');
updateFile(indexPath, /<title>LMRA Pro.*?<\/title>/, `<title>LMRA Pro v${newVersion}</title>`, 'Index Title');
updateFile(indexPath, /v\d+\.\d+(\.\d+)?(\sSentinel)?/, `v${newVersion} Sentinel`, 'Index Badge');

// 5. Update app.html (Applicatie titels)
const appPath = path.join(rootDir, 'app.html');
updateFile(appPath, /<title>LMRA Pro.*?<\/title>/, `<title>LMRA Pro v${newVersion}</title>`, 'App Title');
updateFile(appPath, /v\d+\.\d+(\.\d+)? - Sentinel Safe/, `v${newVersion} - Sentinel Safe`, 'App Header Versie');

// LET OP: We updaten src/config.ts NIET meer hier. 
// Dat laten we over aan Vite via de 'define' plugin in vite.config.ts. 
// Dit voorkomt conflicten.

console.log(`🎉 Versie synchronisatie naar v${newVersion} voltooid!`);