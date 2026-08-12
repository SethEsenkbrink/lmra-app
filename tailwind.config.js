/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./*.html",      // index, app, juridische paginas EN de gegenereerde paginas
    "./src/**/*.{js,ts,jsx,tsx}",
    "./scripts/build-pages.mjs", // layout van de gegenereerde paginas
    "./content/*.mjs",
  ],
  theme: {
    extend: {
        colors: {
            brand: { light: '#005596', DEFAULT: '#00447c', dark: '#002a4d' },
            darkbg: '#0f172a',
            cardbg: '#1e293b'
        }
    },
  },
  plugins: [],
}