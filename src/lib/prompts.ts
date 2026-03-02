// ============================================
// AI PROMPTS FOR CONSOLIDATIE APP
// ============================================

// Cito BV Achtergrondinformatie - wordt gebruikt in alle AI prompts
export const CITO_CONTEXT = `
ACHTERGRONDINFORMATIE CITO BV:
In Cito BV voeren we maatschappelijke marktactiviteiten uit. Het grootste deel van onze producten en diensten is gericht op Nederlandse onderwijsinstellingen. Cito BV werkt met drie sectoren: PO, VO en Professionals.

SECTOR PO (Primair Onderwijs):
- Leerlingvolgsysteem voor het primair en speciaal onderwijs
- Leerling in beeld - doorstroomtoets
- Toetsen voor kernvakken (taal, rekenen)
- Observatie-instrumenten voor sociaal-emotionele ontwikkeling en motoriek
- Aangepaste versies voor speciale leerlingen

SECTOR VO (Voortgezet Onderwijs):
- Volgsystemen vo en vso/pro voor de onderbouw
- Schoolexamens voor de bovenbouw
- Kijk- en luistertoetsen voor talen (meest bekend)

SECTOR PROFESSIONALS:
Bedient opdrachtgevers uit:
- Bedrijfsleven en overheid
- Middelbaar beroepsonderwijs (mbo)
- Hoger onderwijs
- Internationale opdrachtgevers

Opdrachten binnen Professionals:
- Beroepsonderwijs: vakbekwaamheidsexamens, certificeringstrajecten, pabo toelatingstoetsen
- Nederlands als tweede taal (Nt2): taaltoetsen, naturalisatie- en inburgeringsexamens
- Zakelijke markt (Cito Zakelijk)

PROGRAMMA KLANT IN BEELD:

DOELBEELD VAN HET PROGRAMMA:
"Cito BV ontwikkelt zich tot een organisatie die vanuit een outside-in perspectief werkt, waarin mens, proces en systeem verbonden zijn en dit onderdeel wordt van de cultuur, zodat dienstverlening en samenwerking blijvend aansluiten bij de behoeften van klanten."

VIER DOMEINEN VAN HET PROGRAMMA:
1. MENS - Vaardigheden ontwikkelen voor outside-in werken. Heldere rollen en verantwoordelijkheden. Ruimte voor oefenen en reflectie.
2. PROCES - Organisatiebreed uniform klantproces. Eenduidige opvolging van klantinzichten. Borging in standaard werkwijze.
3. SYSTEEM - Verbetering CRM en klantdata. Integraal 360° klantbeeld. Systemen die proactief handelen ondersteunen.
4. CULTUUR - Van productgericht naar klantgericht. Gedeeld eigenaarschap voor klantrelaties. Sectoroverstijgende samenwerking.

BEOOGDE BATEN:
- Hogere klanttevredenheid (NPS-score, klantfeedback)
- Lagere ongewenste klantuitstroom (churn, verlengingen)
- Betere aansluiting op klantbehoefte (gebruik producten, minder klachten)
- Proactieve klantrelaties (proactieve contactmomenten, eerder signaleren)
- Efficiëntere interne samenwerking (kortere doorlooptijden, minder dubbel werk)
- Betrouwbaar integraal klantbeeld (één klantview, betere datakwaliteit)

BELANGRIJK - ALLE SECTOREN BETREKKEN:
Het programma Klant in Beeld is een organisatiebreed programma dat relevant is voor ALLE drie de sectoren van Cito BV:
- Sector PO: basisscholen, speciaal onderwijs
- Sector VO: middelbare scholen, vso/pro
- Sector Professionals (Zakelijk): bedrijfsleven, overheid, mbo, hoger onderwijs, internationale organisaties

Elke sector heeft een baateigenaar (sectormanager) die verantwoordelijk is voor het realiseren van de baten.

Schrijf sector-overstijgend: de beweging naar outside-in werken en klantpartnerschap geldt voor zowel scholen als zakelijke opdrachtgevers. Vermijd formuleringen die alleen op onderwijs gericht zijn.

METHODIEK PROGRAMMAMANAGEMENT (Prevaas & Van Loon):
Deze app volgt de methodiek uit "Werken aan programma's" voor het ontwikkelen van een gedragen visie.
Een programmavisie bestaat uit vier elementen:
1. HUIDIGE SITUATIE - Waar staan we nu? Wat is de aanleiding voor verandering?
2. GEWENSTE SITUATIE - Waar willen we naartoe? Wat is het beoogde eindbeeld?
3. BEWEGING - Welke verandering is nodig om van huidig naar gewenst te komen?
4. BELANGHEBBENDEN - Voor wie is deze verandering relevant?

Kenmerken van een goede programmavisie:
- Aansprekend en inspirerend
- Richtinggevend zonder te gedetailleerd te zijn
- Gedragen door de betrokkenen (MT)
- Maakt de beweging concreet
- Verbindt de belanghebbenden

Principes uit de methodiek:
- Sturen vanuit visie en doelen boven sturen op inspanningen
- Eigenaarschap aanboren boven opdrachten geven
- Belangen verbinden boven belangen vertegenwoordigen
- Expliciet maken boven impliciet laten
- Werken met het doel voor ogen
`;

