import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { v4 as uuidv4 } from "uuid";
import { PARSE_CANVAS_PROMPT } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Geen bestand ontvangen" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Alleen .docx bestanden zijn toegestaan" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Word document using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Document is leeg of kon niet worden gelezen" },
        { status: 400 }
      );
    }

    // Use Claude to extract structured data
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: PARSE_CANVAS_PROMPT + rawText
        }
      ]
    });

    // Extract text content from response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    let parsedData;
    try {
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a default structure if parsing fails
      parsedData = {
        respondent_name: null,
        responses: {
          current_situation: "",
          desired_situation: "",
          change_direction: "",
          goal_1: "",
          goal_2: "",
          goal_3: "",
          out_of_scope: ""
        }
      };
    }

    return NextResponse.json({
      success: true,
      respondent: {
        id: uuidv4(),
        name: parsedData.respondent_name || file.name.replace(".docx", ""),
        role: "Overig"
      },
      responses: parsedData.responses,
      rawText
    });
  } catch (error) {
    console.error("Document parsing error:", error);
    return NextResponse.json(
      { error: "Fout bij het verwerken van het document" },
      { status: 500 }
    );
  }
}
