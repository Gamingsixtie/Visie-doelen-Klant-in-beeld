import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CONSOLIDATE_FEEDBACK_PROMPT, getConsolidatePrompt } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clusters, suggestions, stepType } = body;

    if (!clusters || !suggestions) {
      return NextResponse.json(
        { error: "clusters en suggestions zijn verplicht" },
        { status: 400 }
      );
    }

    // Use step-type-specific prompt if stepType is provided, else fall back to original
    const promptTemplate = stepType ? getConsolidatePrompt(stepType) : CONSOLIDATE_FEEDBACK_PROMPT;
    const prompt = promptTemplate
      .replace("{clusters}", JSON.stringify(clusters, null, 2))
      .replace("{suggestions}", JSON.stringify(suggestions, null, 2));

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      thinking: {
        type: "enabled",
        budget_tokens: 8000
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
      console.error("No JSON found in response:", responseText);
      return NextResponse.json(
        { error: "Kon geen geldig JSON-antwoord extraheren van AI" },
        { status: 500 }
      );
    }

    const consolidated = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      consolidated
    });
  } catch (error) {
    console.error("Consolidate feedback error:", error);
    return NextResponse.json(
      { error: "Fout bij het consolideren van feedback" },
      { status: 500 }
    );
  }
}
