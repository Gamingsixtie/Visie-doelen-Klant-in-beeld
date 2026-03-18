// ============================================
// FEEDBACK SERVICE - Supabase CRUD voor async MT doelen-feedback
// ============================================

import { supabase, isSupabaseConfigured } from "./supabase";

// === Types ===

export type SuggestionType = "priority" | "text_edit" | "merge" | "comment";
export type SuggestionVoteValue = "accept" | "reject";
export type FeedbackPhase = "collecting" | "consolidating" | "voting" | "approved";
export type ChangeVoteValue = "agree" | "disagree" | "abstain";
export type FeedbackStepType = "doelen" | "scope" | "visie_huidige" | "visie_gewenste" | "visie_beweging" | "visie_stakeholders";

export interface FeedbackRound {
  id: string;
  session_id: string;
  source_clusters: unknown[];
  step_type: FeedbackStepType;
  facilitator_name: string | null;
  phase: FeedbackPhase;
  consolidated_changes: ConsolidatedChanges | null;
  consolidated_changes_history: ConsolidatedChangesVersion[];
  member_ready: string[];
  created_at: string;
}

export interface ProposedChange {
  change_id: string;
  cluster_id: string;
  change_type: "edit" | "merge" | "comment_only";
  summary: string;
  rationale: string;
  original_name: string;
  original_description: string;
  proposed_name: string;
  proposed_description: string;
  source_suggestions: string[];
  member_sources: string[];
}

export interface ConsolidatedChanges {
  changes: ProposedChange[];
  unchanged_clusters: string[];
  consolidation_summary: string;
}

export interface ConsolidatedChangesVersion {
  version_id: string;
  changes: ConsolidatedChanges;
  created_at: string;
  label: string;
}

export interface ChangeVote {
  id: string;
  round_id: string;
  change_id: string;
  member_name: string;
  value: ChangeVoteValue;
  comment: string | null;
  created_at: string;
}

export interface FeedbackSuggestion {
  id: string;
  round_id: string;
  member_name: string;
  cluster_id: string;
  suggestion_type: SuggestionType;
  content: Record<string, unknown>;
  created_at: string;
}

export interface SuggestionVote {
  id: string;
  suggestion_id: string;
  member_name: string;
  value: SuggestionVoteValue;
  created_at: string;
}

// Content shapes per suggestion type
export interface PriorityContent {
  ranking: string[]; // cluster IDs in order
}

export interface TextEditContent {
  original_name: string;
  original_description: string;
  suggested_name: string;
  suggested_description: string;
  reason: string;
}

export interface MergeContent {
  merge_with_cluster_id: string;
  merge_with_cluster_name: string;
  reason: string;
}

export interface CommentContent {
  text: string;
}

// === Feedback Rounds ===

export async function createFeedbackRound(
  sessionId: string,
  sourceClusters: unknown[],
  facilitatorName?: string,
  stepType: FeedbackStepType = "doelen"
): Promise<FeedbackRound | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("feedback_rounds")
    .insert({
      session_id: sessionId,
      source_clusters: sourceClusters as unknown as Record<string, unknown>,
      step_type: stepType,
      phase: "collecting" as const,
      facilitator_name: facilitatorName || null
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating feedback round:", error);
    return null;
  }

  return data as unknown as FeedbackRound;
}

export async function getFeedbackRounds(sessionId: string): Promise<FeedbackRound[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("feedback_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching feedback rounds:", error);
    return [];
  }

  return (data || []) as unknown as FeedbackRound[];
}

export async function getLatestOpenRound(sessionId: string): Promise<FeedbackRound | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("feedback_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .in("phase", ["collecting", "consolidating", "voting"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching latest open round:", error);
    return null;
  }

  return (data?.[0] as unknown as FeedbackRound) ?? null;
}

export async function closeFeedbackRound(roundId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("feedback_rounds")
    .update({ phase: "approved" })
    .eq("id", roundId);

  if (error) {
    console.error("Error closing feedback round:", error);
    return false;
  }

  return true;
}

