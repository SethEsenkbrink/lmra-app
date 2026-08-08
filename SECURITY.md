# 🛡️ Security & Privacy Protocol - LMRA Pro (v10.0.0)

LMRA Pro is ontworpen volgens het **Client-Side Privacy-First** principe.

## 🔒 1. Privacy & Gegevensverwerking
* **100% Client-Side:** Alle data (inclusief risico-analyses, werkorders, tijden en opmerkingen) worden uitsluitend lokaal verwerkt in de browser van het apparaat van de monteur.
* **Geen Externe Server:** Geen verzending van persoonsgegevens of rapportages naar externe databases of servers.
* **Lokale Opslag:** Gegevens worden bewaard via de asynchrone browser-database `IndexedDB`.

## 📄 2. PDF Generatie
* **Veilige Client-Side Generatie:** PDF-rapportages worden direct in het geheugen van de browser gegenereerd (`jsPDF`).
* **HTML Sanitization:** Alle tekstinvoer wordt geschoond via `DOMPurify` tegen XSS (Cross-Site Scripting).

## 🐛 3. Kwetsbaarheden Melden
Mocht je een beveiligingsprobleem ontdekken in de broncode, dan kun je een issue aanmaken op de open-source GitHub repository: [https://github.com/SethEsenkbrink/lmra-app](https://github.com/SethEsenkbrink/lmra-app).