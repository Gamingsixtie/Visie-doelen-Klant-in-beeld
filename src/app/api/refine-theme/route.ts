import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CITO_CONTEXT } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, feedback } = body;

    if (!theme || !feedback) {
      return NextResponse.json(
        { error: "theme en feedback zijn verplicht" },
        { status: 400 }
      );
    }

    const prompt = `
${CITO_CONTEXT}

Je hebt eerder een thema geïdentificeerd uit de antwoorden van MT-leden. De gebruiker heeft feedback gegeven om dit thema te verfijnen.

HUIDIG THEMA:
- Naam: ${theme.name}
- Beschrijving: ${theme.description}
- Genoemd door: ${(theme.mentionedBy || []).join(", ")}
- Citaten: ${(theme.exampleQuotes || []).map((q: string) => `"${q}"`).join("; ")}
- Consensus: ${theme.consensusLevel}

FEEDBACK VAN GEBRUIKER:
${feedback}

OPDRACHT:
Pas het thema aan op basis van de feedback. Zorg dat het resultaat voldoet aan:

KWALITEITSEISEN THEMA:
- De naam is kort (max 5-6 woorden) maar inhoudelijk en richtinggevend
- De beschrijving is een krachtige stelling (2-3 zinnen) die een duidelijke positie inneemt
- Het thema is GEEN vaag trefwoord maar een concrete, toetsbare uitspraak
- Sector-neutraal: geen PO, VO, Professionals, Zakelijk of afdelingsnamen
- Past bij de methodiek "Werken aan programma's" (Prevaas & Van Loon)

Retourneer JSON:
{
  "name": "Korte krachtige naam (max 5-6 woorden)",
  "description": "Uitgebreide beschrijving als inhoudelijke stelling (2-3 zinnen)",
  "exampleQuotes": ["relevante citaten zonder sector/rolnamen"]
}

Behoud wat goed is en pas alleen aan wat de feedback vraagt.
`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      thinking: {
        type: "enabled",
        budget_tokens: 5000
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

    let refinedData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        refinedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return NextResponse.json(
        { error: "AI-antwoord kon niet worden verwerkt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      refined: refinedData
    });
  } catch (error) {
    console.error("Refine theme error:", error);
    return NextResponse.json(
      { error: "Fout bij het verfijnen van het thema" },
      { status: 500 }
    );
  }
}
