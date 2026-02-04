// src/release.ts
// DIT IS HET ENIGE BESTAND DAT JE AANPAST VOOR DE MELDING NA EEN UPDATE

export const RELEASE_INFO = {
    // Titel van de update (bijv. "Sentinel Security Patch" of "Feature Update")
    title: "Sentinel Security Patch & Dynamic UI",
    
    // De bullet points die de gebruiker ziet
    features: [
        "Dynamische update meldingen geïmplementeerd",
        "Verbeterde stabiliteit bij offline gebruik",
        "Performance optimalisatie database verbinding"
    ],

    // Belangrijk: Als dit true is, wordt de gebruiker gedwongen de update te zien
    // zelfs als ze hem al eens hebben weggeklikt (alleen bij kritieke bugs)
    forceShow: false
};