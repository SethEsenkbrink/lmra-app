# 🛡️ LMRA Pro - Digitale Veiligheidstool (v8.2)

**Codename: Sentinel (Audit Resolved)**

LMRA Pro is een professionele Progressive Web App (PWA) ontwikkeld voor technici in de proces- en elektrotechniek. De applicatie digitaliseert de Laatste Minuut Risico Analyse en vervangt papieren boekjes door een slim, cloud-connected systeem dat **ook offline** werkt en voldoet aan strikte beveiligingseisen.

## 🚀 Nieuw in v8.2 (Sentinel - Audit Update)

Naar aanleiding van een externe veiligheidsaudit zijn de volgende verbeteringen doorgevoerd:

* **🔐 Client-Side Encryptie:** Lokale data wordt nu versleuteld met **AES-GCM** (via Web Crypto API). Alleen toegankelijk met een persoonlijke App PIN.
* **🆔 Netlify Identity:** Veilige authenticatie voor beheerders via JWT-tokens (vervangt het gedeelde wachtwoord).
* **🛡️ Hardened Security:**
    * Strikte **Content Security Policy (CSP)** zonder 'unsafe-inline' scripts.
    * **Rate Limiting** op Edge-niveau om DDoS en spam te voorkomen.
    * **Honeypot** mechanisme tegen bots.
    * **DOMPurify** update tegen mXSS aanvallen.

## 📱 Functionaliteiten

### 👷 Voor de Monteur (Frontend)
* **Digitale Kluis:** Data op het apparaat is onleesbaar zonder PIN.
* **Slimme Checklist:** Dynamische vragenlijst met verplichte actievelden bij afkeur.
* **Geldigheidsduur:** Automatische waarschuwing als de sessie (pauze) is verlopen.
* **Verklaring van Waarheid:** Juridische check bij indienen.
* **Offline Mode:** Versleutelde wachtrij die automatisch synchroniseert bij verbinding.

### 👨‍💻 Voor het Beheer (Admin Dashboard)
* **RBAC Toegang:** Inloggen via Netlify Identity widget.
* **Real-time Inzicht:** Tabel van alle uitgevoerde LMRA's.
* **Veilige Weergave:** Automatische sanitization van alle getoonde data.
* **Excel Export:** Volledige database dump voor rapportages.

## 🛠️ Technische Stack
* **Frontend:** HTML5, Tailwind CSS, Vanilla JS (ES6+).
* **Encryption:** Web Crypto API (PBKDF2 & AES-GCM).
* **Backend:** Netlify Edge Functions (Deno) & Serverless Functions (Node.js).
* **Auth:** Netlify Identity (GoTrue).
* **Database:** Neon (Serverless PostgreSQL).

## ⚙️ Installatie & Setup

### 1. Netlify Setup
Zorg dat de volgende Environment Variables zijn ingesteld in Netlify:
| Variabele | Beschrijving |
| :--- | :--- |
| `NETLIFY_DATABASE_URL` | Connectiestring naar Neon PostgreSQL |

### 2. Activeer Identity
Ga in het Netlify Dashboard naar **Site Settings > Identity** en klik op **Enable Identity**.
* **Registration:** Zet op "Invite only" (aanbevolen voor interne tools).
* **External Providers:** Optioneel (Google, GitHub, etc.).

### 3. Database Schema (Neon)
Voer het volgende SQL script uit in je Neon console:
```sql
CREATE TABLE IF NOT EXISTS lmra_reports (
    id SERIAL PRIMARY KEY,
    monteur_naam VARCHAR(255) NOT NULL,
    locatie VARCHAR(255) NOT NULL,
    werkorder VARCHAR(50),
    is_veilig BOOLEAN NOT NULL,
    opmerkingen TEXT,
    afkeurpunten JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);