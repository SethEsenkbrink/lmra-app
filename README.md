# 🛡️ LMRA Pro - Digitale Veiligheidstool (v8.1)

**Codename: Sentinel (Fortress Update)**

LMRA Pro is een professionele Progressive Web App (PWA) ontwikkeld voor technici in de proces- en elektrotechniek. De applicatie digitaliseert de Laatste Minuut Risico Analyse en vervangt papieren boekjes door een slim, cloud-connected systeem dat **ook offline** werkt.

## 🚀 Nieuw in v8.1 (Sentinel)

* **Hervat Werkzaamheden:** Na een pauze hoeft de monteur niet alles opnieuw in te vullen. De app herkent een actieve sessie en vraagt om een snelle visuele her-check.
* **Professionele Beveiliging:** Het admin-paneel is nu beveiligd met database-gestuurde accounts, bcrypt wachtwoord-hashing en veilige HTTP-only cookies.
* **Changelog:** Gebruikers zien direct na een update wat er nieuw is.
* **Sentinel Sync Engine:** Rapporten worden offline opgeslagen in een wachtrij en automatisch gesynchroniseerd zodra er verbinding is.

## 📱 Functionaliteiten

### 👷 Voor de Monteur (Frontend)
* **Slimme Checklist:** Dynamische vragenlijst met verplichte actievelden bij afkeur.
* **Geldigheidsduur:** Automatische waarschuwing als de sessie (pauze) is verlopen.
* **Buddy Check:** Optioneel vierogenprincipe.
* **Historie & PDF:** Inzien van eigen historie en exporteren naar PDF.
* **Dagelijkse Reset:** Automatische opruiming bij start van een nieuwe werkdag.

### 👨‍💻 Voor het Beheer (Admin Dashboard)
* **Beveiligde Login:** Toegang via unieke accounts (geen gedeelde wachtwoorden meer).
* **Real-time Inzicht:** Tabel van alle uitgevoerde LMRA's.
* **Detail Analyse:** Inzien van specifieke afkeurpunten en genomen maatregelen.
* **Export:** Volledige database dump naar Excel.

## 🛠️ Technische Stack
* **Frontend:** HTML5, Tailwind CSS, Vanilla JS (ES6+).
* **Backend:** Netlify Functions (Node.js).
* **Auth:** JSON Web Tokens (JWT) & Bcryptjs.
* **Database:** Neon (Serverless PostgreSQL).
* **Security:** Rate Limiting, Input Sanitization (DOMPurify), Secure Cookies.

## ⚙️ Installatie & Setup

### Environment Variables (Netlify)
| Variabele | Beschrijving |
| :--- | :--- |
| `NETLIFY_DATABASE_URL` | Connectiestring naar Neon PostgreSQL |
| `JWT_SECRET` | Lange willekeurige zin voor het onder