export const PARSE_CANVAS_PROMPT = `
Je bent een expert in het extraheren van informatie uit ingevulde formulieren.

${CITO_CONTEXT}

Analyseer het volgende document (een ingevuld MT-canvas voor het programma Klant in Beeld) en extraheer de antwoorden.

Het canvas bevat de volgende vragen:
- VISIE Vraag A: Huidige situatie (Hoe zou je de huidige situatie beschrijven?)
- VISIE Vraag B: Gewenste situatie (Hoe ziet partnerschap eruit?)
- VISIE Vraag C: Beweging (Welke beweging moeten we maken?)
- VISIE Vraag D: Belanghebbenden (Voor wie is deze verandering relevant?)
- DOEL 1: Hoogste prioriteit
- DOEL 2
- DOEL 3
- SCOPE: Wat valt buiten het programma?

Retourneer JSON in dit formaat:
{
  "respondent_name": "string of null",
  "responses": {
    "current_situation": "string",
    "desired_situation": "string",
    "change_direction": "string",
    "stakeholders": "string",
    "goal_1": "string",
    "goal_2": "string",
    "goal_3": "string",
    "out_of_scope": "string"
  }
}

Als een veld niet is ingevuld, gebruik dan een lege string.

DOCUMENT:
`;

export const ANALYZE_THEMES_PROMPT = `
Je bent een expert in het analyseren van kwalitatieve data en het identificeren van patronen.

${CITO_CONTEXT}

Hieronder staan de antwoorden van MT-leden op een vraag over hun visie/doelen voor het programma Klant in Beeld.

VRAAG TYPE: {questionType}

ANTWOORDEN:
{responses}

Analyseer deze antwoorden en identificeer:

1. THEMA'S: Welke thema's/onderwerpen komen terug? Geef elk thema een korte naam en beschrijving.

2. CONSENSUS: Welke thema's worden door meerdere respondenten genoemd?

3. UNIEK: Welke perspectieven zijn uniek (slechts 1 respondent)?

4. SPANNING: Zijn er tegenstrijdige perspectieven?

Retourneer JSON in dit formaat:
{
  "themes": [
    {
      "id": "theme-1",
      "name": "Korte naam van het thema",
      "description": "Uitleg van het thema",
      "mentionedBy": ["respondent_ids die dit noemen"],
      "consensusLevel": "high|medium|low",
      "exampleQuotes": ["citaten uit de antwoorden"],
      "relatedResponses": ["respondent_ids"]
    }
  ],
  "tensions": [
    {
      "themeA": "naam thema A",
      "themeB": "naam thema B",
      "description": "Waarom is er spanning"
    }
  ],
  "quickWins": ["theme names met high consensus"],
  "discussionPoints": ["theme names met spanning of low consensus"]
}

Zorg ervoor dat:
- consensusLevel "high" is als meer dan 66% het noemt
- consensusLevel "medium" is als 33-66% het noemt
- consensusLevel "low" is als minder dan 33% het noemt
`;

export const GENERATE_PROPOSAL_PROMPT = `
Je bent een expert in het formuleren van gedeelde doelstellingen voor organisaties.

${CITO_CONTEXT}

Context: Het programma "Klant in Beeld" bij Cito helpt de organisatie om vanuit een outside-in perspectief te werken en samen te werken als partner met klanten.

Op basis van de volgende input van MT-leden, formuleer een gedeelde tekst voor: {questionLabel}

GEVONDEN THEMA'S:
{themes}

ORIGINELE ANTWOORDEN:
{originalResponses}

Maak 3 varianten van een gedeelde formulering:
1. BEKNOPT: Kernachtig, max 2 zinnen
2. VOLLEDIG: Alle nuances meegenomen, max 4 zinnen
3. GEBALANCEERD: Midden tussen 1 en 2

Elke variant moet:
- Alle belangrijke elementen verwerken
- Consistent zijn met Cito's terminologie (outside-in perspectief, partner, klantgericht)
- Concreet en toetsbaar zijn (geen vage taal)
- In actieve schrijfstijl

Retourneer JSON:
{
  "variants": [
    {
      "id": "variant-1",
      "type": "beknopt",
      "text": "De geformuleerde tekst",
      "emphasizes": "Wat deze variant benadrukt",
      "includesThemes": ["theme_names"]
    },
    {
      "id": "variant-2",
      "type": "volledig",
      "text": "De geformuleerde tekst",
      "emphasizes": "Wat deze variant benadrukt",
      "includesThemes": ["theme_names"]
    },
    {
      "id": "variant-3",
      "type": "gebalanceerd",
      "text": "De geformuleerde tekst",
      "emphasizes": "Wat deze variant benadrukt",
      "includesThemes": ["theme_names"]
    }
  ],
  "recommendation": "gebalanceerd",
  "recommendationRationale": "Waarom deze variant wordt aanbevolen"
}
`;

