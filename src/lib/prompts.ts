// ============================================
// AI PROMPTS FOR CONSOLIDATIE APP
// ============================================

export const PARSE_CANVAS_PROMPT = `
Je bent een expert in het extraheren van informatie uit ingevulde formulieren.

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
- Consistent met Cito-terminologie
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
