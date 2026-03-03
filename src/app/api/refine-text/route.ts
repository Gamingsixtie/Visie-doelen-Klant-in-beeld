import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CITO_CONTEXT } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentText, context, feedback } = body;

    if (!currentText || !feedback) {
      return NextResponse.json(
        { error: "currentText en feedback zijn verplicht" },
        { status: 400 }
      );
    }

    const prompt = `
${CITO_CONTEXT}

Je verfijnt een tekst voor het programma Klant in Beeld van Cito BV. De gebruiker heeft feedback gegeven om de tekst te verbeteren.

${context ? `CONTEXT: ${context}\n` : ""}
HUIDIGE TEKST:
${currentText}

FEEDBACK VAN GEBRUIKER:
${feedback}

OPDRACHT:
Pas de tekst aan op basis van de feedback. Zorg dat het resultaat:
- Krachtig en concreet geformuleerd is (geen vage taal)
- Sector-neutraal is: NOOIT verwijzen naar individuele sectoren (PO, VO, Professionals, Zakelijk) of afdelingen
- Consistent is met Cito BV-terminologie (outside-in perspectief, klantpartnerschap, 360° klantbeeld)
- Het beeld geeft van Cito BV als geheel
- Past bij de methodiek "Werken aan programma's" (Prevaas & Van Loon)
- Bij doelstellingen: zo geformuleerd dat je er gewenste effecten, benodigde vermogens en concrete inspanningen uit kunt afleiden
- CITO-breed, maar bruikbaar als vertrekpunt voor sector-specifieke uitwerking

Behoud wat goed is en pas alleen aan wat de feedback vraagt.

Retourneer ALLEEN de aangepaste tekst, zonder JSON-opmaak of extra uitleg.
`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      success: true,
      refinedText: responseText.trim()
    });
  } catch (error) {
    console.error("Refine text error:", error);
    return NextResponse.json(
      { error: "Fout bij het verfijnen van de tekst" },
      { status: 500 }
    );
  }
}
