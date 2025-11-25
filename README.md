🛡️ LMRA Pro - Digitale Veiligheidstool (v7.0)

LMRA Pro is een professionele Progressive Web App (PWA) ontwikkeld voor technici in de proces- en elektrotechniek. De applicatie digitaliseert de Laatste Minuut Risico Analyse en vervangt papieren boekjes door een slim, cloud-connected systeem.

De focus ligt op gebruiksgemak, datavisualisatie en maximale stabiliteit.

🚀 Belangrijkste Functionaliteiten (v7.0 - Ironclad)

👷 Voor de Monteur (Frontend)

Slimme Checklist: Dynamische vragenlijst met verplichte actievelden bij afkeur ("NEE" = verplichte maatregel invullen).

Cloud Opslag: Automatische synchronisatie met een beveiligde Neon (PostgreSQL) database.

Geldigheidsduur: Monteurs stellen zelf start- en eindtijd in. De app waarschuwt automatisch als de sessie (pauze) is verlopen.

Buddy Check: Optioneel vierogenprincipe activeren voor risicovolle taken.

Historie & PDF: Inzien van eigen historie (gegroepeerd per week) en direct exporteren naar een professioneel PDF-rapport.

Dagelijkse Reset: Automatische opruiming van de interface bij de start van een nieuwe werkdag.

Robuustheid: GPS en Weer-functies zijn vereenvoudigd/verwijderd voor maximale betrouwbaarheid in alle omgevingen.

👨‍💻 Voor het Beheer (Admin Dashboard)

Centraal Inzicht: Real-time tabel van alle uitgevoerde LMRA's binnen de organisatie.

Zoekfunctie: Razendsnel filteren op monteursnaam, locatienaam of werkorder.

Beveiligde Toegang: Login met wachtwoordbeveiliging (via Environment Variables).

Data Export: Volledige database dump naar Excel (.xlsx) voor analyse.

Beheer: Mogelijkheid om foutieve rapporten definitief te verwijderen.

🛠️ Technische Architectuur & Beveiliging

Dit project is gebouwd met een Serverless Architecture en voldoet aan strenge veiligheidseisen (v6.3 Audit + v7.0 Stabilisatie).

Frontend: Vanilla HTML5, JavaScript (ES6+) & Tailwind CSS.

Backend: Netlify Functions (Node.js).

Database: Neon (Serverless PostgreSQL).

Security Features:

Sanitization: DOMPurify wordt gebruikt om alle gebruikersinvoer te reinigen voordat deze verwerkt wordt (XSS-preventie).

CSP (Content Security Policy): Geoptimaliseerde regels voor maximale compatibiliteit en veiligheid.

Environment Variables: Geen hardcoded wachtwoorden in de broncode.

Timing Safe Auth: Wachtwoordcontrole in de backend is bestand tegen timing attacks.

🗺️ Roadmap & Toekomstvisie

We blijven innoveren. Dit zijn de ideeën voor toekomstige versies:

🌟 Korte Termijn (v7.x)

[ ] Foto Upload: Mogelijkheid om direct een foto van de onveilige situatie te maken en op te slaan bij het rapport ("Evidence Locker").

[ ] QR-Scanner: Scan een sticker op de machine om direct de juiste locatie en asset-ID in te vullen (voorkomt typefouten).

[ ] Push Notificaties: Een seintje naar de leidinggevende als er een 'STOP' (onveilige situatie) wordt gemeld.

🚀 Lange Termijn (v8.0+)

[ ] Offline Modus: Volledige werking in bunkers/kelders zonder internet, met automatische sync zodra er weer verbinding is.

[ ] Multi-Language: Ondersteuning voor Engels en Duits voor internationale teams.

[ ] AI Analyse: Een slimme assistent die op basis van trefwoorden (bijv. "hoogspanning") extra veiligheidstips suggereert tijdens het invullen.

🔒 Beveiliging & Privacy (AVG/GDPR)

Data: Gegevens worden verwerkt via versleutelde verbindingen (HTTPS) en opgeslagen in Europese datacenters (Neon Frankfurt).

Toegang: Het admin-paneel is afgeschermd en wachtwoorden worden nooit in de browser opgeslagen (alleen in het sessiegeheugen).

Minimalisme: Alleen strikt noodzakelijke data wordt verwerkt.

Ontwikkeld door Seth Esenkbrink - 2025
