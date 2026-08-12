/**
 * content/pages.mjs - Inhoud van alle losse pagina's (templates + kennisbank)
 *
 * Eén plek voor alle teksten. scripts/build-pages.mjs zet dit om in HTML met de
 * vaste layout, en werkt tegelijk de sitemap bij. Zo hoef je nooit tien
 * HTML-bestanden los bij te werken.
 *
 * Schrijfstijl: Nederlands op B2-niveau. Korte zinnen, je-vorm, vaktermen worden
 * uitgelegd, geen marketingtaal. Alsof je het aan een collega uitlegt.
 */

export const SITE = {
    baseUrl: 'https://lmrapro.nl',
    name: 'LMRA Pro',
};

/** Landingspagina's per taak-template. */
export const TEMPLATE_PAGES = [
    {
        slug: 'lmra-werken-op-hoogte',
        published: '2026-04-08',
        modified: '2026-07-14',
        template: 'hoogte',
        title: 'LMRA Werken op Hoogte - Gratis Checklist App',
        description:
            'Doe een LMRA voor werken op hoogte op je telefoon. Extra vragen over valbeveiliging, stabiliteit en de zone onder het werk. Gratis, offline en met PDF-rapport.',
        h1: 'LMRA voor werken op hoogte',
        intro:
            'Vallen van hoogte is nog altijd de meest voorkomende oorzaak van dodelijke arbeidsongevallen in ' +
            'Nederland. Vaak niet van tien meter, maar van een ladder of een steiger van twee meter. Deze LMRA ' +
            'loopt in één minuut met je door wat je moet checken voordat je omhoog gaat.',
        sections: [
            {
                h2: 'Wat controleer je voordat je omhoog gaat?',
                paragraphs: [
                    'Naast de zeven basisvragen stelt de app drie vragen die specifiek over hoogte gaan. Ze lijken simpel, maar juist die punten gaan in de praktijk mis:',
                ],
                list: [
                    'Is de valbeveiliging aanwezig, gekeurd en ook echt aangebracht? Een harnas dat in de bus ligt beschermt niemand. Let ook op het ankerpunt: dat moet minstens 10 kN kunnen houden.',
                    'Staan ladder, steiger of hoogwerker stabiel op een vlakke en draagkrachtige ondergrond? Denk aan een putdeksel, een tegel die wegzakt of een helling die je pas ziet als je boven staat.',
                    'Is de zone onder je afgezet? Alles wat jij laat vallen komt bij een collega terecht. Een moersleutel van tien meter hoogte is levensgevaarlijk.',
                ],
            },
            {
                h2: 'Wind wordt automatisch meegewogen',
                paragraphs: [
                    'Druk je op de weerknop, dan haalt de app de actuele windsnelheid op voor jouw locatie. Komt die boven 40 km/h (windkracht 6), dan krijg je een waarschuwing bij de vraag over de hoogwerker en de afzetting. Boven die grens mogen de meeste hoogwerkers en rolsteigers niet meer gebruikt worden.',
                    'Dat is bewust gekoppeld aan de vraag zelf en niet alleen aan een weerbericht bovenaan. Een melding die naast de knop staat waar je op moet tikken, sla je minder snel over.',
                ],
            },
            {
                h2: 'Veelgemaakte fouten',
                list: [
                    'De LMRA achteraf invullen in de bus. Dan is het administratie, geen veiligheidscheck.',
                    'Een ladder gebruiken voor werk waar een steiger of hoogwerker bij hoort. Een ladder is een klimmiddel, geen werkplek.',
                    'Het ankerpunt kiezen op gevoel. Een leiding of kabelgoot is geen ankerpunt.',
                    'Denken dat het voor "even twee minuten" niet hoeft. De meeste valongevallen gebeuren bij korte klussen.',
                ],
            },
        ],
        faq: [
            {
                q: 'Vanaf welke hoogte is een LMRA verplicht?',
                a: 'De Arbowet noemt geen vaste grens voor de LMRA zelf: je doet hem bij elke taak. Voor valgevaar geldt in Nederland dat je vanaf 2,5 meter maatregelen moet nemen, maar ook onder die hoogte kan vallen ernstig aflopen, bijvoorbeeld boven een uitstekende as of een trapgat.',
            },
            {
                q: 'Werkt de app ook op een steiger zonder bereik?',
                a: 'Ja. De app werkt offline zodra je hem één keer met verbinding hebt geopend. Alleen het ophalen van adres en weer heeft internet nodig; de rest van de LMRA en het PDF-rapport werkt zonder bereik.',
            },
        ],
    },
    {
        slug: 'lmra-besloten-ruimte',
        published: '2026-04-22',
        modified: '2026-06-30',
        template: 'besloten',
        title: 'LMRA Besloten Ruimte - Checklist voor Tank, Put en Silo',
        description:
            'LMRA voor werken in een besloten ruimte: vrijgave, gasmeting, mangatwacht en redding. Gratis app op je telefoon, werkt offline en levert direct een PDF.',
        h1: 'LMRA voor een besloten ruimte',
        intro:
            'Een tank, put, silo, riool of kruipruimte is een besloten ruimte. Wat het gevaarlijk maakt, ruik of ' +
            'zie je meestal niet: te weinig zuurstof, gas dat zwaarder is dan lucht, of een ruimte die pas vult ' +
            'terwijl je er in zit. Bijna elk dodelijk ongeval hier komt door een ontbrekende meting of een ' +
            'ontbrekende wacht.',
        sections: [
            {
                h2: 'De drie vragen die het verschil maken',
                list: [
                    'Is de ruimte vrijgegeven, gemeten en wordt er geventileerd? Meten betekent zuurstof (O2), explosiegevaar (LEL) en giftige gassen zoals H2S. Eén meting bij het mangat is niet genoeg: meet ook op de diepte waar je gaat werken.',
                    'Staat er een mangatwacht buiten met een werkend communicatiemiddel? Die persoon gaat er nooit zelf in. Meer dan de helft van de slachtoffers in besloten ruimtes zijn redders.',
                    'Is de toegang veiliggesteld en is redding geregeld? Weet je hoe iemand eruit komt die onwel wordt? Zonder driepoot en harnas krijg je iemand niet omhoog.',
                ],
            },
            {
                h2: 'Warm weer maakt het extra riskant',
                paragraphs: [
                    'In een stalen tank in de zon loopt de temperatuur veel hoger op dan buiten. Haalt de app een buitentemperatuur boven 27 graden op, dan krijg je bij de vraag over de vrijgave een waarschuwing om de werkduur te beperken en extra te ventileren.',
                    'Combineer dat met kort werken, aflossen en veel drinken. Uitdroging merk je te laat: eerst hoofdpijn en concentratieverlies, en juist dat maakt fouten in een besloten ruimte gevaarlijk.',
                ],
            },
        ],
        faq: [
            {
                q: 'Wat is precies een besloten ruimte?',
                a: 'Een ruimte die niet bedoeld is om in te verblijven, die maar één of twee ingangen heeft en waar de lucht niet vanzelf goed doorstroomt. Denk aan een tank, ketel, silo, put, riool, kruipruimte of een scheepsruim.',
            },
            {
                q: 'Vervangt deze LMRA de werkvergunning?',
                a: 'Nee. Voor een besloten ruimte heb je vrijwel altijd een werkvergunning met een meetrapport nodig. De LMRA is de laatste check ter plaatse: is alles wat op papier staat ook echt zo geregeld?',
            },
        ],
    },
    {
        slug: 'lmra-heet-werk',
        published: '2026-05-20',
        modified: '2026-07-02',
        template: 'heet',
        title: 'LMRA Heet Werk - Checklist voor Lassen, Slijpen en Snijden',
        description:
            'LMRA voor heet werk: vergunning, brandbaar materiaal, blusmiddel, brandwacht en nazorg. Gratis checklist-app met PDF-rapport, werkt offline.',
        h1: 'LMRA voor heet werk',
        intro:
            'Lassen, slijpen, snijden, solderen en föhnen zijn heet werk. Vonken springen verder dan je denkt: tot ' +
            'tien meter, en via een kier of een riool nog verder. Het beruchte van heet werk is dat de brand vaak ' +
            'pas uren later ontstaat, als iedereen naar huis is.',
        sections: [
            {
                h2: 'Wat je checkt vlak voor de eerste vonk',
                list: [
                    'Is er een geldige heet-werkvergunning en is de omgeving vrij van brandbaar materiaal? Ruim op, dek af en houd rekening met wat je niet ziet: isolatie, houten balken, stof in een goot.',
                    'Staat er blusmiddel binnen handbereik en is er een brandwacht? Een brandwacht doet niets anders dan kijken. Iemand die "ook even meehelpt" is geen brandwacht.',
                    'Zijn openingen, riolen en leidingen afgedekt en is nazorg geregeld? Blijf na het werk nog minstens een half uur tot een uur controleren, en kom later nog een keer terug.',
                ],
            },
            {
                h2: 'Wind vergroot je afzetting',
                paragraphs: [
                    'Waait het harder dan 30 km/h, dan waarschuwt de app bij de vraag over openingen en afdekking. Wind blaast vonken over de afzetting heen en jaagt een smeulend haardje in korte tijd aan.',
                    'Werk je buiten bij droog en warm weer, houd dan ook rekening met droog gras en verpakkingsmateriaal. Dat vat sneller vlam dan mensen verwachten.',
                ],
            },
        ],
        faq: [
            {
                q: 'Hoe lang moet je na heet werk controleren?',
                a: 'Veel bedrijven houden minimaal 30 tot 60 minuten nazorg aan, plus een extra controleronde na een paar uur. Kijk wat je eigen werkvergunning of bedrijfsprocedure voorschrijft; dat is bindend.',
            },
            {
                q: 'Mag ik heet werk doen zonder vergunning?',
                a: 'In de industrie vrijwel nooit. Op vaste werkplekken die ingericht zijn voor lassen kan het zonder, maar buiten die plek geldt bijna altijd een vergunningplicht. Twijfel je, dan is dat een NEE in je LMRA.',
            },
        ],
    },
    {
        slug: 'lmra-elektrotechniek',
        published: '2026-06-03',
        modified: '2026-07-09',
        template: 'elektro',
        title: 'LMRA Elektrotechniek - Checklist NEN 3140 op je Telefoon',
        description:
            'LMRA voor werken aan elektrische installaties: spanningsloos maken, vergrendelen, meten, juiste PBM en melding aan de installatieverantwoordelijke.',
        h1: 'LMRA voor elektrotechnisch werk',
        intro:
            'Bij elektrotechnisch werk zit het gevaar in de aanname. "Die groep staat uit" is geen vaststelling, ' +
            'meten is dat wel. Deze LMRA loopt de stappen na die in NEN 3140 en de VIAG/BEI de kern zijn van ' +
            'veilig werken aan een installatie.',
        sections: [
            {
                h2: 'Spanningsloos werken in drie controles',
                list: [
                    'Is de installatie spanningsloos gemaakt, vergrendeld en met een meting gecontroleerd? Dat is de volgorde: uitschakelen, vergrendelen met je eigen slot (LOTOTO), en dan meten op de plek waar je gaat werken.',
                    'Gebruik je gereedschap en PBM die geschikt zijn voor deze spanning? Geïsoleerd gereedschap met de juiste markering, een gezichtsscherm bij vlambooggevaar en geen ring of metalen horloge om.',
                    'Weet je wie de installatieverantwoordelijke is en is de schakelhandeling gemeld? Als iemand anders kan inschakelen terwijl jij eraan werkt, is de rest van je maatregelen waardeloos.',
                ],
            },
            {
                h2: 'Waarom dit als LMRA en niet alleen als procedure',
                paragraphs: [
                    'Een procedure schrijf je één keer, een LMRA doe je elke keer. Juist bij storingsdienst wisselt de situatie continu: een andere ploeg heeft geschakeld, een kast is niet zoals de tekening zegt, of er hangt een tijdelijke voeding.',
                    'Het PDF-rapport legt vast dat je hebt gemeten en gemeld, met datum, tijd en locatie. Dat is waardevol als er later vragen komen over een storing of een ongeval.',
                ],
            },
        ],
        faq: [
            {
                q: 'Is deze app een vervanging voor NEN 3140?',
                a: 'Nee. NEN 3140 gaat over deskundigheid, procedures en keuringen. Deze app is het hulpmiddel waarmee je de laatste check ter plaatse vastlegt. De verantwoordelijkheid voor bevoegdheid en werkwijze blijft bij jou en je werkgever.',
            },
            {
                q: 'Kan ik de vragen aanpassen aan onze eigen installatie?',
                a: 'Ja. LMRA Pro is open source onder de MIT-licentie. Je kunt de vragenlijst in de broncode aanpassen en je eigen versie hosten, of een verbetervoorstel insturen op GitHub.',
            },
        ],
    },
    {
        slug: 'lmra-hijsen',
        published: '2026-07-01',
        modified: '2026-07-28',
        template: 'hijsen',
        title: 'LMRA Hijsen en Takelen - Checklist voor Kraan en Hijsmiddelen',
        description:
            'LMRA voor hijswerk: gekeurde hijsmiddelen, lasttabel, afgezette hijszone en afspraken met de kraanmachinist. Gratis app met PDF-rapport.',
        h1: 'LMRA voor hijsen en takelen',
        intro:
            'Bij hijsen gaat het bijna altijd op drie manieren mis: de last is zwaarder dan gedacht, een hijsband ' +
            'is beschadigd of niet gekeurd, of er loopt iemand onder de last. Deze LMRA controleert precies die ' +
            'drie punten voordat de last van de grond komt.',
        sections: [
            {
                h2: 'Kijken, rekenen en afspreken',
                list: [
                    'Zijn de hijsmiddelen gekeurd en valt het gewicht binnen de lasttabel? Kijk naar de keuringsdatum én naar de staat: een insnijding of knik in een band keurt af, ongeacht de sticker.',
                    'Is de hijszone afgezet en blijft niemand onder of naast de last? Ook niet "even snel". Bij een pendelende last is de zone groter dan de last zelf.',
                    'Zijn windkracht, zicht en handsignalen afgesproken met de kraanmachinist? Spreek af wie leidt en wat je doet als je elkaar niet meer ziet of hoort.',
                ],
            },
            {
                h2: 'Wind is hier de belangrijkste weerfactor',
                paragraphs: [
                    'Boven windkracht 6 (ongeveer 40 km/h) mag er in de regel niet meer gehesen worden. De app haalt de actuele windsnelheid op en zet een waarschuwing bij de vraag over de afspraken met de kraanmachinist.',
                    'Let ook op zeilwerking: een plaat of paneel vangt veel meer wind dan een compacte last van hetzelfde gewicht. En mist of schemer maakt handsignalen onbruikbaar.',
                ],
            },
        ],
        faq: [
            {
                q: 'Bij welke windkracht moet hijswerk stoppen?',
                a: 'Vaak wordt windkracht 6 als grens aangehouden, maar de fabrikant van de kraan of hoogwerker bepaalt de echte grens. Bij lasten met veel oppervlak ligt die grens lager. De machinist en de hijsplan zijn leidend.',
            },
            {
                q: 'Geldt deze LMRA ook voor een takel of kettingtakel binnen?',
                a: 'Ja. De vragen over keuring, lasttabel en de zone onder de last gelden net zo goed voor een kettingtakel in de werkplaats als voor een mobiele kraan buiten.',
            },
        ],
    },
];

