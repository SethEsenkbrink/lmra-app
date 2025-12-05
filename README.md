# 🛡️ LMRA Pro - Digitale Veiligheidstool (v8.2)

**Codename: Sentinel (Identity Fix Update)**

LMRA Pro is een professionele Progressive Web App (PWA) ontwikkeld voor technici in de proces- en elektrotechniek. De applicatie digitaliseert de Laatste Minuut Risico Analyse en vervangt papieren boekjes door een slim, cloud-connected systeem dat **ook offline** werkt.

## 🚀 Nieuw in v8.2 (Sentinel Patch)

* **Secure Identity Flow:** Verbeterde afhandeling van wachtwoord resets en redirects.
* **Redirect Fix:** Geen loop meer bij het gebruik van de 'Terug' knop na inloggen.
* **Hervat Werkzaamheden:** Slimme detectie van actieve sessies op dezelfde dag.
* **Versie Synchronisatie:** Alle componenten (SW, App, Admin) zijn gelijkgetrokken naar v8.2.

## 📱 Functionaliteiten

### 👷 Voor de Monteur (Frontend)
* **Slimme Checklist:** Dynamische vragenlijst met verplichte actievelden bij afkeur.
* **Geldigheidsduur:** Automatische waarschuwing als de sessie (pauze) is verlopen.
* **Buddy Check:** Optioneel vierogenprincipe.
* **Offline Mode:** Rapporten worden lokaal opgeslagen en gesynchroniseerd bij verbinding.

### 👨‍💻 Voor het Beheer (Admin Dashboard)
* **Beveiligde Login:** Toegang via Netlify Identity (RBAC).
* **Real-time Inzicht:** Tabel van alle uitgevoerde LMRA's.
* **Excel Export:** Volledige database dump voor rapportages.

## 🛠️ Technische Stack
* **Frontend:** HTML5, Tailwind CSS, Vanilla JS (ES6+).
* **Backend:** Netlify Functions (Node.js).
* **Auth:** Netlify Identity (GoTrue).
* **Database:** Neon (Serverless PostgreSQL).
* **Security:** Rate Limiting, Input Sanitization (DOMPurify), Secure Cookies.

## ⚙️ Installatie & Setup

### Environment Variables (Netlify)
| Variabele | Beschrijving |
| :--- | :--- |
| `NETLIFY_DATABASE_URL` | Connectiestring naar Neon PostgreSQL |
| `JWT_SECRET` | Secret voor token validatie |