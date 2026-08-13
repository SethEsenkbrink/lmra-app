/* scripts/sync-version.js
 *
 * Zet het versienummer uit package.json en de bijbehorende Horizon-codenaam
 * uit src/config.ts door naar alles wat geen TypeScript is: manifest, service
 * worker, HTML-titels, footers, JSON-LD en de documentatie.
 *
 * Bron van waarheid:
 *   - versienummer  -> package.json  ("version")
 *   - serie + namen -> src/config.ts (APP_SERIES + RELEASE_NAMES)
 *
 * Draait automatisch via "prebuild", dus vóór iedere vite build.
 */
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
    console.error('❌ CRITICAL: Kan package.json niet lezen!');
    process.exit(1);
}

const newVersion = pkg.version;
const major = Number.parseInt(String(newVersion).split('.')[0], 10);

/* --- Codenaam ophalen uit src/config.ts ---------------------------------- */
function readReleaseName() {
    const configPath = path.join(rootDir, 'src/config.ts');
    try {
        const src = fs.readFileSync(configPath, 'utf8');
        const seriesMatch = src.match(/APP_SERIES\s*=\s*'([^']+)'/);
        const tableMatch = src.match(/RELEASE_NAMES[^=]*=\s*\{([\s\S]*?)\}/);
        if (!seriesMatch || !tableMatch) return null;

        const series = seriesMatch[1];
        const names = {};
        for (const line of tableMatch[1].split('\n')) {
            const m = line.match(/(\d+)\s*:\s*'([^']+)'/);
            if (m) names[Number(m[1])] = m[2];
        }
        return names[major] ? `${series} ${names[major]}` : series;
    } catch {
        return null;
    }
}

const releaseName = readReleaseName();
if (!releaseName) {
    console.error('❌ CRITICAL: APP_SERIES / RELEASE_NAMES niet gevonden in src/config.ts');
    process.exit(1);
}

const label = `v${newVersion} ${releaseName}`;

console.log('\x1b[36m%s\x1b[0m', `🚀 Start Sync: LMRA Pro ${label}`);

function updateFile(filePath, regex, replacement, description) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ ${description}: Bestand niet gevonden (${filePath})`);
        process.exitCode = 1;
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    if (!regex.test(content)) {
        console.error(`❌ ${description}: Regex matchte niet - versie NIET bijgewerkt!`);
        process.exitCode = 1;
        return;
    }
    fs.writeFileSync(filePath, content.replace(regex, replacement));
    console.log(`✅ ${description} bijgewerkt.`);
}

/* --- 1. manifest.json ---------------------------------------------------- */
const manifestPath = path.join(rootDir, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.name = `LMRA Pro ${label} PWA`;
        manifest.short_name = 'LMRA Pro';
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        console.log('✅ public/manifest.json bijgewerkt.');
    } catch (e) {
        console.error('❌ Fout bij updaten manifest.json', e);
        process.exitCode = 1;
    }
} else {
    console.error('❌ public/manifest.json niet gevonden');
    process.exitCode = 1;
}

/* --- 2. Service Worker cache ---------------------------------------------
 * Cachenaam bevat het versienummer: bij een nieuwe versie wordt de oude cache
 * automatisch opgeruimd en haalt de gebruiker de nieuwe bestanden op.
 */
updateFile(
    path.join(rootDir, 'public/sw.js'),
    /const CACHE_NAME = '.*';/,
    `const CACHE_NAME = 'lmra-pwa-v${newVersion}';`,
    'ServiceWorker Cache'
);

/* --- 3. app.html: titel + footer ----------------------------------------- */
const appPath = path.join(rootDir, 'app.html');
updateFile(
    appPath,
    /<title>LMRA Pro.*?<\/title>/,
    `<title>LMRA Pro ${label} - Offline PWA</title>`,
    'App Title'
);
updateFile(
    appPath,
    /<p data-version-line>.*?<\/p>/,
    `<p data-version-line>LMRA Pro ${label} &bull; Offline-First Progressive Web App</p>`,
    'App Footer versieregel'
);

/* --- 4. index.html: badge + JSON-LD --------------------------------------
 * De <title> van de landingspagina is SEO-gevoelig en blijft bewust zonder
 * versienummer. De open-source badge en het softwareVersion-veld lopen wel mee.
 */
const indexPath = path.join(rootDir, 'index.html');
updateFile(
    indexPath,
    /"softwareVersion": ".*?"/,
    `"softwareVersion": "${newVersion} ${releaseName}"`,
    'index.html JSON-LD softwareVersion'
);
updateFile(
    indexPath,
    /<span data-version-badge>.*?<\/span>/,
    `<span data-version-badge>${label} Open Source Edition (MIT License)</span>`,
    'index.html versiebadge'
);
console.log('ℹ️  index.html <title> blijft ongewijzigd (SEO-titel).');

/* --- 5. Juridische pagina's: alleen de app-versieregel -------------------
 * Het documentnummer ("Versie: 3.0") is juridisch en verandert alleen bij een
 * inhoudelijke wijziging. Hier loopt uitsluitend de app-versie mee.
 */
for (const page of ['privacy.html', 'voorwaarden.html']) {
    updateFile(
        path.join(rootDir, page),
        /<span data-app-version>.*?<\/span>/,
        `<span data-app-version>LMRA Pro ${label}</span>`,
        `${page} app-versieregel`
    );
}

/* --- 6. Documentatie ----------------------------------------------------- */
updateFile(
    path.join(rootDir, 'README.md'),
    /^# 🛡️ LMRA Pro - Open Source PWA \(.*\)$/m,
    `# 🛡️ LMRA Pro - Open Source PWA (${label})`,
    'README.md titel'
);
updateFile(
    path.join(rootDir, 'SECURITY.md'),
    /^# 🛡️ Security & Privacy Protocol - LMRA Pro \(.*\)$/m,
    `# 🛡️ Security & Privacy Protocol - LMRA Pro (${label})`,
    'SECURITY.md titel'
);

if (process.exitCode) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Sync onvolledig: los bovenstaande punten op.');
} else {
    console.log('\x1b[32m%s\x1b[0m', `🎉 Synchronisatie naar LMRA Pro ${label} voltooid!`);
}
