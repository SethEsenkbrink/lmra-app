# 🛡️ LMRA Pro - Open Source PWA (v9.8.10)

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