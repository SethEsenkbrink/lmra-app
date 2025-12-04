# Beveiligingsbeleid LMRA Pro

**Versie 8.1 - Sentinel (Fortress Update)**

Bedankt voor je interesse in de veiligheid van dit project. Dit project is ontwikkeld met een "Security by Design" en "Privacy First" filosofie, geschikt voor professionele inzet.

## 🛡️ Ondersteunde Versies

| Versie | Status | Opmerking |
| :--- | :--- | :--- |
| **Versie 8.1+** | ✅ **Actief Ondersteund** | Huidige standaard (Secure Auth) |
| Versie 8.0 | ⚠️ Uitgefaseerd | Bevat verouderde auth methode |
| Versie < 8.0 | ❌ Geen ondersteuning | Onveilig |

## 🔒 Beveiligingsmaatregelen (v8.1)

In deze versie zijn belangrijke stappen gezet om te voldoen aan AVG/GDPR richtlijnen:

1.  **Geen Hardcoded Secrets:** Wachtwoorden staan niet meer in de broncode of omgevingsvariabelen als platte tekst.
2.  **Database Authenticatie:** Beheerders loggen in via een database-check. Wachtwoorden worden opgeslagen als **Bcrypt hashes** en zijn nooit leesbaar, zelfs niet voor de database-beheerder.
3.  **Sessiebeheer:** Na inloggen wordt een **HTTP-Only JWT Cookie** geplaatst. Deze is onleesbaar voor JavaScript (bescherming tegen XSS) en verloopt automatisch na 8 uur.
4.  **Input Sanitization:** Alle invoer (zowel app als admin) wordt gezuiverd met DOMPurify om XSS-aanvallen te voorkomen.
5.  **SQL Parameters:** Alle database-queries gebruiken geparameteriseerde invoer om SQL-injectie onmogelijk te maken.

## 🐛 Een kwetsbaarheid melden
Heb je een beveiligingslek gevonden?
1. Maak géén publiek issue aan op GitHub.
2. Neem direct contact op met de beheerder.
3. Vermeld stappen om het lek te reproduceren.

## ⚖️ Disclaimer
Deze software wordt aangeboden "as-is". Gebruik in productie is op eigen risico. Er is geen garantie op uptime van de cloud-sync functies (Neon/Netlify).

Laatste update: 2025