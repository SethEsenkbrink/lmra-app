# Beveiligingsbeleid LMRA Pro

**Versie 8.2 - Sentinel (Cleaned)**

Bedankt voor je interesse in de veiligheid van dit project. LMRA Pro hanteert een "Security by Design" en "Privacy First" filosofie.

## 🛡️ Beveiligingsmaatregelen

### 1. Data Encryptie (Data at Rest & Transit)
* **Lokaal (Browser):** Alle gevoelige data in `localStorage` wordt versleuteld met **AES-GCM (256-bit)**.
    * De encryptiesleutel wordt *niet* opgeslagen, maar on-the-fly afgeleid van een 4-cijferige **App PIN** via **PBKDF2** (600.000 iteraties, SHA-256).
    * Bij verlies van de PIN is de lokale data onherstelbaar verloren (Fail-Secure).
* **Transit:** Alle verkeer verloopt verplicht via HTTPS (HSTS enabled).

### 2. Backend & Opslag
* **Directe Opslag:** De app stuurt versleutelde/beveiligde rapporten direct naar de Neon PostgreSQL database.
* **Geen Admin Interface:** Om het aanvalsoppervlak te minimaliseren, is het publieke admin-dashboard verwijderd. Data-analyse vindt plaats binnen de beveiligde omgeving van de database-provider (Neon/Supabase) of via gekoppelde BI-tools.

### 3. Input Validatie & XSS Preventie
* **Sanitization:** De app gebruikt **DOMPurify v3.2.4+** om alle input te zuiveren alvorens deze in de DOM te plaatsen. Dit beschermt tegen mXSS en injecties.
* **CSP (Content Security Policy):** Strikte headers blokkeren ongewenste scripts en iframes.
* **SQL Injectie:** Alle database queries gebruiken *parameterized queries* via de `@neondatabase/serverless` driver.

### 4. Spam & Misbruik Preventie
* **Rate Limiting:** De API endpoints worden beschermd door Netlify Edge Rate Limiting.
* **Honeypot:** Onzichtbare velden vangen bots af zonder echte gebruikers te hinderen.

## 🐛 Een kwetsbaarheid melden
1.  Maak **géén** publiek issue aan op GitHub.
2.  Neem direct contact op met de security officer / beheerder.