/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",  // De nieuwe landingspagina
    "./app.html",    // <--- DEZE ONTSTRAK: De applicatie zelf!
    "./src/**/*.{js,ts,jsx,tsx}",
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