/** Kennisbank-artikelen. */
export const ARTICLE_PAGES = [
    {
        slug: 'verschil-rie-tra-lmra',
        published: '2026-03-18',
        modified: '2026-06-02',
        title: 'Verschil tussen RI&E, TRA en LMRA - Simpel Uitgelegd',
        description:
            'RI&E, TRA en LMRA worden vaak door elkaar gehaald. Dit is het verschil in wie het maakt, wanneer het gebeurt en hoe lang het duurt, met een voorbeeld uit de praktijk.',
        h1: 'RI&E, TRA of LMRA: wat is het verschil?',
        intro:
            'Drie afkortingen die op elkaar lijken en toch iets heel anders zijn. Het verschil zit in twee dingen: ' +
            'wie het maakt en wanneer het gebeurt. Als je dat weet, haal je ze nooit meer door elkaar.',
        sections: [
            {
                h2: 'RI&E: het hele bedrijf, één keer per paar jaar',
                paragraphs: [
                    'De Risico-Inventarisatie en -Evaluatie is verplicht voor elk bedrijf met personeel. Hierin staat welke risico\'s er in het hele bedrijf zijn en wat je eraan doet. Denk aan geluid in de productiehal, beeldschermwerk op kantoor en het werken met chemie.',
                    'De RI&E wordt gemaakt door de werkgever, meestal met een arbo-deskundige, en hij wordt regelmatig bijgewerkt: bij een verbouwing, nieuwe machines of ander werk. Het is een document op kantoor, geen hulpmiddel op de werkvloer.',
                ],
            },
            {
                h2: 'TRA: één specifieke klus, vooraf uitgewerkt',
                paragraphs: [
                    'Een Taak Risico Analyse gaat over één taak die niet standaard of extra risicovol is. Bijvoorbeeld het vervangen van een pomp in een tankput, of hijswerk boven een leidingstraat.',
                    'De TRA wordt vooraf gemaakt, vaak door een werkvoorbereider samen met de uitvoerenden. Je splitst de klus op in stappen, benoemt bij elke stap het risico en bepaalt de maatregel. Het resultaat is een document dat bij de werkvergunning hoort.',
                ],
            },
            {
                h2: 'LMRA: jij, op de plek, één minuut voor je begint',
                paragraphs: [
                    'De Laatste Minuut Risico Analyse doe je zelf, ter plaatse, vlak voordat je begint. Geen kantoor, geen deskundige: alleen jij en wat je met je eigen ogen ziet.',
                    'Het doel is om te zien wat er ánders is dan gepland. De TRA zegt bijvoorbeeld dat de leiding leeg en drukloos is, maar jij ziet een manometer die 2 bar aangeeft. Dat is precies waar de LMRA voor bedoeld is.',
                ],
            },
            {
                h2: 'Een voorbeeld met alle drie',
                paragraphs: [
                    'Stel: je vervangt een afsluiter op een leiding op vier meter hoogte.',
                ],
                list: [
                    'RI&E: het bedrijf heeft vastgesteld dat werken op hoogte en werken aan leidingsystemen risico\'s zijn, en dat daar procedures en opleidingen voor gelden.',
                    'TRA: voor deze klus is uitgewerkt dat er een rolsteiger komt, dat de leiding drukloos en leeg moet zijn en dat er een tweede persoon bij is.',
                    'LMRA: jij staat er en constateert dat de vloer onder de steiger een open goot heeft, dat de leiding nog niet leeg is en dat het hard waait. Drie redenen om nog niet te beginnen.',
                ],
            },
            {
                h2: 'Kort samengevat',
                list: [
                    'RI&E: hele bedrijf, werkgever, jaren geldig.',
                    'TRA: één klus, vooraf, met de werkvoorbereiding.',
                    'LMRA: één moment, door jou, op de werkplek, in één tot drie minuten.',
                    'De LMRA vervangt de andere twee nooit, en de andere twee vervangen de LMRA nooit.',
                ],
            },
        ],
        faq: [
            {
                q: 'Is een LMRA wettelijk verplicht?',
                a: 'De Arbowet noemt de LMRA niet met die naam, maar verplicht je wel om veilig te werken en risico\'s te beoordelen. In VCA-gecertificeerde bedrijven en in de meeste bedrijfsprocedures is de LMRA daarom een harde eis.',
            },
            {
                q: 'Moet je een LMRA vastleggen op papier?',
                a: 'Dat hangt van je opdrachtgever af. Veel bedrijven willen een vastlegging zien, en steeds vaker digitaal met datum, tijd, locatie en handtekening. Een PDF-rapport is daarvoor prima.',
            },
        ],
    },
    {
        slug: 'wat-controleer-je-bij-een-lmra',
        published: '2026-05-06',
        modified: '2026-07-21',
        title: 'Wat Controleer je bij een LMRA? 7 Vragen met Voorbeelden',
        description:
            'De zeven basisvragen van een LMRA, met per vraag een voorbeeld van wat er in de praktijk misgaat. Plus wat je doet als het antwoord NEE is.',
        h1: 'Wat controleer je bij een LMRA?',
        intro:
            'Een LMRA is geen lijst die je afvinkt, maar zeven momenten waarop je even echt kijkt. Hieronder staan ' +
            'de basisvragen met per vraag een voorbeeld uit de praktijk. Herken je de situatie, dan onthoud je de ' +
            'vraag ook beter.',
        sections: [
            {
                h2: '1. Ben ik fit voor deze klus?',
                paragraphs: [
                    'Slecht geslapen, ziek, net ruzie gehad of aan het einde van een dubbele dienst: je reactietijd en je aandacht gaan omlaag. Dat is niet zwak, dat is menselijk.',
                    'In de praktijk: iemand die na een nachtdienst "nog even" een klus oppakt, ziet de tweede afsluiter over het hoofd. Dit is de enige vraag die alleen jij kunt beantwoorden.',
                ],
            },
            {
                h2: '2. Weet ik wat ik doe bij nood?',
                paragraphs: [
                    'Welk nummer bel je op dit terrein? Waar is de vluchtroute, waar hangt de AED, waar is het verzamelpunt? Op een vreemde locatie weet je dat niet automatisch.',
                    'In de praktijk: bij een beginnende brand kostte het vier minuten om te achterhalen dat het interne alarmnummer niet 112 was.',
                ],
            },
            {
                h2: '3. Is de werkvergunning correct en getekend?',
                paragraphs: [
                    'Klopt wat er op de vergunning staat met wat je gaat doen, en met de plek waar je staat? Let op de geldigheidstijd: een vergunning van gisteren is geen vergunning.',
                    'In de praktijk: de vergunning gold voor pomp 3, de monteur stond bij pomp 4. Zelfde ruimte, ander systeem, wel onder druk.',
                ],
            },
            {
                h2: '4. Heb ik de TRA gelezen en begrepen?',
                paragraphs: [
                    'Gelezen is niet hetzelfde als begrepen. Als je de maatregelen niet kunt navertellen, dan weet je ze niet.',
                    'In de praktijk: een TRA schreef aflossing na 20 minuten voor vanwege de hitte in de ruimte. Niemand had dat gelezen; de ploeg zat er 50 minuten in.',
                ],
            },
            {
                h2: '5. Is de installatie veiliggesteld?',
                paragraphs: [
                    'Spanningsloos, drukloos, leeg, geblokkeerd en vergrendeld met je eigen slot. En daarna gecontroleerd, want vergrendelen zonder meten is hopen.',
                    'In de praktijk: de schakelaar stond uit, maar de installatie had een tweede voeding voor de besturing. Meten had dat direct laten zien.',
                ],
            },
            {
                h2: '6. Heb ik de juiste PBM en gekeurd gereedschap?',
                paragraphs: [
                    'De juiste PBM voor déze klus, niet de PBM die je toevallig aanhebt. En gereedschap met een geldige keuring en zonder schade.',
                    'In de praktijk: een beschadigde hijsband ging nog "één keer" mee. Dat is de klassieke laatste keer.',
                ],
            },
            {
                h2: '7. Is de werkplek afgezet en vrij van struikelgevaar?',
                paragraphs: [
                    'Kan er iemand onverwacht doorlopen? Liggen er slangen, kabels of gereedschap in de looproute? Werkt de verlichting?',
                    'In de praktijk: de meeste verzuimongevallen in de techniek zijn geen spectaculaire ongelukken, maar struikelen en verstappen.',
                ],
            },
            {
                h2: 'En als het antwoord NEE is?',
                paragraphs: [
                    'Dan begin je niet. Je maakt het eerst veilig, of je legt het werk stil en overlegt met je leidinggevende of de opdrachtgever. In LMRA Pro moet je bij elke NEE opschrijven welke maatregel je neemt; die maatregel komt in het PDF-rapport te staan.',
                    'Dat is geen bureaucratie. Het is het verschil tussen "we hebben het gezien" en "we hebben er iets aan gedaan".',
                ],
            },
        ],
        faq: [
            {
                q: 'Hoe lang mag een LMRA duren?',
                a: 'Eén tot drie minuten. Duurt het structureel langer, dan zit er waarschijnlijk werk in dat eigenlijk een TRA of werkvergunning nodig heeft.',
            },
            {
                q: 'Moet ik bij elke onderbreking een nieuwe LMRA doen?',
                a: 'Bij een korte pauze niet, maar wel na een lange onderbreking, bij een nieuwe taak of zodra de omstandigheden veranderen: ander gereedschap, andere plek, andere ploeg of ander weer.',
            },
        ],
    },
    {
        slug: 'werken-bij-hitte',
        published: '2026-06-24',
        modified: '2026-08-04',
        title: 'Werken bij Hitte: Wat Zegt de Arbowet en Wat Doe Je?',
        description:
            'Werken bij hitte op de werkvloer: welke temperatuur is te warm, wat zegt de Arbowet, hoeveel water moet je drinken en hoe herken je hittestress bij een collega.',
        h1: 'Werken bij hitte: wat doe je op de werkvloer?',
        intro:
            'Warme zomers worden normaal, en hitte is op de werkvloer een echt veiligheidsrisico. Niet alleen omdat ' +
            'je onwel kunt worden, maar vooral omdat je slechter nadenkt. Concentratieverlies bij 32 graden is de ' +
            'oorzaak van fouten die bij 18 graden niet gemaakt worden.',
        sections: [
            {
                h2: 'Wat zegt de wet precies?',
                paragraphs: [
                    'De Arbowet noemt geen maximumtemperatuur. Er staat geen getal in waarboven je naar huis mag. Wat er wel staat, is dat de werkgever moet zorgen dat het werk geen nadelige gevolgen heeft voor de gezondheid van werknemers (Arbobesluit, hoofdstuk over fysische factoren).',
                    'Dat betekent in de praktijk: de werkgever moet maatregelen nemen zodra de temperatuur een risico wordt. Wat een goede maatregel is, hangt af van het werk. Zwaar lichamelijk werk in de zon vraagt eerder om ingrijpen dan zittend werk in de schaduw.',
                ],
            },
            {
                h2: 'Praktische grenzen die vaak worden gebruikt',
                list: [
                    'Boven 25 graden: let op lichte kleding, zonbescherming en beschikbaarheid van water.',
                    'Boven 27 graden: drink elk kwartier, verplaats zwaar werk naar de ochtend en houd elkaar in de gaten.',
                    'Boven 30 graden: neem elk uur 10 tot 15 minuten pauze in de schaduw en wissel taken af.',
                    'Boven 35 graden: overweeg om zwaar werk stil te leggen of te verschuiven naar de vroege ochtend.',
                ],
                paragraphs: [
                    'Dit zijn richtlijnen, geen wetsartikelen. Je eigen bedrijfsregels of cao kunnen strenger zijn, en die gaan voor.',
                ],
            },
            {
                h2: 'Hoeveel moet je drinken?',
                paragraphs: [
                    'Bij warm weer en lichamelijk werk is 200 tot 250 ml water per 15 tot 20 minuten een veelgebruikte richtlijn. Dat is ongeveer een half tot driekwart liter per uur, en dus veel meer dan de meeste mensen op een dag drinken.',
                    'Belangrijk: drink vóórdat je dorst hebt. Dorst is een laat signaal, en bij zwaar werk in de hitte loop je dan al achter. Water werkt beter dan energiedrank, en koffie of cola helpt niet mee.',
                ],
            },
            {
                h2: 'Hittestress herkennen bij een collega',
                list: [
                    'Hoofdpijn, duizeligheid of misselijkheid.',
                    'Verward reageren, trager werken of chaotisch handelen.',
                    'Veel zweten en daarna juist droge, rode huid: dat laatste is een alarmsignaal.',
                    'Spierkrampen, vooral in de benen en buik.',
                ],
                paragraphs: [
                    'Zie je deze signalen, breng de collega dan naar een koele plek, laat hem drinken en koel de nek en onderarmen. Bij verwardheid, bewusteloosheid of een droge hete huid: direct 112 en het interne alarmnummer bellen. Dat kan een hitteberoerte zijn, en dat is levensbedreigend.',
                ],
            },
            {
                h2: 'Hitte meenemen in je LMRA',
                paragraphs: [
                    'In LMRA Pro haal je met de weerknop de actuele temperatuur en windsnelheid op voor je locatie. Vanaf 27 graden krijg je concrete adviezen over pauzes en drinken, en die adviezen komen ook in het PDF-rapport te staan.',
                    'Dat laatste is meer dan een detail: het legt vast onder welke omstandigheden je gewerkt hebt en welke maatregelen golden. Werk je in een besloten ruimte, dan waarschuwt de app extra, omdat het daarbinnen veel warmer wordt dan buiten.',
                ],
            },
        ],
        faq: [
            {
                q: 'Mag ik weigeren te werken als het te warm is?',
                a: 'Je mag werk stilleggen als je meent dat er ernstig gevaar voor je gezondheid is. Overleg altijd eerst met je leidinggevende en leg vast waarom. Meestal is een aangepaste werkwijze, andere tijden of extra pauzes de oplossing.',
            },
            {
                q: 'Geldt hitte ook binnen in een fabriekshal?',
                a: 'Ja, en daar is het vaak erger. Naast de buitentemperatuur komt de warmte van machines, ovens en verlichting erbij, terwijl er weinig luchtstroming is. Meet daar de temperatuur op de werkplek zelf.',
            },
        ],
    },
];

