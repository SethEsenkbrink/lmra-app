import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

// Lees de versie direct uit package.json
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const version = packageJson.version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Elke .html in de projectmap is een pagina. De losse content-paginas
      // worden door scripts/build-pages.mjs gegenereerd (npm run prebuild),
      // dus ze staan hier al voordat Vite gaat bouwen.
      input: Object.fromEntries(
        readdirSync(__dirname)
          .filter((file) => file.endsWith('.html'))
          .map((file) => [file.replace(/\.html$/, ''), resolve(__dirname, file)])
      )
    }
  }
});