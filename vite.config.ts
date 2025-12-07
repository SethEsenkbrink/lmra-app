import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Lees de versie direct uit package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const version = packageJson.version;

export default defineConfig({
  // Hier definiëren we globale constanten die tijdens de build worden vervangen
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    // Zorgt voor schone builds in de 'dist' map
    outDir: 'dist',
    emptyOutDir: true,
  }
});