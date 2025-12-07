# 🛡️ LMRA Pro - v9.5 Sentinel Safe

**Status:** Production Stable  
**Architecture:** Vite / Vanilla JS / PWA  
**Security:** Client-Side AES-GCM & Self-Destruct Protocol

LMRA Pro is een geavanceerde Progressive Web App (PWA) voor technici in de proces- en elektrotechniek. Deze "Sentinel Safe" editie is volledig herbouwd om maximale databeveiliging en offline-stabiliteit te garanderen zonder afhankelijk te zijn van externe CDN's.

## 🚀 Nieuw in v9.5 (Sentinel Architecture)
* **Zero-Build Dependency:** Volledig lokaal gebouwd met Vite. Geen externe CDN-links meer voor CSS of JS.
* **Self-Destruct Protocol:** Lokale data wordt permanent gewist (crypto-shredding) na 5 foutieve PIN-pogingen.
* **Encrypted Storage:** Migratie van LocalStorage naar IndexedDB (via `idb-keyval`) voor veilige, asynchrone opslag van grote datasets.
* **Offline-First:** Verbeterde Service Worker en Sync Queue die automatisch synchroniseert zodra verbinding hersteld is.

## 🛠️ Tech Stack
* **Core:** Vanilla JavaScript (ES Modules)
* **Build Tool:** Vite 5.x
* **Styling:** TailwindCSS 3.4 (PostCSS)
* **Database:** Supabase (PostgreSQL + RLS)
* **Security:** Web Crypto API (SubtleCrypto)
* **Local DB:** IndexedDB (Encrypted wrapper)

## 💻 Installatie & Gebruik

### Vereisten
* Node.js (v18 of hoger)
* NPM

### Setup
1. Clone de repository:
   ```bash
   git clone [https://github.com/jouw-repo/lmra-app.git](https://github.com/jouw-repo/lmra-app.git)
   cd lmra-app