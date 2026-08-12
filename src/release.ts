// src/release.ts
//
// Release notes die in het update-scherm van de app worden getoond.
// Het versienummer komt uit APP_VERSION (package.json), dus dat hoeft hier niet.
//
// forceShow: alleen op true zetten als je wilt dat ELKE gebruiker het scherm
// opnieuw ziet, ook wanneer hij deze versie al heeft weggeklikt. Standaard false,
// anders verschijnt de popup bij iedere start van de app.

export const RELEASE_INFO = {
    title: "v10.1.1 Snellere start & correcte PDF",
    features: [
        "PDF-rapport: vinkjes en kruisjes werden onleesbare tekens in de PDF, dat is nu opgelost. Foto's houden hun verhouding en het bestand is kleiner",
        "Sneller opstarten: de app laadt nu ruim vier keer minder code bij de start, de PDF-motor komt op de achtergrond binnen",
        "GPS & Weer: werkt nu betrouwbaar in fabriekshallen. Geen satellietfix? Dan netwerklocatie of coordinaten, en het weer komt los binnen",
        "Spraak-naar-tekst: geen dubbele tekst meer bij langer inspreken",
        "Handtekening: scherper, blijft staan als het toetsenbord opent en is altijd leesbaar in de PDF. Nieuwe Herstel-knop",
        "Diagnose & Logs: nieuw menu-item om fouten, netwerk en GPS ter plaatse te controleren en te exporteren",
        "Cookievoorkeuren: je keuze is nu altijd te wijzigen via het menu"
    ],
    forceShow: false
};