// === Suggestions ===

export async function addSuggestion(
  roundId: string,
  memberName: string,
  clusterId: string,
  type: SuggestionType,
  content: Record<string, unknown>
): Promise<FeedbackSuggestion | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("feedback_suggestions")
    .insert({
      round_id: roundId,
      member_name: memberName,
      cluster_id: clusterId,
      suggestion_type: type,
      content: content as unknown as Record<string, unknown>
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding suggestion:", error);
    return null;
  }

  return data as unknown as FeedbackSuggestion;
}

export async function getSuggestions(roundId: string): Promise<FeedbackSuggestion[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("feedback_suggestions")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }

  return (data || []) as unknown as FeedbackSuggestion[];
}

export async function deleteSuggestion(suggestionId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("feedback_suggestions")
    .delete()
    .eq("id", suggestionId);

  if (error) {
    console.error("Error deleting suggestion:", error);
    return false;
  }

  return true;
}

export async function updateSuggestionContent(
  suggestionId: string,
  content: Record<string, unknown>
): Promise<FeedbackSuggestion | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("feedback_suggestions")
    .update({ content })
    .eq("id", suggestionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating suggestion:", error);
    return null;
  }

  return data as FeedbackSuggestion;
}

// === Suggestion Votes ===

export async function voteSuggestion(
  suggestionId: string,
  memberName: string,
  value: SuggestionVoteValue
): Promise<SuggestionVote | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("suggestion_votes")
    .upsert(
      {
        suggestion_id: suggestionId,
        member_name: memberName,
        value: value
      },
      { onConflict: "suggestion_id,member_name" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error voting on suggestion:", error);
    return null;
  }

  return data as unknown as SuggestionVote;
}

export async function getSuggestionVotes(roundId: string): Promise<SuggestionVote[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  // Get all suggestion IDs for this round first, then fetch votes
  const { data: suggestions, error: sugError } = await supabase
    .from("feedback_suggestions")
    .select("id")
    .eq("round_id", roundId);

  if (sugError || !suggestions?.length) return [];

  const suggestionIds = suggestions.map((s: { id: string }) => s.id);

  const { data, error } = await supabase
    .from("suggestion_votes")
    .select("*")
    .in("suggestion_id", suggestionIds);

  if (error) {
    console.error("Error fetching suggestion votes:", error);
    return [];
  }

  return (data || []) as unknown as SuggestionVote[];
}

// === Full Round Data (combined fetch for efficiency) ===

export interface FullRoundData {
  round: FeedbackRound;
  suggestions: FeedbackSuggestion[];
  votes: SuggestionVote[];
  changeVotes: ChangeVote[];
}

export async function getFullRoundData(roundId: string): Promise<FullRoundData | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  // Fetch round
  const { data: roundRows, error: roundError } = await supabase
    .from("feedback_rounds")
    .select("*")
    .eq("id", roundId)
    .limit(1);

  const round = roundRows?.[0];
  if (roundError || !round) return null;

  // Fetch suggestions
  const { data: suggestions } = await supabase
    .from("feedback_suggestions")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  // Fetch votes for all suggestions
  const suggestionIds = (suggestions || []).map((s: { id: string }) => s.id);
  let votes: SuggestionVote[] = [];

  if (suggestionIds.length > 0) {
    const { data: voteData } = await supabase
      .from("suggestion_votes")
      .select("*")
      .in("suggestion_id", suggestionIds);
    votes = (voteData || []) as unknown as SuggestionVote[];
  }

  // Fetch change votes
  let changeVotes: ChangeVote[] = [];
  const { data: changeVoteData } = await supabase
    .from("change_votes")
    .select("*")
    .eq("round_id", roundId);
  changeVotes = (changeVoteData || []) as unknown as ChangeVote[];

  return {
    round: round as unknown as FeedbackRound,
    suggestions: (suggestions || []) as unknown as FeedbackSuggestion[],
    votes,
    changeVotes
  };
}

// === Phase Management ===

