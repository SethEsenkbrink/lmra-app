# 🛡️ Security Protocol - LMRA Pro v9.8 Sentinel

LMRA Pro "Sentinel Edition" is ontworpen volgens het **Privacy-First & Zero-Trust** principe. Alle gegevens worden lokaal versleuteld voordat ze worden opgeslagen.

## 🔒 1. Encryptie Architectuur
* **Algoritme:** AES-GCM (Advanced Encryption Standard - Galois/Counter Mode) met 256-bit sleutels.
* **Key Derivation:** PBKDF2 (Password-Based Key Derivation Function 2) met:
    * SHA-256 hash
    * 600.000 iteraties (beveiliging tegen brute-force)
    * Unieke 16-byte salt per apparaat
* **Vector:** Unieke 12-byte IV (Initialization Vector) per opgeslagen item.

## 💣 2. Self-Destruct Protocol
Het systeem is uitgerust met een automatische data-vernietiging (crypto-shredding) mechanisme.
* **Trigger:** 5 opeenvolgende foutieve PIN-pogingen.
* **Actie:**
    1.  De encryptiesleutel (afgeleid van de PIN) wordt uit het geheugen gewist.
    2.  De unieke Salt wordt verwijderd.
    3.  Alle IndexedDB data stores (Report Queue, History, Session) worden volledig gewist (`clear()`).
    4.  Local Storage sleutels worden verwijderd.
* **Gevolg:** Zonder de salt en de data is herstel onmogelijk, zelfs met forensische tools.

## 💾 3. Data Opslag
* **Lokaal:** Data wordt uitsluitend versleuteld opgeslagen in `IndexedDB`. Er staat nooit platte tekst (plaintext) op de harde schijf van het apparaat.
* **Cloud (Supabase):**
    * Verbinding verloopt uitsluitend via HTTPS (TLS 1.2+).
    * Row Level Security (RLS) policies zorgen dat alleen geautoriseerde insert-acties zijn toegestaan.

## ⚠️ 4. Disclaimer
De gebruiker is zelf verantwoordelijk voor het onthouden van de 6-cijferige PIN. Er is **geen "Wachtwoord Vergeten"** optie. Bij verlies van de PIN is de lokale data onherroepelijk verloren (by design).