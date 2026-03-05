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

Analyseer deze antwoorden en identificeer de kernthema's.

WAT IS EEN THEMA?
Een thema is GEEN vaag trefwoord of categorie. Een thema is een krachtige, inhoudelijke stelling die de kern van wat MT-leden hebben gezegd samenvat. Het thema moet:
- Een duidelijke RICHTING of POSITIE uitdrukken (niet neutraal beschrijvend)
- Concreet en toetsbaar zijn (je kunt het er mee eens of oneens zijn)
- De essentie vangen van wat respondenten daadwerkelijk bedoelen
- Passen binnen de programma-methodiek "Werken aan programma's" (Prevaas & Van Loon)

VOORBEELDEN:
FOUT: "Klantgerichtheid" (te vaag, is slechts een trefwoord)
GOED: "Van productgericht naar klantpartnerschap: Cito BV moet de omslag maken van aanbodgericht werken naar structureel samenwerken met klanten"

FOUT: "CRM" (te abstract)
GOED: "Eén integraal klantbeeld als fundament: alle klantinteracties moeten samenkomen in één betrouwbaar systeem dat proactief handelen mogelijk maakt"

FOUT: "Samenwerking" (nietszeggend)
GOED: "Sectoroverstijgend samenwerken aan klantrelaties: gezamenlijk eigenaarschap voor klantrelaties in plaats van silo-denken per sector"

Identificeer per thema:

1. THEMA'S: Formuleer elk thema als een krachtige stelling met een korte naam (max 5-6 woorden) en een uitgebreide beschrijving (2-3 zinnen) die de inhoudelijke kern helder uiteenzet.

2. CONSENSUS: Welke thema's worden door meerdere respondenten genoemd?

3. UNIEK: Welke perspectieven zijn uniek (slechts 1 respondent)?

4. SPANNING: Zijn er tegenstrijdige perspectieven?

BELANGRIJK - SECTOR-NEUTRAAL, WEL MET NAMEN:
- Gebruik in "mentionedBy" de NAMEN van respondenten (bijv. "Roel", "Leontine"), zodat zichtbaar is wie wat heeft gezegd.
- Verwijs NOOIT naar sectoren (PO, VO, Professionals, Zakelijk), afdelingen (Data & Tech, HR) of rollen in je analyse.
- Citaten in "exampleQuotes" mogen GEEN sector- of rolnamen bevatten. Parafraseer indien nodig zodat het sector-neutraal is.
- De analyse moet het beeld geven van Cito BV als GEHEEL, niet per sector of afdeling.
- Formuleer thema's altijd sector-overstijgend.

EENZIJDIGHEIDSCHECK:
- Controleer na het opstellen van de thema's of het resultaat niet eenzijdig naar één sector leunt (bijv. alleen VO-gericht of alleen PO-gericht).
- Als een antwoord sectorspecifieke taal bevat (bijv. "scholen in het voortgezet onderwijs"), vertaal dit naar een Cito BV-brede formulering (bijv. "onderwijsinstellingen en opdrachtgevers").
- Het eindresultaat moet altijd herkenbaar en toepasbaar zijn voor ALLE sectoren van Cito BV, ongeacht de input.

