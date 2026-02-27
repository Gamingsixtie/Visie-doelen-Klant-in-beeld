import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ANALYZE_THEMES_PROMPT, QUESTION_LABELS } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionType, responses } = body;

    if (!questionType || !responses || responses.length === 0) {
      return NextResponse.json(
        { error: "questionType en responses zijn verplicht" },
        { status: 400 }
      );
    }

    // Format responses for the prompt
    const formattedResponses = responses
      .map(
        (r: { respondentId: string; answer: string }, i: number) =>
          `Respondent ${i + 1} (${r.respondentId}):\n${r.answer}`
      )
      .join("\n\n---\n\n");

    // Build the prompt
    const prompt = ANALYZE_THEMES_PROMPT
      .replace("{questionType}", QUESTION_LABELS[questionType] || questionType)
      .replace("{responses}", formattedResponses);

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
    let analysisData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return default structure
      analysisData = {
        themes: [],
        tensions: [],
        quickWins: [],
        discussionPoints: []
      };
    }

    return NextResponse.json({
      success: true,
      themes: analysisData.themes || [],
      tensions: analysisData.tensions || [],
      quickWins: analysisData.quickWins || [],
      discussionPoints: analysisData.discussionPoints || []
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Fout bij het analyseren" },
      { status: 500 }
    );
  }
}