export async function updateRoundPhase(
  roundId: string,
  phase: FeedbackPhase
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("feedback_rounds")
    .update({ phase })
    .eq("id", roundId);

  if (error) {
    console.error("Error updating round phase:", error);
    return false;
  }

  return true;
}

export async function saveConsolidatedChanges(
  roundId: string,
  changes: ConsolidatedChanges
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("feedback_rounds")
    .update({
      consolidated_changes: changes as unknown as Record<string, unknown>,
      phase: "voting" as const
    })
    .eq("id", roundId);

  if (error) {
    console.error("Error saving consolidated changes:", error);
    return false;
  }

  return true;
}

// === Change Votes ===

export async function voteOnChange(
  roundId: string,
  changeId: string,
  memberName: string,
  value: ChangeVoteValue,
  comment?: string
): Promise<ChangeVote | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("change_votes")
    .upsert(
      {
        round_id: roundId,
        change_id: changeId,
        member_name: memberName,
        value,
        comment: comment || null
      },
      { onConflict: "round_id,change_id,member_name" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error voting on change:", error);
    return null;
  }

  return data as unknown as ChangeVote;
}

export async function getChangeVotes(roundId: string): Promise<ChangeVote[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("change_votes")
    .select("*")
    .eq("round_id", roundId);

  if (error) {
    console.error("Error fetching change votes:", error);
    return [];
  }

  return (data || []) as unknown as ChangeVote[];
}

// === Consolidated Changes with History ===

export async function saveConsolidatedChangesWithHistory(
  roundId: string,
  newChanges: ConsolidatedChanges,
  label: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  // First fetch current round to get existing data
  const { data: roundRows, error: fetchError } = await supabase
    .from("feedback_rounds")
    .select("consolidated_changes, consolidated_changes_history")
    .eq("id", roundId)
    .limit(1);

  const round = roundRows?.[0];
  if (fetchError || !round) {
    console.error("Error fetching round for history:", fetchError);
    return false;
  }

  const currentHistory = (round.consolidated_changes_history || []) as unknown as ConsolidatedChangesVersion[];

  // If there are current consolidated_changes, push them to history
  if (round.consolidated_changes) {
    const version: ConsolidatedChangesVersion = {
      version_id: crypto.randomUUID(),
      changes: round.consolidated_changes as unknown as ConsolidatedChanges,
      created_at: new Date().toISOString(),
      label
    };
    currentHistory.push(version);
  }

  const { error } = await supabase
    .from("feedback_rounds")
    .update({
      consolidated_changes: newChanges as unknown as Record<string, unknown>,
      consolidated_changes_history: currentHistory as unknown as Record<string, unknown>[],
      phase: "voting" as const
    })
    .eq("id", roundId);

  if (error) {
    console.error("Error saving consolidated changes with history:", error);
    return false;
  }

  return true;
}

export async function restoreConsolidatedChangesVersion(
  roundId: string,
  versionId: string
): Promise<{ changes: ConsolidatedChanges; history: ConsolidatedChangesVersion[] } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  // Fetch current round
  const { data: roundRows, error: fetchError } = await supabase
    .from("feedback_rounds")
    .select("consolidated_changes, consolidated_changes_history")
    .eq("id", roundId)
    .limit(1);

  const round = roundRows?.[0];
  if (fetchError || !round) return null;

  const history = (round.consolidated_changes_history || []) as unknown as ConsolidatedChangesVersion[];
  const versionToRestore = history.find(v => v.version_id === versionId);
  if (!versionToRestore) return null;

  // Push current state to history before restoring
  if (round.consolidated_changes) {
    history.push({
      version_id: crypto.randomUUID(),
      changes: round.consolidated_changes as unknown as ConsolidatedChanges,
      created_at: new Date().toISOString(),
      label: "Voor herstelling"
    });
  }

  const { error } = await supabase
    .from("feedback_rounds")
    .update({
      consolidated_changes: versionToRestore.changes as unknown as Record<string, unknown>,
      consolidated_changes_history: history as unknown as Record<string, unknown>[]
    })
    .eq("id", roundId);

  if (error) {
    console.error("Error restoring version:", error);
    return null;
  }

  return { changes: versionToRestore.changes, history };
}

