/* scripts/sync-version.js */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

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

function updateFile(filePath, regex, replacement, description) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (regex.test(content)) {
            const newContent = content.replace(regex, replacement);
            fs.writeFileSync(filePath, newContent);
            console.log(`✅ ${description} bijgewerkt.`);
        } else {
            console.warn(`⚠️  ${description}: Regex matchte niet.`);
        }
    } else {
        console.error(`❌ ${description}: Bestand niet gevonden (${filePath})`);
    }
}

// 1. Update manifest.json
const manifestPath = path.join(rootDir, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.name = `LMRA Pro v${newVersion} PWA`;
        manifest.short_name = "LMRA Pro";
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('✅ public/manifest.json bijgewerkt');
    } catch (e) {
        console.error('❌ Fout bij updaten manifest.json', e);
    }
}

// 2. Update Service Worker cache naam
updateFile(
    path.join(rootDir, 'public/sw.js'),
    /const CACHE_NAME = '.*';/,
    `const CACHE_NAME = 'lmra-pwa-v${newVersion}';`,
    'ServiceWorker Cache'
);

// 3. Update index.html
const indexPath = path.join(rootDir, 'index.html');
updateFile(indexPath, /<title>LMRA Pro.*?<\/title>/, `<title>LMRA Pro v${newVersion} - Laatste Minuut Risico Analyse (PWA)</title>`, 'Index Title');

// 4. Update app.html
const appPath = path.join(rootDir, 'app.html');
updateFile(appPath, /<title>LMRA Pro.*?<\/title>/, `<title>LMRA Pro v${newVersion} - Offline PWA</title>`, 'App Title');

console.log(`🎉 Versie synchronisatie naar v${newVersion} voltooid!`);