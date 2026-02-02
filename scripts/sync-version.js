/* scripts/sync-version.js */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 1. Lees de MASTER versie uit package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const newVersion = pkg.version;

console.log(`🔄 Synchroniseren van versie v${newVersion} naar statische bestanden...`);

// 2. Update manifest.json (Veilig met JSON parsing)
const manifestPath = path.join(rootDir, 'public/manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    // Behoud de naamstructuur, update alleen het nummer
    manifest.name = `LMRA Pro v${newVersion} Sentinel`;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ public/manifest.json bijgewerkt');
}

// 3. Update sw.js (Cache Naam)
const swPath = path.join(rootDir, 'public/sw.js');
if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');
    swContent = swContent.replace(
        /const CACHE_NAME = 'lmra-sentinel-v.*';/, 
        `const CACHE_NAME = 'lmra-sentinel-v${newVersion}';`
    );
    fs.writeFileSync(swPath, swContent);
    console.log('✅ public/sw.js cache-naam bijgewerkt');
}

// 4. Update index.html (Voor de titel en headers)
const indexPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexPath)) {
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    htmlContent = htmlContent.replace(
        /<title>LMRA Pro .*<\/title>/,
        `<title>LMRA Pro ${newVersion}</title>`
    );
    
    htmlContent = htmlContent.replace(
        /v\d+\.\d+(\.\d+)? - Sentinel Safe/,
        `v${newVersion} - Sentinel Safe`
    );

    htmlContent = htmlContent.replace(
        /LMRA Pro v\d+\.\d+(\.\d+)? &bull;/,
        `LMRA Pro v${newVersion} &bull;`
    );
    
    htmlContent = htmlContent.replace(
        /Update: v\d+\.\d+(\.\d+)? Sentinel/,
        `Update: v${newVersion} Sentinel`
    );

    fs.writeFileSync(indexPath, htmlContent);
    console.log('✅ index.html bijgewerkt');
}

// 5. NIEUW: Update src/config.ts (De interne app logica)
const configPath = path.join(rootDir, 'src/config.ts');
if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Zoek naar: export const APP_VERSION = '...';
    configContent = configContent.replace(
        /export const APP_VERSION = '.*';/,
        `export const APP_VERSION = '${newVersion}';`
    );
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ src/config.ts bijgewerkt');
}

console.log(`🎉 Versie synchronisatie naar v${newVersion} voltooid!`);