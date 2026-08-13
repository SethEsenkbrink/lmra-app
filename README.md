# 🛡️ LMRA Pro - Open Source PWA (v11.0.0 Horizon Dawn)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-blue.svg)]()

**LMRA Pro** is een open source, zero-friction Progressive Web App (PWA) voor het uitvoeren van **Laatste Minuut Risico Analyses (LMRA)** in de techniek, bouw en procesindustrie. 

Ontworpen om direct en mobiel-vriendelijk te werken op smartphones, tablets en laptops, zonder verplichte inlogschermen of externe servers.

---

## 🚀 Kenmerken & Functionaliteiten

* **🔓 Zero Friction / Geen Inlogdrempels**: Direct openen en invullen op de werkvloer.
* **🏢 Bedrijf & Opdrachtgever**: Vul eenvoudig de bedrijfsnaam in die op het rapport en de PDF verschijnt.
* **⚡ 100% Offline-First PWA**: Geïnstalleerd via de browser (iOS/Android/Desktop), werkt volledig zonder internet.
* **📄 Professionele PDF Export**: Inclusief kleurencoderingen (VEILIG / ONVEILIG - STOP), checklist, actiepunten en tijdsstempels.
* **🔒 100% Privacy & AVG Veilig**: Geen externe databases of tracking van persoonsgegevens. Data blijft op het toestel van de gebruiker (IndexedDB).
* **👥 Buddy Check & Eigen Verklaring**: Mede-beoordeling door toezichthouder of buddy voor verhoogde veiligheid.

---

## 🐞 Ingebouwde Diagnose Console (live debuggen op de werkvloer)

Bugs die alleen op een werktelefoon in een fabriekshal optreden, zijn niet te
debuggen met een laptop. Daarom bevat de app een eigen diagnosepaneel dat lokaal
alle fouten, netwerkcalls en device-status vastlegt.

**Openen:**

| Methode | Actie |
|---|---|
| Menu | **Menu → Diagnose & Logs** |
| URL | `/app.html?debug=1` (uitzetten met `?debug=0`) |
| Gebaar | 5× snel tikken op de titel in de header |
| Desktop | `Ctrl + Shift + D` |

**Wat het paneel biedt:**

* **Log**: alle JS-fouten, unhandled promise rejections, `console.error/warn` en
  elke `fetch` met statuscode en duur. De laatste 150 regels blijven na een
  herstart bewaard, zodat een crash terug te lezen is.
* **Systeem**: versie, PWA- of browsermodus, user agent, scherm en DPR,
  verbindingstype (`effectiveType`, downlink, rtt), permissies voor GPS,
  microfoon en camera, opslagverbruik, service worker en cache-inhoud.
* **Tests**: 10 zelftests op het toestel zelf — netwerk, eigen server,
  adres-API (Nominatim), weer-API (Open-Meteo), GPS-fix met nauwkeurigheid,
  microfoon en spraakherkenning, IndexedDB, localStorage, offline cache en de
  afmetingen/schaal van het handtekening-canvas.
* **Export**: het volledige rapport naar het klembord of als
  `lmra-diagnose-<datum>.txt`, zodat je het in een issue kunt plakken.

Alles blijft op het toestel; er wordt niets verstuurd.

---

## 🛠️ Tech Stack

* **Core Language:** TypeScript / JavaScript (ES Modules)
* **Build Tool:** Vite 7.x
* **Styling:** TailwindCSS 3.4 + FontAwesome Icons
* **Local Storage:** IndexedDB (via `idb-keyval`)
* **PDF Generator:** `jsPDF` + `jspdf-autotable`
* **Validation:** Zod Schema Validation

---

## 💻 Installatie & Lokaal Draaien

### Vereisten
* Node.js (v18 of hoger)
* NPM

### Ontwikkeling & Server
```bash
# 1. Clone de repository
git clone https://github.com/SethEsenkbrink/lmra-app.git
cd lmra-app

# 2. Installeer dependencies
npm install

# 3. Start lokale ontwikkelserver
npm run dev

# 4. Bouw voor productie
npm run build
```

---

## 📜 Licentie

Gepubliceerd onder de **MIT Licentie**. Zie het [`LICENSE`](LICENSE) bestand voor details.
Vrij te gebruiken, aan te passen en te distribueren.

Developed with ❤️ by **Brink Multimedia**.