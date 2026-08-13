// src/release.ts
//
// Release notes die in het update-scherm van de app worden getoond.
// Versienummer en codenaam komen uit config.ts, dus die hoeven hier niet hard
// in de tekst.
//
// forceShow: alleen op true zetten als je wilt dat ELKE gebruiker het scherm
// opnieuw ziet, ook wanneer hij deze versie al heeft weggeklikt. Standaard false,
// anders verschijnt de popup bij iedere start van de app.

export const RELEASE_INFO = {
    title: 'v11.0.0 "Horizon Dawn" - start van een nieuwe serie',
    features: [
        'Nieuwe serie: van versie 0.0.0 tot 10.2.1 heette LMRA Pro "Sentinel Safe". Vanaf nu loopt de Horizon-serie, waarin elke grote versie een eigen naam en thema krijgt',
        'Deze periode heet Horizon Dawn: het eerste licht. De basis is opnieuw op orde gezet, zodat de grote uitbreidingen hierna soepel kunnen landen',
        'Versienummer en serienaam staan nu op één plek in de code en lopen automatisch door naar de app, het PDF-rapport, het diagnoserapport en de website',
        'In het menu, in je rapport en in de diagnose zie je altijd precies welke versie en welke periode je gebruikt. Handig als je een probleem doorgeeft',
        'Alles wat je gewend was blijft werken: je rapporten, instellingen, back-ups en QR-stickers gaan onveranderd mee'
    ],
    forceShow: false
};
