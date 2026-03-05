import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CITO_CONTEXT } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const GENERATE_VISION_PROMPT = `
Je bent een expert in het schrijven van programmavisies volgens de methodiek van Prevaas & Van Loon (Werken aan programma's, 2024).

${CITO_CONTEXT}

METHODIEK PROGRAMMAVISIE (Hoofdstuk 7 - Een gedragen visie creëren):

Volgens de methodiek bestaat een programmavisie uit vier kernelementen:
1. HUIDIGE SITUATIE - Waar staan we nu? Wat is de aanleiding voor verandering?
2. GEWENSTE SITUATIE - Waar willen we naartoe? Wat is het beoogde eindbeeld?
3. BEWEGING - Welke verandering is nodig om van huidig naar gewenst te komen?
4. BELANGHEBBENDEN - Voor wie is deze verandering relevant?

Kenmerken van een goede programmavisie (§7.3):
- Aansprekend en inspirerend - spreekt tot de verbeelding
- Richtinggevend - geeft koers zonder te gedetailleerd te zijn
- Gedragen - is ontwikkeld met en door de betrokkenen
- Concreet - maakt de beweging tastbaar
- Verbindend - brengt belanghebbenden samen rond een gemeenschappelijk doel

Principes uit de methodiek (Hoofdstuk 4):
- Sturen vanuit visie en doelen boven sturen op inspanningen
- Eigenaarschap aanboren boven opdrachten geven
- Belangen verbinden boven belangen vertegenwoordigen

CONTEXT: Dit is de visie voor het programma "Klant in Beeld" bij Cito BV.

BELANGRIJK - ALLE SECTOREN BETREKKEN:
De visie moet relevant zijn voor ALLE drie de sectoren van Cito BV:

1. SECTOR PO (Primair Onderwijs):
   - Leerlingvolgsystemen, doorstroomtoets, toetsen kernvakken
   - Klanten: basisscholen, speciaal onderwijs

2. SECTOR VO (Voortgezet Onderwijs):
   - Volgsystemen onderbouw, schoolexamens bovenbouw, kijk- en luistertoetsen
   - Klanten: middelbare scholen, vso/pro

3. SECTOR PROFESSIONALS:
   - Vakbekwaamheidsexamens, certificeringstrajecten, taaltoetsen
   - Klanten: bedrijfsleven, overheid, mbo, hoger onderwijs, internationale opdrachtgevers
   - Lijnen: Beroepsonderwijs, Nederlands als tweede taal (Nt2), Cito Zakelijk

De visie moet sector-overstijgend zijn en de gezamenlijke beweging naar klantpartnerschap beschrijven die voor alle sectoren geldt, ongeacht of het gaat om scholen, overheden of bedrijven.

FORMULEER VANUIT HET PROGRAMMA KLANT IN BEELD:

Doelbeeld programma: "Cito BV ontwikkelt zich tot een organisatie die vanuit een outside-in perspectief werkt, waarin mens, proces en systeem verbonden zijn en dit onderdeel wordt van de cultuur, zodat dienstverlening en samenwerking blijvend aansluiten bij de behoeften van klanten."

Vier domeinen van het programma:
- MENS: Vaardigheden voor outside-in werken, heldere rollen, ruimte voor reflectie
- PROCES: Uniform klantproces, opvolging klantinzichten, borging in werkwijze
- SYSTEEM: CRM verbetering, 360° klantbeeld, proactief handelen ondersteunen
- CULTUUR: Van productgericht naar klantgericht, gedeeld eigenaarschap, sectoroverstijgend

Beoogde baten:
- Hogere klanttevredenheid
- Lagere ongewenste klantuitstroom
- Betere aansluiting op klantbehoefte
- Proactieve klantrelaties
- Efficiëntere interne samenwerking
- Betrouwbaar integraal klantbeeld

De visie moet deze elementen integreren en beschrijven hoe Cito zich ontwikkelt van inside-out naar outside-in werken.

De volgende onderdelen zijn door het MT goedgekeurd:

HUIDIGE SITUATIE:
{currentSituation}

GEWENSTE SITUATIE:
{desiredSituation}

BEWEGING:
{changeDirection}

BELANGHEBBENDEN:
{stakeholders}

{themeContext}

OPDRACHT:
Genereer TWEE versies van de PROGRAMMAVISIE KLANT IN BEELD.

BELANGRIJK: Dit is de visie VAN het programma Klant in Beeld, niet een algemene organisatievisie.
- Begin ALTIJD met "Het programma Klant in Beeld..." of "Met het programma Klant in Beeld..."
- Maak duidelijk dat dit de programmavisie is die richting geeft aan het programma
- Refereer aan de vier domeinen (Mens, Proces, Systeem, Cultuur) waar relevant
- Koppel aan de beoogde baten van het programma

1. UITGEBREIDE VISIE (voor programmadocumenten):
   - Volledige, gestructureerde visietekst voor het programma Klant in Beeld
   - Bevat alle vier elementen expliciet uitgewerkt
   - 4-5 alinea's
   - Geschikt voor programmaplan, businesscase, stuurgroepstukken
   - Volgt de structuur: programmacontext → huidige situatie → gewenste situatie → beweging → belanghebbenden
   - Maakt duidelijk HOE het programma bijdraagt aan de beweging van inside-out naar outside-in

2. BEKNOPTE VISIE (voor communicatie):
   - Kernachtige programmavisie in 2-3 zinnen
   - Begin met "Met Klant in Beeld..." of "Het programma Klant in Beeld..."
   - Pakkend en memorabel
   - Geschikt voor presentaties, nieuwsbrieven, elevator pitch
   - Vangt de essentie van het programma en de beoogde verandering

Beide versies moeten:
- Expliciet het programma Klant in Beeld benoemen
- Professioneel maar toegankelijk zijn
- Actief geschreven zijn
- Inspirerend en richtinggevend zijn
- De beweging van inside-out naar outside-in benadrukken
- Consistent zijn met Cito BV-terminologie (outside-in perspectief, partnerschap, klantgericht, 360° klantbeeld)
- Gebruik ALTIJD "Cito BV" (niet alleen "Cito")

Retourneer JSON in dit formaat:
{
  "uitgebreid": "De volledige visietekst voor programmadocumenten...",
  "beknopt": "De kernachtige visie voor communicatie..."
}
`;

