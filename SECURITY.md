# Beveiligingsbeleid LMRA Pro

**Versie 9.0 - Sentinel Safe**

LMRA Pro hanteert een "Defense in Depth" strategie. Wij beschermen de monteur én de data.

## 🛡️ Beveiligingsmaatregelen

### 1. Database Security (Supabase RLS)
De database is beveiligd met Row Level Security (RLS).
* **INSERT ONLY:** De publieke applicatie heeft *alleen* rechten om nieuwe rapporten toe te voegen.
* **NO SELECT/DELETE:** Het is onmogelijk om via de publieke API rapporten uit te lezen, aan te passen of te verwijderen.
* Dit voorkomt dat kwaadwillenden data kunnen stelen of de database kunnen wissen.

### 2. Client-Side Encryptie (Data at Rest)
Gevoelige data die lokaal wordt opgeslagen (zoals conceptrapporten) wordt versleuteld.
* **Algoritme:** AES-GCM (256-bit).
* **Sleutel:** Afgeleid van een user-PIN via PBKDF2 (600.000 iteraties).
* **Gevolg:** Bij verlies van het apparaat is de data onleesbaar zonder PIN.

### 3. Content Security Policy (CSP)
Strikte headers blokkeren ongewenste scripts en iframes.
* Alleen vertrouwde CDN's (Tailwind, Supabase, FontAwesome) worden toegelaten.
* Inline scripts zijn beperkt.

### 4. Input Validatie
* **DOMPurify:** Alle gebruikersinvoer wordt gezuiverd ('sanitized') voordat het wordt weergegeven om XSS-aanvallen te voorkomen.