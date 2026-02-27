// ============================================
// SUPABASE SERVICE LAYER
// Database operaties voor Klant in Beeld app
// ============================================

import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  StoredSession,
  StoredDocument,
  StoredAnalysis,
  StoredProposal,
  StoredVote,
  StoredApprovedText,
  FlowState,
  FlowStep,
  QuestionType,
  ThemeCluster,
  ProposalVariant,
  VoteValue
} from "./types";

// ============================================
// SESSION OPERATIONS
// ============================================

export async function createSession(name: string): Promise<StoredSession | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .insert({ name, status: "in_progress", current_step: "upload" })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    status: data.status as "in_progress" | "completed",
    currentStep: data.current_step as FlowStep
  };
}

export async function getSessions(): Promise<StoredSession[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }

  return data.map((s) => ({
    id: s.id,
    name: s.name,
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
    status: s.status as "in_progress" | "completed",
    currentStep: s.current_step as FlowStep
  }));
}

export async function getSession(id: string): Promise<StoredSession | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching session:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    status: data.status as "in_progress" | "completed",
    currentStep: data.current_step as FlowStep
  };
}

export async function updateSession(
  id: string,
  updates: Partial<{
    name: string;
    status: "in_progress" | "completed";
    currentStep: FlowStep;
    flowState: FlowState;
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.currentStep) dbUpdates.current_step = updates.currentStep;
  if (updates.flowState) dbUpdates.flow_state = updates.flowState;

  const { error } = await supabase
    .from("sessions")
    .update(dbUpdates)
    .eq("id", id);

  if (error) {
    console.error("Error updating session:", error);
    return false;
  }

  return true;
}

export async function deleteSession(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting session:", error);
    return false;
  }

  return true;
}

// ============================================
// DOCUMENT OPERATIONS
// ============================================

export async function addDocument(
  sessionId: string,
  doc: Omit<StoredDocument, "id" | "uploadedAt">
): Promise<StoredDocument | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      session_id: sessionId,
      filename: doc.filename,
      respondent_id: doc.respondentId,
      respondent_name: doc.respondentId, // Use respondentId as name for now
      raw_text: doc.rawText,
      parsed_responses: doc.parsedResponses
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding document:", error);
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    filename: data.filename,
    respondentId: data.respondent_id,
    uploadedAt: new Date(data.uploaded_at),
    rawText: data.raw_text,
    parsedResponses: data.parsed_responses as Record<QuestionType, string>
  };
}

export async function getDocuments(sessionId: string): Promise<StoredDocument[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("session_id", sessionId)
    .order("uploaded_at", { ascending: true });

  if (error) {
    console.error("Error fetching documents:", error);
    return [];
  }

  return data.map((d) => ({
    id: d.id,
    sessionId: d.session_id,
    filename: d.filename,
    respondentId: d.respondent_id,
    uploadedAt: new Date(d.uploaded_at),
    rawText: d.raw_text,
    parsedResponses: d.parsed_responses as Record<QuestionType, string>
  }));
}

export async function updateDocument(
  id: string,
  updates: Partial<{ parsedResponses: Record<QuestionType, string> }>
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("documents")
    .update({ parsed_responses: updates.parsedResponses })
    .eq("id", id);

  if (error) {
    console.error("Error updating document:", error);
    return false;
  }

  return true;
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    console.error("Error deleting document:", error);
    return false;
  }

  return true;
}

// ============================================
// ANALYSIS OPERATIONS
// ============================================

export async function saveAnalysis(
  sessionId: string,
  questionType: QuestionType,
  analysis: {
    themes: ThemeCluster[];
    quickWins: string[];
    discussionPoints: string[];
  }
): Promise<StoredAnalysis | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("analyses")
    .upsert({
      session_id: sessionId,
      question_type: questionType,
      themes: analysis.themes,
      quick_wins: analysis.quickWins,
      discussion_points: analysis.discussionPoints
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving analysis:", error);
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    questionType: data.question_type as QuestionType,
    analyzedAt: new Date(data.analyzed_at),
    themes: data.themes as ThemeCluster[],
    quickWins: data.quick_wins as string[],
    discussionPoints: data.discussion_points as string[]
  };
}

export async function getAnalysis(
  sessionId: string,
  questionType: QuestionType
): Promise<StoredAnalysis | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("session_id", sessionId)
    .eq("question_type", questionType)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      // Not found is ok
      console.error("Error fetching analysis:", error);
    }
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    questionType: data.question_type as QuestionType,
    analyzedAt: new Date(data.analyzed_at),
    themes: data.themes as ThemeCluster[],
    quickWins: data.quick_wins as string[],
    discussionPoints: data.discussion_points as string[]
  };
}

// ============================================
// PROPOSAL OPERATIONS
// ============================================

export async function createProposal(
  sessionId: string,
  proposal: Omit<StoredProposal, "id" | "createdAt">
): Promise<StoredProposal | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      session_id: sessionId,
      question_type: proposal.questionType,
      theme_id: proposal.themeId,
      variants: proposal.variants,
      status: proposal.status,
      recommendation: null,
      recommendation_rationale: null
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating proposal:", error);
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    questionType: data.question_type as QuestionType,
    themeId: data.theme_id || undefined,
    variants: data.variants as ProposalVariant[],
    status: data.status as "draft" | "voting" | "approved" | "rejected",
    createdAt: new Date(data.created_at),
    approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
    approvedVariantId: data.approved_variant_id || undefined
  };
}

