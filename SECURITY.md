# Beveiligingsbeleid LMRA Pro

**Versie 8.2 - Sentinel (Post-Audit)**

Bedankt voor je interesse in de veiligheid van dit project. LMRA Pro hanteert een "Security by Design" en "Privacy First" filosofie. Naar aanleiding van de audit in december 2025 is de beveiliging aanzienlijk aangescherpt.

## 🛡️ Beveiligingsmaatregelen (Update v8.2)

### 1. Data Encryptie (Data at Rest & Transit)
* **Lokaal (Browser):** De onveilige Base64-opslag is vervangen. Alle gevoelige data in `localStorage` wordt nu versleuteld met **AES-GCM (256-bit)**.
    * De encryptiesleutel wordt *niet* opgeslagen, maar on-the-fly afgeleid van een 4-cijferige **App PIN** via **PBKDF2** (100.000 iteraties, SHA-256).
    * Bij verlies van de PIN is de lokale data onherstelbaar verloren (Fail-Secure).
* **Transit:** Alle verkeer verloopt verplicht via HTTPS (HSTS enabled).

### 2. Authenticatie & Autorisatie
* **Beheer:** Het "Shared Secret" model is uitgefaseerd. Toegang tot het admin dashboard vereist nu authenticatie via **Netlify Identity** (JWT Tokens).
* **Edge Protection:** Een Edge Function (`auth.js`) controleert de geldigheid van het JWT-token *voordat* de pagina of API wordt geladen.
* **Sessiebeheer:** Automatische logout en sessie-invalidatie bij verdachte activiteit of time-out.

### 3. Input Validatie & XSS Preventie
* **Sanitization:** Zowel de app als het admin dashboard gebruiken **DOMPurify v3.2.4+** om alle input te zuiveren alvorens deze in de DOM te plaatsen. Dit beschermt tegen mXSS en injecties.
* **CSP (Content Security Policy):** De header is verhard. `'unsafe-inline'` is verwijderd voor scripts. Alle JavaScript is verplaatst naar externe bestanden.
* **SQL Injectie:** Alle database queries gebruiken *parameterized queries* via de `@neondatabase/serverless` driver.

### 4. Spam & Misbruik Preventie
* **Rate Limiting:** De API endpoints worden beschermd door Netlify Edge Rate Limiting (max 10 requests per minuut per IP).
* **Honeypot:** Onzichtbare velden vangen bots af zonder echte gebruikers te hinderen.

## 🐛 Een kwetsbaarheid melden

Ondanks onze zorgvuldigheid kan er altijd iets over het hoofd worden gezien.
1.  Maak **géén** publiek issue aan op GitHub.
2.  Neem direct contact op met de security officer / beheerder.
3.  Vermeld stappen om het lek te reproduceren (Proof of Concept).

## ✅ Audit Status
| Datum | Type | Status | Opmerking |
| :--- | :--- | :--- | :--- |
| Dec 2025 | Full Audit | ✅ Geslaagd | Alle kritieke bevindingen (XSS, Auth, Crypto) zijn geremedieerd in v8.2. |

---
*Laatste update: 6 december 2025*