interface ThemeInfo {
  name: string;
  votes?: number;
  questionType: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentSituation, desiredSituation, changeDirection, stakeholders, themes } = body;

    if (!currentSituation || !desiredSituation || !changeDirection || !stakeholders) {
      return NextResponse.json(
        { error: "Alle visie-onderdelen zijn verplicht" },
        { status: 400 }
      );
    }

    // Format theme context if themes are provided
    let themeContext = "";
    if (themes && Array.isArray(themes) && themes.length > 0) {
      const themesByQuestion: Record<string, ThemeInfo[]> = {};
      themes.forEach((t: ThemeInfo) => {
        const qt = t.questionType || "algemeen";
        if (!themesByQuestion[qt]) {
          themesByQuestion[qt] = [];
        }
        themesByQuestion[qt].push(t);
      });

      const questionLabels: Record<string, string> = {
        current_situation: "Huidige situatie",
        desired_situation: "Gewenste situatie",
        change_direction: "Beweging",
        stakeholders: "Belanghebbenden"
      };

      themeContext = `
BELANGRIJKE THEMA'S UIT DE MT STEMRONDE:
De volgende thema's zijn door het MT als belangrijk aangemerkt. Verwerk deze waar mogelijk in de visie:

${Object.entries(themesByQuestion)
  .map(([qt, themeList]) => {
    const label = questionLabels[qt] || qt;
    const themeLines = themeList
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .map(t => `  - ${t.name}${t.votes ? ` (${t.votes} stemmen)` : ""}`)
      .join("\n");
    return `${label}:\n${themeLines}`;
  })
  .join("\n\n")}
`;
    }

    // Build the prompt
    const prompt = GENERATE_VISION_PROMPT
      .replace("{currentSituation}", currentSituation)
      .replace("{desiredSituation}", desiredSituation)
      .replace("{changeDirection}", changeDirection)
      .replace("{stakeholders}", stakeholders)
      .replace("{themeContext}", themeContext);

    // Call Claude API with extended thinking
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      thinking: {
        type: "enabled",
        budget_tokens: 10000
      },
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    // Extract text content from response (skip thinking blocks)
    const textBlock = message.content.find((block: { type: string }) => block.type === "text");
    const responseText = textBlock && "text" in textBlock ? textBlock.text : "";

    // Parse JSON from response
    let visionData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        visionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // Fallback: use full response as uitgebreid, create beknopt summary
      visionData = {
        uitgebreid: responseText.trim(),
        beknopt: responseText.split('.').slice(0, 2).join('.') + '.'
      };
    }

    return NextResponse.json({
      success: true,
      uitgebreid: visionData.uitgebreid || "",
      beknopt: visionData.beknopt || "",
      // Keep backward compatibility
      vision: visionData.uitgebreid || responseText.trim()
    });
  } catch (error) {
    console.error("Vision generation error:", error);
    return NextResponse.json(
      { error: "Fout bij het genereren van de visie" },
      { status: 500 }
    );
  }
}
