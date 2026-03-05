import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CITO_CONTEXT } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposedChange, feedback } = body;

    if (!proposedChange || !feedback) {
      return NextResponse.json(
        { error: "proposedChange en feedback zijn verplicht" },
        { status: 400 }
      );
    }

    const prompt = `
${CITO_CONTEXT}

Je verfijnt een VOORGESTELDE WIJZIGING voor een programma-doel van Cito BV. Deze wijziging was eerder door AI voorgesteld op basis van MT-feedback. De facilitator wil het voorstel aanpassen.

OORSPRONKELIJK DOEL:
Naam: ${proposedChange.original_name}
Beschrijving: ${proposedChange.original_description}

HUIDIG VOORSTEL:
Naam: ${proposedChange.proposed_name}
Beschrijving: ${proposedChange.proposed_description}

SAMENVATTING VAN HET VOORSTEL:
${proposedChange.summary}

ONDERBOUWING:
${proposedChange.rationale}

BRONNEN (MT-leden die feedback gaven):
${(proposedChange.member_sources || []).join(", ")}

FEEDBACK VAN DE FACILITATOR:
${feedback}

OPDRACHT:
Verfijn het voorstel op basis van de feedback van de facilitator. Zorg dat het resultaat:
- Krachtig en concreet geformuleerd is (geen vage taal)
- Sector-neutraal is: NOOIT verwijzen naar individuele sectoren (PO, VO, Professionals, Zakelijk) of afdelingen
- Consistent is met Cito BV-terminologie
- Past bij de methodiek "Werken aan programma's" (Prevaas & Van Loon)
- De band behoudt met het oorspronkelijke doel en de MT-feedback
- Bij doelstellingen: zo geformuleerd dat je er gewenste effecten, benodigde vermogens en concrete inspanningen uit kunt afleiden

Retourneer ALLEEN een JSON-object in dit formaat (geen extra tekst):
{
  "proposed_name": "verfijnde naam",
  "proposed_description": "verfijnde beschrijving",
  "summary": "korte samenvatting van wat er gewijzigd is"
}
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

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Kon geen geldig JSON-antwoord uit AI-response halen" },
        { status: 500 }
      );
    }

    const refined = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      refined: {
        proposed_name: refined.proposed_name,
        proposed_description: refined.proposed_description,
        summary: refined.summary
      }
    });
  } catch (error) {
    console.error("Refine change error:", error);
    return NextResponse.json(
      { error: "Fout bij het verfijnen van de wijziging" },
      { status: 500 }
    );
  }
}