export async function getProposals(
  sessionId: string,
  questionType?: QuestionType
): Promise<StoredProposal[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let query = supabase
    .from("proposals")
    .select("*")
    .eq("session_id", sessionId);

  if (questionType) {
    query = query.eq("question_type", questionType);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching proposals:", error);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    sessionId: p.session_id,
    questionType: p.question_type as QuestionType,
    themeId: p.theme_id || undefined,
    variants: p.variants as ProposalVariant[],
    status: p.status as "draft" | "voting" | "approved" | "rejected",
    createdAt: new Date(p.created_at),
    approvedAt: p.approved_at ? new Date(p.approved_at) : undefined,
    approvedVariantId: p.approved_variant_id || undefined
  }));
}

export async function updateProposal(
  id: string,
  updates: Partial<{
    status: "draft" | "voting" | "approved" | "rejected";
    approvedVariantId: string;
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const dbUpdates: Record<string, unknown> = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.approvedVariantId) {
    dbUpdates.approved_variant_id = updates.approvedVariantId;
    dbUpdates.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("proposals")
    .update(dbUpdates)
    .eq("id", id);

  if (error) {
    console.error("Error updating proposal:", error);
    return false;
  }

  return true;
}

// ============================================
// VOTE OPERATIONS
// ============================================

export async function castVote(
  sessionId: string,
  vote: Omit<StoredVote, "id" | "votedAt">
): Promise<StoredVote | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("votes")
    .upsert({
      session_id: sessionId,
      proposal_id: vote.proposalId,
      variant_id: vote.variantId,
      respondent_id: vote.respondentId,
      value: vote.value,
      comment: vote.comment
    })
    .select()
    .single();

  if (error) {
    console.error("Error casting vote:", error);
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    proposalId: data.proposal_id,
    variantId: data.variant_id,
    respondentId: data.respondent_id,
    value: data.value as VoteValue,
    comment: data.comment || undefined,
    votedAt: new Date(data.voted_at)
  };
}

export async function getVotes(
  sessionId: string,
  proposalId?: string
): Promise<StoredVote[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  let query = supabase.from("votes").select("*").eq("session_id", sessionId);

  if (proposalId) {
    query = query.eq("proposal_id", proposalId);
  }

  const { data, error } = await query.order("voted_at", { ascending: true });

  if (error) {
    console.error("Error fetching votes:", error);
    return [];
  }

  return data.map((v) => ({
    id: v.id,
    sessionId: v.session_id,
    proposalId: v.proposal_id,
    variantId: v.variant_id,
    respondentId: v.respondent_id,
    value: v.value as VoteValue,
    comment: v.comment || undefined,
    votedAt: new Date(v.voted_at)
  }));
}

// ============================================
// APPROVED TEXT OPERATIONS
// ============================================

export async function saveApprovedText(
  sessionId: string,
  questionType: QuestionType,
  text: string,
  proposalId: string,
  variantId: string
): Promise<StoredApprovedText | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("approved_texts")
    .upsert({
      session_id: sessionId,
      question_type: questionType,
      text,
      based_on_proposal_id: proposalId,
      based_on_variant_id: variantId
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving approved text:", error);
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    questionType: data.question_type as QuestionType,
    text: data.text,
    approvedAt: new Date(data.approved_at),
    basedOnProposalId: data.based_on_proposal_id,
    basedOnVariantId: data.based_on_variant_id
  };
}

export async function getApprovedTexts(
  sessionId: string
): Promise<StoredApprovedText[]> {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await supabase
    .from("approved_texts")
    .select("*")
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error fetching approved texts:", error);
    return [];
  }

  return data.map((t) => ({
    id: t.id,
    sessionId: t.session_id,
    questionType: t.question_type as QuestionType,
    text: t.text,
    approvedAt: new Date(t.approved_at),
    basedOnProposalId: t.based_on_proposal_id,
    basedOnVariantId: t.based_on_variant_id
  }));
}

export async function getApprovedText(
  sessionId: string,
  questionType: QuestionType
): Promise<StoredApprovedText | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("approved_texts")
    .select("*")
    .eq("session_id", sessionId)
    .eq("question_type", questionType)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching approved text:", error);
    }
    return null;
  }

  return {
    id: data.id,
    sessionId: data.session_id,
    questionType: data.question_type as QuestionType,
    text: data.text,
    approvedAt: new Date(data.approved_at),
    basedOnProposalId: data.based_on_proposal_id,
    basedOnVariantId: data.based_on_variant_id
  };
}

// ============================================
// FULL SESSION DATA (for migration/export)
// ============================================

export interface FullSessionData {
  session: StoredSession;
  documents: StoredDocument[];
  analyses: StoredAnalysis[];
  proposals: StoredProposal[];
  votes: StoredVote[];
  approvedTexts: StoredApprovedText[];
}

export async function getFullSessionData(
  sessionId: string
): Promise<FullSessionData | null> {
  const session = await getSession(sessionId);
  if (!session) return null;

  const [documents, proposals, votes, approvedTexts] = await Promise.all([
    getDocuments(sessionId),
    getProposals(sessionId),
    getVotes(sessionId),
    getApprovedTexts(sessionId)
  ]);

  // Get all analyses for this session
  const questionTypes: QuestionType[] = [
    "current_situation",
    "desired_situation",
    "change_direction",
    "stakeholders",
    "goal_1",
    "goal_2",
    "goal_3",
    "out_of_scope"
  ];

  const analysesPromises = questionTypes.map((qt) => getAnalysis(sessionId, qt));
  const analysesResults = await Promise.all(analysesPromises);
  const analyses = analysesResults.filter((a): a is StoredAnalysis => a !== null);

  return {
    session,
    documents,
    analyses,
    proposals,
    votes,
    approvedTexts
  };
}