Retourneer JSON in dit formaat:
{
  "themes": [
    {
      "id": "theme-1",
      "name": "Korte naam van het thema",
      "description": "Uitleg van het thema",
      "mentionedBy": ["Naam respondent 1", "Naam respondent 2"],
      "consensusLevel": "high|medium|low",
      "exampleQuotes": ["citaten zonder sector/rolnamen"],
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

Formuleer EEN gebalanceerde, gedeelde formulering (2-3 zinnen). Deze formulering moet:
- Kernachtig maar volledig zijn: alle belangrijke elementen verwerken zonder vaag te worden
- Consistent zijn met Cito's terminologie (outside-in perspectief, partner, klantgericht)
- Concreet en toetsbaar zijn (geen vage taal)
- In actieve schrijfstijl
- Sector-overstijgend geformuleerd zijn: NOOIT verwijzen naar individuele sectoren (PO, VO, Professionals, Zakelijk) of afdelingen
- Het beeld geven van Cito BV als geheel

Retourneer JSON:
{
  "variants": [
    {
      "id": "variant-1",
      "type": "gebalanceerd",
      "text": "De geformuleerde tekst",
      "emphasizes": "Wat deze formulering benadrukt",
      "includesThemes": ["theme_names"]
    }
  ],
  "recommendation": "gebalanceerd",
  "recommendationRationale": "Toelichting op de gekozen formulering"
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
{goals}

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

export const CONSOLIDATE_FEEDBACK_PROMPT = `
Je bent een expert in het consolideren van feedback op doelstellingen voor organisatieprogramma's.

${CITO_CONTEXT}

CONTEXT: Het MT van Cito heeft doelen opgesteld voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven in de vorm van opmerkingen, tekstwijzigingen en samenvoeg-suggesties. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen.

HUIDIGE DOELEN (clusters):
{clusters}

FEEDBACK VAN MT-LEDEN:
{suggestions}

OPDRACHT:
Analyseer alle feedback en stel concrete wijzigingen voor. Volg deze regels STRIKT:

1. ALLEEN AANPASSEN WAAR FEEDBACK OVER IS
   - Als er GEEN feedback is op een doel, laat het ONGEWIJZIGD
   - Wijzig niets zonder onderbouwing vanuit de feedback
   - Voeg geen eigen interpretaties toe

2. VERGELIJKBARE SUGGESTIES GROEPEREN
   - Als meerdere leden dezelfde of vergelijkbare feedback geven, bundel dit tot één wijzigingsvoorstel
   - Geen dubbelingen in de voorstellen
   - Vermeld alle leden die aan de suggestie hebben bijgedragen

3. KERNFORMULERING BEHOUDEN
   - Herschrijf NOOIT een doelstelling volledig
   - Pas alleen aan wat de feedback concreet vraagt
   - Behoud de structuur, stijl en terminologie van de originele tekst
   - Kleine chirurgische aanpassingen zijn beter dan grote herschrijvingen

4. BRONVERMELDING
   - Koppel elke wijziging aan de specifieke feedback en leden die het onderbouwen
   - Geef een heldere rationale waarom deze wijziging wordt voorgesteld

5. SECTOR-NEUTRAAL
   - Formuleringen moeten sector-overstijgend zijn
   - Past bij "Werken aan programma's" methodiek (Prevaas & Van Loon)
   - Bij doelstellingen: zo geformuleerd dat je er gewenste effecten, benodigde vermogens en concrete inspanningen uit kunt afleiden

WIJZIGINGSTYPEN:
- "edit": Tekstuele aanpassing van naam en/of beschrijving
- "merge": Samenvoegen van twee of meer clusters (als feedback hier expliciet om vraagt)
- "comment_only": Alleen opmerkingen, geen tekstwijziging nodig (wel documenteren)

Retourneer JSON in dit formaat:
{
  "changes": [
    {
      "change_id": "change-1",
      "cluster_id": "het cluster ID waarop de wijziging betrekking heeft",
      "change_type": "edit|merge|comment_only",
      "summary": "Korte samenvatting van de wijziging (1 zin)",
      "rationale": "Waarom deze wijziging wordt voorgesteld, gebaseerd op de feedback",
      "original_name": "Originele naam van het doel",
      "original_description": "Originele beschrijving",
      "proposed_name": "Voorgestelde naam (ongewijzigd als niet nodig)",
      "proposed_description": "Voorgestelde beschrijving (ongewijzigd als niet nodig)",
      "source_suggestions": ["suggestion IDs die deze wijziging onderbouwen"],
      "member_sources": ["namen van leden die feedback gaven"]
    }
  ],
  "unchanged_clusters": ["cluster IDs die ongewijzigd blijven"],
  "consolidation_summary": "Korte samenvatting: hoeveel wijzigingen, hoeveel ongewijzigd, belangrijkste thema's in de feedback"
}

BELANGRIJK:
- Retourneer ALLEEN geldig JSON, geen markdown of extra tekst
- Elk cluster moet óf in "changes" óf in "unchanged_clusters" voorkomen
- proposed_name en proposed_description moeten ALTIJD ingevuld zijn (ook als ongewijzigd)
`;

// Step-type-specific consolidation context for generic feedback
const STEP_TYPE_CONTEXT: Record<string, { label: string; itemLabel: string; description: string }> = {
  doelen: {
    label: "Doelen",
    itemLabel: "doelstelling",
    description: "Het MT van Cito heeft doelen opgesteld voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven in de vorm van opmerkingen, tekstwijzigingen en samenvoeg-suggesties. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen."
  },
  scope: {
    label: "Scope (buiten scope)",
    itemLabel: "scope-item",
    description: "Het MT van Cito heeft scope-afbakening (wat buiten scope valt) opgesteld voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven op de scope-items. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen voor de scope-afbakening."
  },
  visie_huidige: {
    label: "Visie - Huidige situatie",
    itemLabel: "visietekst",
    description: "Het MT van Cito heeft een visietekst opgesteld over de HUIDIGE SITUATIE voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven op deze tekst. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen."
  },
  visie_gewenste: {
    label: "Visie - Gewenste situatie",
    itemLabel: "visietekst",
    description: "Het MT van Cito heeft een visietekst opgesteld over de GEWENSTE SITUATIE voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven op deze tekst. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen."
  },
  visie_beweging: {
    label: "Visie - Beweging",
    itemLabel: "visietekst",
    description: "Het MT van Cito heeft een visietekst opgesteld over de BEWEGING/VERANDERING die nodig is voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven op deze tekst. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen."
  },
  visie_stakeholders: {
    label: "Visie - Stakeholders",
    itemLabel: "visietekst",
    description: "Het MT van Cito heeft een visietekst opgesteld over de STAKEHOLDERS/BELANGHEBBENDEN voor het programma Klant in Beeld. MT-leden hebben async feedback gegeven op deze tekst. Jij consolideert deze feedback tot concrete wijzigingsvoorstellen."
  }
};

export function getConsolidatePrompt(stepType: string): string {
  const ctx = STEP_TYPE_CONTEXT[stepType] || STEP_TYPE_CONTEXT.doelen;
  return `
Je bent een expert in het consolideren van feedback op ${ctx.itemLabel}en voor organisatieprogramma's.

${CITO_CONTEXT}

CONTEXT: ${ctx.description}

HUIDIGE ITEMS (${ctx.label}):
{clusters}

FEEDBACK VAN MT-LEDEN:
{suggestions}

OPDRACHT:
Analyseer alle feedback en stel concrete wijzigingen voor. Volg deze regels STRIKT:

1. ALLEEN AANPASSEN WAAR FEEDBACK OVER IS
   - Als er GEEN feedback is op een item, laat het ONGEWIJZIGD
   - Wijzig niets zonder onderbouwing vanuit de feedback
   - Voeg geen eigen interpretaties toe

2. VERGELIJKBARE SUGGESTIES GROEPEREN
   - Als meerdere leden dezelfde of vergelijkbare feedback geven, bundel dit tot één wijzigingsvoorstel
   - Geen dubbelingen in de voorstellen
   - Vermeld alle leden die aan de suggestie hebben bijgedragen

3. KERNFORMULERING BEHOUDEN
   - Herschrijf NOOIT een ${ctx.itemLabel} volledig
   - Pas alleen aan wat de feedback concreet vraagt
   - Behoud de structuur, stijl en terminologie van de originele tekst
   - Kleine chirurgische aanpassingen zijn beter dan grote herschrijvingen

4. BRONVERMELDING
   - Koppel elke wijziging aan de specifieke feedback en leden die het onderbouwen
   - Geef een heldere rationale waarom deze wijziging wordt voorgesteld

5. SECTOR-NEUTRAAL
   - Formuleringen moeten sector-overstijgend zijn
   - Past bij "Werken aan programma's" methodiek (Prevaas & Van Loon)

WIJZIGINGSTYPEN:
- "edit": Tekstuele aanpassing van naam en/of beschrijving
- "merge": Samenvoegen van twee of meer items (als feedback hier expliciet om vraagt)
- "comment_only": Alleen opmerkingen, geen tekstwijziging nodig (wel documenteren)

Retourneer JSON in dit formaat:
{
  "changes": [
    {
      "change_id": "change-1",
      "cluster_id": "het item ID waarop de wijziging betrekking heeft",
      "change_type": "edit|merge|comment_only",
      "summary": "Korte samenvatting van de wijziging (1 zin)",
      "rationale": "Waarom deze wijziging wordt voorgesteld, gebaseerd op de feedback",
      "original_name": "Originele naam/titel van het item",
      "original_description": "Originele beschrijving/tekst",
      "proposed_name": "Voorgestelde naam (ongewijzigd als niet nodig)",
      "proposed_description": "Voorgestelde beschrijving (ongewijzigd als niet nodig)",
      "source_suggestions": ["suggestion IDs die deze wijziging onderbouwen"],
      "member_sources": ["namen van leden die feedback gaven"]
    }
  ],
  "unchanged_clusters": ["item IDs die ongewijzigd blijven"],
  "consolidation_summary": "Korte samenvatting: hoeveel wijzigingen, hoeveel ongewijzigd, belangrijkste thema's in de feedback"
}

BELANGRIJK:
- Retourneer ALLEEN geldig JSON, geen markdown of extra tekst
- Elk item moet óf in "changes" óf in "unchanged_clusters" voorkomen
- proposed_name en proposed_description moeten ALTIJD ingevuld zijn (ook als ongewijzigd)
`;
}

export const QUESTION_LABELS: Record<string, string> = {
  current_situation: "Huidige situatie",
  desired_situation: "Gewenste situatie",
  change_direction: "Beweging/verandering",
  stakeholders: "Belanghebbenden",
  goal_1: "Doel 1",
  goal_2: "Doel 2",
  goal_3: "Doel 3",
  goal_4: "Doel 4",
  goal_5: "Doel 5",
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
Analyseer alle doelen en cluster ze naar krachtige doelstellingen.

WAT IS EEN GOED DOELCLUSTER?
Een doelcluster is GEEN vaag trefwoord. Het is een helder geformuleerde doelstelling die:
- Een concrete, toetsbare ambitie uitspreekt
- Actief is geformuleerd (wat Cito BV gaat DOEN, niet wat er "moet")
- De essentie van meerdere individuele doelen samenbrengt tot één krachtige stelling
- Past bij de methodiek "Werken aan programma's" (Prevaas & Van Loon)

METHODIEK "WERKEN AAN PROGRAMMA'S" - DOELSTELLINGEN:
Volgens deze methodiek is een goede programmadoelstelling zo geformuleerd dat je er drie dingen uit kunt afleiden:
1. GEWENSTE EFFECTEN: Welke meetbare resultaten/veranderingen wil Cito BV bereiken? (bijv. hogere klanttevredenheid, meer herhaalopdrachten)
2. VERMOGENS: Welke capaciteiten en competenties heeft Cito BV nodig om dit doel te realiseren? (bijv. data-analyse vaardigheden, klantinzicht-competenties)
3. INSPANNINGEN: Welke concrete activiteiten en acties zijn nodig? (bijv. CRM implementeren, klantreizen in kaart brengen)

De doelstelling zelf hoeft deze drie elementen NIET expliciet te benoemen, maar moet ZO geformuleerd zijn dat:
- Je er later gewenste effecten uit kunt afleiden (het doel beschrijft een toetsbare ambitie)
- Je er vermogens bij kunt identificeren (het doel maakt duidelijk welke capaciteit nodig is)
- Je er inspanningen uit kunt vertalen (het doel is concreet genoeg om acties aan te koppelen)
- Het doel CITO-BREED is, maar ook als vertrekpunt kan dienen voor sector-specifieke gewenste effecten, vermogens en inspanningen

VOORBEELD:
FOUT: "CRM verbeteren" (te vaag - je kunt er geen effecten, vermogens of inspanningen uit afleiden)
GOED: "Eén betrouwbaar klantbeeld realiseren: alle klantdata en -interacties samenbrengen in een integraal CRM-systeem dat proactief handelen ondersteunt"
→ Hieruit volgen: effecten (betere klantinzichten), vermogens (data-integratie), inspanningen (CRM-implementatie)

FOUT: "Beter samenwerken" (te vaag, niet toetsbaar)
GOED: "Cross-sectoraal klantpartnerschap opbouwen: vanuit een gedeeld klantbeeld samen met klanten producten en diensten ontwikkelen die aansluiten op hun behoeften"
→ Hieruit volgen: effecten (hogere klanttevredenheid), vermogens (co-creatie competenties), inspanningen (gezamenlijke ontwikkelsessies)

Cluster de doelen:

1. CLUSTER SOORTGELIJKE DOELEN: Groepeer doelen die over hetzelfde onderwerp gaan, ook als ze anders geformuleerd zijn.

2. WEEG PRIORITEIT MEE: Doelen met prioriteit 1 zijn belangrijker dan prioriteit 3.

3. FORMULEER KRACHTIG: Geef elk cluster een korte naam (max 5-6 woorden) en een uitgebreide beschrijving (2-3 zinnen) als concrete doelstelling.

4. KOPPEL RESPONDENTEN: Geef aan hoeveel respondenten dit doel noemden en met welke prioriteit.

BELANGRIJK - SECTOR-NEUTRAAL, WEL MET NAMEN:
- Gebruik in "mentionedBy" de NAMEN van respondenten (bijv. "Roel", "Leontine"), zodat zichtbaar is wie wat heeft gezegd.
- Verwijs NOOIT naar sectoren (PO, VO, Professionals, Zakelijk), afdelingen (Data & Tech, HR) of rollen.
- Citaten in "exampleQuotes" mogen GEEN sector- of rolnamen bevatten. Parafraseer indien nodig.
- De analyse moet het beeld geven van Cito BV als GEHEEL, niet per sector of afdeling.
- Formuleer doelclusters altijd sector-overstijgend.

EENZIJDIGHEIDSCHECK:
- Controleer na het opstellen van de doelclusters of het resultaat niet eenzijdig naar één sector leunt (bijv. alleen VO-gericht of alleen PO-gericht).
- Als een doel sectorspecifieke taal bevat (bijv. "scholen in het voortgezet onderwijs"), vertaal dit naar een Cito BV-brede formulering (bijv. "onderwijsinstellingen en opdrachtgevers").
- Het eindresultaat moet altijd herkenbaar en toepasbaar zijn voor ALLE sectoren van Cito BV, ongeacht de input.

BELANGRIJK voor consensusLevel:
- "high" = Genoemd door >50% van respondenten OF meerdere respondenten geven dit prioriteit 1
- "medium" = Genoemd door 25-50% van respondenten
- "low" = Genoemd door <25% van respondenten

Retourneer JSON in dit formaat:
{
  "themes": [
    {
      "id": "goal-cluster-1",
      "name": "Actieve naam van het doelcluster (bijv. 'CRM verbeteren', 'Klantinzichten delen')",
      "description": "Uitgebreide beschrijving van wat dit doel inhoudt, samengesteld uit de input",
      "mentionedBy": ["Naam respondent 1", "Naam respondent 2"],
      "consensusLevel": "high|medium|low",
      "exampleQuotes": ["citaten zonder sector/rolnamen"],
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
  "discussionPoints": ["doelnamen waar respondenten verschillend over denken"]
}

Zorg voor:
- Maximaal 7-8 clusters (groepeer vergelijkbare doelen)
- Concrete, actieve formuleringen (niet vaag)
- Duidelijke koppeling naar originele input
- Accurate weergave van prioriteiten
`;

