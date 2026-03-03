// src/release.ts
// DIT IS HET ENIGE BESTAND DAT JE AANPAST VOOR DE MELDING NA EEN UPDATE

export const RELEASE_INFO = {
    // Titel van de update
    title: "UI Overhaul & Slimme Timer Update",
    
    // De bullet points die de gebruiker (de monteur) ziet in de pop-up
    features: [
        "Nieuw overzichtelijk zijmenu toegevoegd voor snellere navigatie",
        "Timer bug gefixt: berekening klopt nu altijd, ook bij nachtdiensten",
        "Informatie & Roadmap pagina toegevoegd om onze visie te delen",
        "Update-geschiedenis is vanaf nu altijd handmatig terug te lezen via het menu"
    ],

    // Belangrijk: Omdat de knoppen zijn verplaatst naar een nieuw menu,
    // dwingen we deze pop-up eenmalig af bij alle gebruikers zodat ze op de hoogte zijn.
    forceShow: true
};