export const COMBINE_APPROVED_PROMPT = `
Je bent een expert in het schrijven van beleidsdocumenten.

De volgende formuleringen zijn goedgekeurd door het MT van Cito voor het programma Klant in Beeld:

VISIE - HUIDIGE SITUATIE:
{currentSituation}

VISIE - GEWENSTE SITUATIE:
{desiredSituation}

VISIE - BEWEGING:
{changeDirection}

VISIE - BELANGHEBBENDEN:
{stakeholders}

DOELEN:
1. {goal1}
2. {goal2}
3. {goal3}

SCOPE:
Buiten scope: {outOfScope}

Schrijf nu een coherent visie-document dat deze elementen integreert.

Structuur:
1. Visie (3 paragrafen: waar staan we, waar willen we naartoe, welke beweging)
2. Doelen (genummerde lijst met korte toelichting per doel)
3. Scope (wat niet)

Stijl:
- Professioneel maar toegankelijk
- Actief geschreven
- Consistent met Cito BV-terminologie
- Gebruik altijd "Cito BV" (niet alleen "Cito")
- Geen herhaling

Retourneer het document als markdown.
`;

export const QUESTION_LABELS: Record<string, string> = {
  current_situation: "Huidige situatie",
  desired_situation: "Gewenste situatie",
  change_direction: "Beweging/verandering",
  stakeholders: "Belanghebbenden",
  goal_1: "Doel 1",
  goal_2: "Doel 2",
  goal_3: "Doel 3",
  goals: "Doelen",
  out_of_scope: "Buiten scope"
};

export const ANALYZE_GOALS_PROMPT = `
Je bent een expert in het analyseren van doelstellingen en het identificeren van patronen voor organisatieprogramma's.

${CITO_CONTEXT}

CONTEXT: Je analyseert de doelen die MT-leden hebben ingevuld voor het programma Klant in Beeld.
Elk MT-lid heeft 3 doelen gegeven met prioriteiten:
- Prioriteit 1 = Hoogste prioriteit (belangrijkst)
- Prioriteit 2 = Tweede prioriteit
- Prioriteit 3 = Derde prioriteit

DOELEN VAN MT-LEDEN:
{responses}

OPDRACHT:
Analyseer alle doelen en cluster ze naar thema/onderwerp. Let op:

1. CLUSTER SOORTGELIJKE DOELEN: Groepeer doelen die over hetzelfde onderwerp gaan, ook als ze anders geformuleerd zijn.

2. WEEG PRIORITEIT MEE: Doelen met prioriteit 1 zijn belangrijker dan prioriteit 3.

3. MAAK CONCRETE CLUSTERS: Gebruik duidelijke, actieve namen die het doel beschrijven.

4. KOPPEL RESPONDENTEN: Geef aan welke MT-leden dit doel noemden en met welke prioriteit.

BELANGRIJK voor consensusLevel:
- "high" = Genoemd door >50% van MT-leden OF meerdere leden geven dit prioriteit 1
- "medium" = Genoemd door 25-50% van MT-leden
- "low" = Genoemd door <25% van MT-leden

Retourneer JSON in dit formaat:
{
  "themes": [
    {
      "id": "goal-cluster-1",
      "name": "Actieve naam van het doelcluster (bijv. 'CRM verbeteren', 'Klantinzichten delen')",
      "description": "Uitgebreide beschrijving van wat dit doel inhoudt, samengesteld uit de input",
      "mentionedBy": ["namen van MT-leden die dit doel noemden"],
      "consensusLevel": "high|medium|low",
      "exampleQuotes": ["letterlijke citaten uit de doelen"],
      "relatedResponses": ["respondent_ids"],
      "averagePriority": 1.5,
      "priorityBreakdown": {
        "prio1": 2,
        "prio2": 1,
        "prio3": 0
      }
    }
  ],
  "quickWins": ["doelnamen met high consensus"],
  "discussionPoints": ["doelnamen waar MT-leden verschillend over denken"]
}

Zorg voor:
- Maximaal 7-8 clusters (groepeer vergelijkbare doelen)
- Concrete, actieve formuleringen (niet vaag)
- Duidelijke koppeling naar originele input
- Accurate weergave van prioriteiten
`;

