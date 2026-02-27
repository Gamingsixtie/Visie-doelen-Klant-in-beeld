import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GENERATE_PROPOSAL_PROMPT, QUESTION_LABELS } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionType, themes, originalResponses } = body;

    if (!questionType) {
      return NextResponse.json(
        { error: "questionType is verplicht" },
        { status: 400 }
      );
    }

    // Format themes for the prompt
    const formattedThemes = (themes || [])
      .map(
        (t: { name: string; description: string; consensusLevel: string }) =>
          `- ${t.name}: ${t.description} (consensus: ${t.consensusLevel})`
      )
      .join("\n");

    // Format original responses
    const formattedResponses = (originalResponses || [])
      .map(
        (r: { respondentId: string; answer: string }, i: number) =>
          `Respondent ${i + 1}: ${r.answer}`
      )
      .join("\n");

    // Build the prompt
    const prompt = GENERATE_PROPOSAL_PROMPT
      .replace("{questionLabel}", QUESTION_LABELS[questionType] || questionType)
      .replace("{themes}", formattedThemes || "Geen thema's beschikbaar")
      .replace("{originalResponses}", formattedResponses || "Geen antwoorden beschikbaar");

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    // Extract text content from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    let proposalData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        proposalData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return default structure with placeholder variants
      proposalData = {
        variants: [
          {
            id: "variant-1",
            type: "beknopt",
            text: "Korte versie van de formulering.",
            emphasizes: "Kernpunten",
            includesThemes: []
          },
          {
            id: "variant-2",
            type: "volledig",
            text: "Uitgebreide versie met alle nuances.",
            emphasizes: "Volledigheid",
            includesThemes: []
          },
          {
            id: "variant-3",
            type: "gebalanceerd",
            text: "Gebalanceerde versie.",
            emphasizes: "Balans",
            includesThemes: []
          }
        ],
        recommendation: "gebalanceerd",
        recommendationRationale: "Beste balans tussen beknopt en volledig"
      };
    }

    return NextResponse.json({
      success: true,
      variants: proposalData.variants || [],
      recommendation: proposalData.recommendation,
      recommendationRationale: proposalData.recommendationRationale
    });
  } catch (error) {
    console.error("Proposal generation error:", error);
    return NextResponse.json(
      { error: "Fout bij het genereren van voorstellen" },
      { status: 500 }
    );
  }
}
