// src/release.ts
//
// Release notes die in het update-scherm van de app worden getoond.
// Het versienummer komt uit APP_VERSION (package.json), dus dat hoeft hier niet.
//
// forceShow: alleen op true zetten als je wilt dat ELKE gebruiker het scherm
// opnieuw ziet, ook wanneer hij deze versie al heeft weggeklikt. Standaard false,
// anders verschijnt de popup bij iedere start van de app.

export const RELEASE_INFO = {
    title: "v10.2.1 Soort werk, QR-stickers & hitte-advies",
    features: [
        "Menu scrollt nu door op kleine schermen, scrollbalken in de LMRA Pro-stijl en alle teksten vertaald in vier talen",
        "Soort werk kiezen: naast de basisvragen krijg je extra vragen voor werken op hoogte, besloten ruimte, heet werk, elektrotechniek of hijsen",
        "Weer denkt mee: bij hitte krijg je advies over pauzes en drinken, bij wind een waarschuwing bij de vraag waar het over gaat. Alles komt ook in het PDF-rapport",
        "QR-stickers maken: print kleine stickers (vanaf 20 mm) voor motoren, kasten en ruimtes. Scannen vult de locatie direct in",
        "Back-up en herstel: zet al je rapporten in een bestand en terug op een nieuwe telefoon",
        "Handschoenmodus: veel grotere knoppen en velden, met werkhandschoenen aan",
        "Nu ook in Duits en Pools, naast Nederlands en Engels",
        "Thema en instellingen blijven nu bewaard na het afsluiten"
    ],
    forceShow: false
};
