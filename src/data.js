/* src/data.js */
export const categories = [
    { 
        title: "Algemeen & Fitheid", 
        icon: "fa-user-clock", 
        questions: [
            { id: 1, text: "Voel ik mij fysiek en mentaal fit voor deze klus?", type: 'positive' }, 
            { id: 2, text: "Weet ik wat te doen bij nood (alarmnummer, vluchtroute)?", type: 'positive' }
        ] 
    },
    { 
        title: "Vergunningen & Procedures", 
        icon: "fa-file-signature", 
        questions: [
            { id: 3, text: "Is de werkvergunning correct ingevuld en getekend?", type: 'positive' }, 
            { id: 4, text: "Heb ik de taakrisicoanalyse (TRA) gelezen/begrepen?", type: 'positive' }
        ] 
    },
    { 
        title: "Omgeving & Techniek", 
        icon: "fa-bolt", 
        questions: [
            { id: 5, text: "Is de installatie veiliggesteld (LOTOTO / Vrij van spanning)?", type: 'positive' }, 
            { id: 6, text: "Heb ik de juiste PBM's en gekeurd gereedschap?", type: 'positive' }, 
            { id: 7, text: "Is de werkplek afgezet en vrij van struikelgevaar?", type: 'positive' }
        ] 
    }
];