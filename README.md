# 🛡️ LMRA Pro - Digitale Veiligheidstool (v8.0)

**Codename: Sentinel**

LMRA Pro is een professionele Progressive Web App (PWA) ontwikkeld voor technici in de proces- en elektrotechniek. De applicatie digitaliseert de Laatste Minuut Risico Analyse en vervangt papieren boekjes door een slim, cloud-connected systeem dat **ook offline** werkt.

## 🚀 Nieuw in v8.0 (Sentinel)

* **Offline First:** De app werkt volledig zonder internet.
* **Sentinel Sync Engine:** Rapporten die offline zijn gemaakt, worden automatisch opgeslagen in een lokale wachtrij. Zodra er weer verbinding is, synchroniseert de app deze automatisch met de Neon database.
* **PWA Installatie:** De app kan nu als native applicatie worden geïnstalleerd op Android en iOS.
* **Auto-Updates:** Via de Service Worker krijgt de gebruiker altijd de nieuwste versie.

## 📱 Functionaliteiten

### 👷 Voor de Monteur (Frontend)
* **Slimme Checklist:** Dynamische vragenlijst met verplichte actievelden bij afkeur.
* **Geldigheidsduur:** Automatische waarschuwing als de sessie (pauze) is verlopen.
* **Buddy Check:** Optioneel vierogenprincipe.
* **Historie & PDF:** Inzien van eigen historie en exporteren naar PDF.
* **Dagelijkse Reset:** Automatische opruiming bij start van een nieuwe werkdag.

### 👨‍💻 Voor het Beheer (Admin Dashboard)
* **Real-time Inzicht:** Tabel van alle uitgevoerde LMRA's.
* **Detail Analyse:** Inzien van specifieke afkeurpunten en genomen maatregelen.
* **Export:** Volledige database dump naar Excel.

## 🛠️ Technische Stack
* **Frontend:** HTML5, Tailwind CSS, Vanilla JS (ES6+).
* **Backend:** Netlify Functions (Node.js).
* **Database:** Neon (Serverless PostgreSQL).
* **Security:** Rate Limiting, Input Sanitization (DOMPurify), Timing Safe Auth.

## 🗺️ Roadmap
* [x] Offline Modus (v8.0)
* [ ] Foto Upload ("Evidence Locker")
* [ ] QR-Scanner voor assets

Ontwikkeld door SIEV - 2025