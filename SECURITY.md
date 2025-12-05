# Beveiligingsbeleid LMRA Pro

**Versie 8.2 - Sentinel**

Bedankt voor je interesse in de veiligheid van dit project. Dit project is ontwikkeld met een "Security by Design" en "Privacy First" filosofie, geschikt voor professionele inzet.

## 🛡️ Ondersteunde Versies

| Versie | Status | Opmerking |
| :--- | :--- | :--- |
| **Versie 8.2+** | ✅ **Actief Ondersteund** | Huidige standaard (Secure Auth Fix) |
| Versie 8.1 | ⚠️ Uitgefaseerd | Bevat onvolledige redirect flow |
| Versie < 8.1 | ❌ Geen ondersteuning | Onveilig / Verouderd |

## 🔒 Beveiligingsmaatregelen (v8.2)

In deze versie zijn belangrijke stappen gezet om te voldoen aan professionele standaarden:

1.  **Identity Integratie:** Volledige integratie met Netlify Identity voor veilige sessies en wachtwoordbeheer.
2.  **Sessiebeheer:** Automatische logout bij verlopen tokens en veilige opslag van sessie-status.
3.  **Input Sanitization:** Alle invoer (zowel app als admin) wordt gezuiverd met DOMPurify om XSS-aanvallen te voorkomen.
4.  **Rate Limiting:** Backend functies zijn beschermd tegen spam/misbruik.

## 🐛 Een kwetsbaarheid melden
Heb je een beveiligingslek gevonden?
1. Maak géén publiek issue aan op GitHub.
2. Neem direct contact op met de beheerder.
3. Vermeld stappen om het lek te reproduceren.

Laatste update: 2025