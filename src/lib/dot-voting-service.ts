// ============================================
// DOT VOTING SERVICE - Supabase CRUD voor async dot voting
// ============================================

import { supabase, isSupabaseConfigured } from "./supabase";

export interface DotVote {
  id: string;
  session_id: string;
  member_name: string;
  cluster_id: string;
  dots: number;
  created_at: string;
  updated_at: string;
}

export interface DotVotingReady {
  id: string;
  session_id: string;
  member_name: string;
  created_at: string;
}

// === Dot Votes CRUD ===

export async function getDotVotes(sessionId: string): Promise<DotVote[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("dot_votes")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error fetching dot votes:", error);
    return [];
  }
  return (data || []) as unknown as DotVote[];
}

export async function upsertDotVote(
  sessionId: string,
  memberName: string,
  clusterId: string,
  dots: number
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  if (dots <= 0) {
    // Delete the vote if dots is 0
    const { error } = await supabase
      .from("dot_votes")
      .delete()
      .eq("session_id", sessionId)
      .eq("member_name", memberName)
      .eq("cluster_id", clusterId);

    if (error) {
      console.error("Error deleting dot vote:", error);
      return false;
    }
    return true;
  }

  const { error } = await supabase
    .from("dot_votes")
    .upsert(
      {
        session_id: sessionId,
        member_name: memberName,
        cluster_id: clusterId,
        dots,
        updated_at: new Date().toISOString()
      },
      { onConflict: "session_id,member_name,cluster_id" }
    );

  if (error) {
    console.error("Error upserting dot vote:", error);
    return false;
  }
  return true;
}

export async function getMemberDotVotes(
  sessionId: string,
  memberName: string
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured() || !supabase) return {};

  const { data, error } = await supabase
    .from("dot_votes")
    .select("cluster_id, dots")
    .eq("session_id", sessionId)
    .eq("member_name", memberName);

  if (error) {
    console.error("Error fetching member dot votes:", error);
    return {};
  }

  const votes: Record<string, number> = {};
  (data || []).forEach((row: { cluster_id: string; dots: number }) => {
    votes[row.cluster_id] = row.dots;
  });
  return votes;
}

// Convert all votes to the allVotes format used by DoelenStep
export async function getAllVotesMap(
  sessionId: string
): Promise<Record<string, Record<string, number>>> {
  const votes = await getDotVotes(sessionId);
  const allVotes: Record<string, Record<string, number>> = {};

  votes.forEach(vote => {
    if (!allVotes[vote.member_name]) {
      allVotes[vote.member_name] = {};
    }
    allVotes[vote.member_name][vote.cluster_id] = vote.dots;
  });

  return allVotes;
}

// === Ready Status ===

export async function getReadyMembers(sessionId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("dot_voting_ready")
    .select("member_name")
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error fetching ready members:", error);
    return [];
  }
  return (data || []).map((r: { member_name: string }) => r.member_name);
}

export async function markVotingReady(sessionId: string, memberName: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("dot_voting_ready")
    .upsert(
      { session_id: sessionId, member_name: memberName },
      { onConflict: "session_id,member_name" }
    );

  if (error) {
    console.error("Error marking voting ready:", error);
    return false;
  }
  return true;
}

export async function unmarkVotingReady(sessionId: string, memberName: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("dot_voting_ready")
    .delete()
    .eq("session_id", sessionId)
    .eq("member_name", memberName);

  if (error) {
    console.error("Error unmarking voting ready:", error);
    return false;
  }
  return true;
}

// === Reset ===

export async function resetDotVoting(sessionId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error: votesError } = await supabase
    .from("dot_votes")
    .delete()
    .eq("session_id", sessionId);

  const { error: readyError } = await supabase
    .from("dot_voting_ready")
    .delete()
    .eq("session_id", sessionId);

  if (votesError || readyError) {
    console.error("Error resetting dot voting:", votesError || readyError);
    return false;
  }
  return true;
}
