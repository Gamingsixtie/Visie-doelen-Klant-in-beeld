// ============================================
// FEEDBACK SERVICE - Supabase CRUD voor async MT doelen-feedback
// ============================================

import { supabase, isSupabaseConfigured } from "./supabase";

// === Types ===

export type SuggestionType = "priority" | "text_edit" | "merge" | "comment";
export type SuggestionVoteValue = "accept" | "reject";
export type FeedbackRoundStatus = "open" | "closed";

export interface FeedbackRound {
  id: string;
  session_id: string;
  source_clusters: unknown[];
  status: FeedbackRoundStatus;
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
  sourceClusters: unknown[]
): Promise<FeedbackRound | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("feedback_rounds")
    .insert({
      session_id: sessionId,
      source_clusters: sourceClusters as unknown as Record<string, unknown>,
      status: "open"
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
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No rows
    console.error("Error fetching latest open round:", error);
    return null;
  }

  return data as unknown as FeedbackRound;
}

export async function closeFeedbackRound(roundId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("feedback_rounds")
    .update({ status: "closed" })
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
}

export async function getFullRoundData(roundId: string): Promise<FullRoundData | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  // Fetch round
  const { data: round, error: roundError } = await supabase
    .from("feedback_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

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

  return {
    round: round as unknown as FeedbackRound,
    suggestions: (suggestions || []) as unknown as FeedbackSuggestion[],
    votes
  };
}