/** Losse pagina met het gratis printbare formulier. */
export const FORM_PAGE = {
    slug: 'lmra-formulier-pdf',
        published: '2026-02-11',
        modified: '2026-06-18',
    title: 'Gratis LMRA Formulier (PDF) - Downloaden en Printen',
    description:
        'Download gratis een blanco LMRA-formulier als PDF om te printen. Inclusief de zeven basisvragen, ruimte voor maatregelen en een handtekening. Of doe het digitaal.',
    h1: 'Gratis LMRA-formulier als PDF',
    intro:
        'Niet elke werkplek leent zich voor een telefoon. Voor die situaties staat hier een blanco ' +
        'LMRA-formulier dat je kunt downloaden, printen en op een klembord meenemen. Geen registratie, geen ' +
        'e-mailadres, geen watermerk.',
    sections: [
        {
            h2: 'Wat staat er op het formulier?',
            list: [
                'Ruimte voor bedrijf, monteur, locatie, werkorder en datum en tijd.',
                'De zeven basisvragen met JA/NEE-vakjes.',
                'Bij elke vraag een regel voor de maatregel die je neemt bij NEE.',
                'Een veld voor opmerkingen, de eigen verklaring en de handtekening.',
            ],
        },
        {
            h2: 'Digitaal of op papier?',
            paragraphs: [
                'Papier werkt altijd en heeft geen batterij nodig. Het nadeel ken je: het kaartje wordt nat, verdwijnt in de bus of wordt achteraf ingevuld. En je moet het later nog uitzoeken en scannen.',
                'Digitaal via de app kost even zoveel tijd, maar zet datum, tijd en locatie automatisch vast, waarschuwt je bij gevaarlijk weer en levert direct een leesbaar PDF-rapport dat je kunt doorsturen. Bovendien werkt de app offline, dus ook zonder bereik in een kelder of hal.',
            ],
        },
        {
            h2: 'Mag ik dit formulier binnen mijn bedrijf gebruiken?',
            paragraphs: [
                'Ja. Het formulier en de app zijn open source onder de MIT-licentie. Je mag het printen, aanpassen, van je eigen logo voorzien en binnen je bedrijf uitdelen, ook commercieel. Een verwijzing naar lmrapro.nl wordt gewaardeerd maar is niet verplicht.',
            ],
        },
    ],
    faq: [
        {
            q: 'Is dit formulier goedgekeurd door een instantie?',
            a: 'Nee. Er bestaat geen officieel voorgeschreven LMRA-formulier. Dit formulier volgt de gangbare praktijk in de techniek en industrie. Je eigen bedrijfsprocedure of die van de opdrachtgever gaat altijd voor.',
        },
        {
            q: 'Kan ik er onze eigen vragen op zetten?',
            a: 'De broncode staat op GitHub, dus je kunt de vragen aanpassen en je eigen PDF genereren. In de app kies je daarnaast een soort werk, waarmee je extra vragen krijgt voor hoogte, besloten ruimte, heet werk, elektro of hijsen.',
        },
    ],
    downloadFile: '/lmra-formulier-blanco.pdf',
};
