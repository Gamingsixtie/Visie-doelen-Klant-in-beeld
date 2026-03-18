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

    // Post-processing: merge multiple non-merge changes on the same cluster into one
    if (consolidated.changes && Array.isArray(consolidated.changes)) {
      const clusterGroups: Record<string, typeof consolidated.changes> = {};
      const mergeChanges: typeof consolidated.changes = [];

      for (const change of consolidated.changes) {
        if (change.change_type === "merge") {
          mergeChanges.push(change);
        } else {
          if (!clusterGroups[change.cluster_id]) {
            clusterGroups[change.cluster_id] = [];
          }
          clusterGroups[change.cluster_id].push(change);
        }
      }

      const mergedChanges = [];
      for (const [clusterId, group] of Object.entries(clusterGroups)) {
        if (group.length === 1) {
          mergedChanges.push(group[0]);
        } else {
          // Multiple changes on same cluster — take the one with actual text changes as base
          const edits = group.filter(
            (c: { change_type: string; proposed_name: string; original_name: string; proposed_description: string; original_description: string }) =>
              c.change_type === "edit" && (c.proposed_name !== c.original_name || c.proposed_description !== c.original_description)
          );
          const base = edits.length > 0 ? edits[edits.length - 1] : group[0];

          // Merge source_suggestions and member_sources from all changes
          const allSources = [...new Set(group.flatMap((c: { source_suggestions?: string[] }) => c.source_suggestions || []))];
          const allMembers = [...new Set(group.flatMap((c: { member_sources?: string[] }) => c.member_sources || []))];
          const allRationales = group.map((c: { rationale: string }) => c.rationale).filter(Boolean);

          mergedChanges.push({
            ...base,
            change_id: `merged-${clusterId}`,
            source_suggestions: allSources,
            member_sources: allMembers,
            rationale: allRationales.join(" | "),
            summary: group.length > 1
              ? `Gecombineerd voorstel (${group.length} suggesties verwerkt): ${base.summary}`
              : base.summary,
          });
        }
      }

      consolidated.changes = [...mergedChanges, ...mergeChanges];
    }

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