export async function deleteChangeVotesForChange(
  roundId: string,
  changeId: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("change_votes")
    .delete()
    .eq("round_id", roundId)
    .eq("change_id", changeId);

  if (error) {
    console.error("Error deleting change votes:", error);
    return false;
  }

  return true;
}

export async function deleteAllChangeVotes(
  roundId: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("change_votes")
    .delete()
    .eq("round_id", roundId);

  if (error) {
    console.error("Error deleting all change votes:", error);
    return false;
  }

  return true;
}

// === Reset Feedback Round (keep source data, clear all feedback) ===

export async function resetFeedbackRound(
  roundId: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    // Delete all change votes
    await supabase
      .from("change_votes")
      .delete()
      .eq("round_id", roundId);

    // Get suggestion IDs for this round
    const { data: suggestions } = await supabase
      .from("feedback_suggestions")
      .select("id")
      .eq("round_id", roundId);

    // Delete suggestion votes
    if (suggestions && suggestions.length > 0) {
      const suggestionIds = suggestions.map((s: { id: string }) => s.id);
      await supabase
        .from("suggestion_votes")
        .delete()
        .in("suggestion_id", suggestionIds);
    }

    // Delete all suggestions
    await supabase
      .from("feedback_suggestions")
      .delete()
      .eq("round_id", roundId);

    // Reset round: clear consolidated changes, reset phase, clear history
    await supabase
      .from("feedback_rounds")
      .update({
        phase: "collecting",
        consolidated_changes: null,
        consolidated_changes_history: []
      })
      .eq("id", roundId);

    return true;
  } catch (error) {
    console.error("Error resetting feedback round:", error);
    return false;
  }
}

// === Active Round (any non-approved phase) ===

export async function getActiveRound(sessionId: string, stepType?: FeedbackStepType): Promise<FeedbackRound | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  let query = supabase
    .from("feedback_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .in("phase", ["collecting", "consolidating", "voting"]);

  if (stepType) {
    query = query.eq("step_type", stepType);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching active round:", error);
    return null;
  }

  return (data?.[0] as unknown as FeedbackRound) ?? null;
}

// === Member Ready Functions ===

export async function markMemberReady(roundId: string, memberName: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { data: roundRows } = await supabase
    .from("feedback_rounds")
    .select("member_ready")
    .eq("id", roundId)
    .limit(1);

  const currentReady = (roundRows?.[0]?.member_ready || []) as string[];
  if (currentReady.includes(memberName)) return true;

  const updated = [...currentReady, memberName];
  const { error } = await supabase
    .from("feedback_rounds")
    .update({ member_ready: updated })
    .eq("id", roundId);

  if (error) {
    console.error("Error marking member ready:", error);
    return false;
  }
  return true;
}

export async function unmarkMemberReady(roundId: string, memberName: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { data: roundRows } = await supabase
    .from("feedback_rounds")
    .select("member_ready")
    .eq("id", roundId)
    .limit(1);

  const currentReady = (roundRows?.[0]?.member_ready || []) as string[];
  const updated = currentReady.filter(m => m !== memberName);

  const { error } = await supabase
    .from("feedback_rounds")
    .update({ member_ready: updated })
    .eq("id", roundId);

  if (error) {
    console.error("Error unmarking member ready:", error);
    return false;
  }
  return true;
}

// === Update source clusters when doelen change ===

export async function updateActiveRoundSourceClusters(
  sessionId: string,
  newClusters: unknown[],
  stepType: FeedbackStepType = "doelen"
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  // Find active round for this step type
  const activeRound = await getActiveRound(sessionId, stepType);
  if (!activeRound) return false;

  const { error } = await supabase
    .from("feedback_rounds")
    .update({ source_clusters: newClusters as unknown as Record<string, unknown> })
    .eq("id", activeRound.id);

  if (error) {
    console.error("Error updating source clusters:", error);
    return false;
  }
  return true;
}
