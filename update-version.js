import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Nodig omdat we in ES modules (type: module) werken
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Lees de hoofversie uit package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

console.log(`🚀 Versie bijwerken naar: v${newVersion}`);

// ---------------------------------------------------------

// 2. Update manifest.json
const manifestPath = path.join(__dirname, 'public/manifest.json');
let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.name = `LMRA Pro v${newVersion} Sentinel`;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ public/manifest.json bijgewerkt');

// 3. Update config.ts
const configPath = path.join(__dirname, 'src/config.ts');
let configContent = fs.readFileSync(configPath, 'utf8');
// Zoek naar: export const APP_VERSION: string = "..."
configContent = configContent.replace(
    /export const APP_VERSION: string = ".*";/, 
    `export const APP_VERSION: string = "${newVersion}";`
);
fs.writeFileSync(configPath, configContent);
console.log('✅ src/config.ts bijgewerkt');

// 4. Update sw.js (Service Worker Cache Naam)
const swPath = path.join(__dirname, 'public/sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');
// Zoek naar: const CACHE_NAME = '...'
swContent = swContent.replace(
    /const CACHE_NAME = 'lmra-sentinel-v.*';/, 
    `const CACHE_NAME = 'lmra-sentinel-v${newVersion}';`
);
fs.writeFileSync(swPath, swContent);
console.log('✅ public/sw.js bijgewerkt');

// 5. Update index.html (Voor de visuele weergave)
const htmlPath = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Update Title tag
htmlContent = htmlContent.replace(
    /<title>LMRA Pro .*<\/title>/,
    `<title>LMRA Pro ${newVersion}</title>`
);

// Update versie tekst in de header (deze is wat specifieker, we zoeken naar de v... - Sentinel Safe tekst)
htmlContent = htmlContent.replace(
    /v.* - Sentinel Safe/,
    `v${newVersion} - Sentinel Safe`
);

// Update footer tekst
htmlContent = htmlContent.replace(
    /LMRA Pro v.* &bull; Supabase Connected/,
    `LMRA Pro v${newVersion} &bull; Supabase Connected`
);

// Update update modal tekst
htmlContent = htmlContent.replace(
    /Update: v.* Sentinel/,
    `Update: v${newVersion} Sentinel`
);

fs.writeFileSync(htmlPath, htmlContent);
console.log('✅ index.html bijgewerkt');

console.log(`\n🎉 Alles is bijgewerkt naar versie ${newVersion}!`);