# 🛡️ LMRA Pro - v9.0 Sentinel Safe

**Status:** Production Stable  
**Architecture:** Serverless / Supabase Direct  
**Security:** RLS Enabled & Client-Side Encryption

LMRA Pro is een professionele Progressive Web App (PWA) ontwikkeld voor technici in de proces- en elektrotechniek. Deze applicatie stelt monteurs in staat om een Laatste Minuut Risico Analyse uit te voeren met maximale gegevensbeveiliging.

## 🚀 Nieuw in v9.0 (Sentinel)
* **Supabase Direct:** Geen tussenliggende API servers meer. Directe, beveiligde verbinding met de database.
* **Row Level Security (RLS):** Strikte database policies zorgen ervoor dat data alleen geschreven kan worden, nooit publiek gelezen of gewist.
* **Offline First:** Verbeterde Service Worker voor gebruik in fabrieken zonder 4G/WiFi.
* **Resume Flow:** Werkzaamheden pauzeren en later hervatten met behoud van sessie.

## 🛠️ Tech Stack
* **Frontend:** HTML5, TailwindCSS, Vanilla JS (ES6+)
* **Database:** Supabase (PostgreSQL)
* **Security:** AES-GCM 256-bit (Lokaal), RLS (Cloud), CSP Headers
* **Hosting:** Netlify (Static)

## 💻 Lokaal Ontwikkelen

1.  Clone de repo.
2.  Installeer dependencies:
    ```bash
    npm install
    ```
3.  Start de lokale server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:3000`

## 🔒 Beveiligingsmodel
Zie [SECURITY.md](SECURITY.md) voor gedetailleerde specs over encryptie en data-integriteit.