// ============================================
// DATA PERSISTENCE LAYER
// Dual persistence: localStorage (fast cache) + Supabase (primary storage)
// ============================================

import { v4 as uuidv4 } from "uuid";
import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  StoredSession,
  StoredDocument,
  StoredAnalysis,
  StoredProposal,
  StoredVote,
  StoredApprovedText,
  StoredFinalDocument,
  FlowStep,
  QuestionType,
  FlowState,
  getInitialFlowState,
  ClusterVersion,
  ClusterVersionTrigger
} from "./types";

// Storage keys
const STORAGE_KEYS = {
  SESSIONS: "kib_sessions",
  DOCUMENTS: "kib_documents",
  ANALYSES: "kib_analyses",
  PROPOSALS: "kib_proposals",
  VOTES: "kib_votes",
  APPROVED_TEXTS: "kib_approved_texts",
  FINAL_DOCUMENTS: "kib_final_documents",
  FLOW_STATES: "kib_flow_states",
  GENERATED_VISION: "kib_generated_vision",
  GOAL_CLUSTERS: "kib_goal_clusters",
  GOAL_CLUSTER_VERSIONS: "kib_goal_cluster_versions",
  SCOPE_ITEMS: "kib_scope_items"
};

// === HELPER FUNCTIONS ===

function getFromStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

function setInStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function parseDate(dateStr: string | Date): Date {
  return typeof dateStr === "string" ? new Date(dateStr) : dateStr;
}

// ============================================
// SUPABASE SYNC HELPERS
// Fire-and-forget: write to Supabase in background
// ============================================

function sbInsert(table: string, data: Record<string, unknown>) {
  if (!isSupabaseConfigured() || !supabase) return;
  supabase.from(table).insert(data).then(({ error }) => {
    if (error) console.error(`[Supabase] insert ${table}:`, error.message);
  });
}

function sbUpsert(table: string, data: Record<string, unknown>) {
  if (!isSupabaseConfigured() || !supabase) return;
  supabase.from(table).upsert(data).then(({ error }) => {
    if (error) console.error(`[Supabase] upsert ${table}:`, error.message);
  });
}

function sbUpdate(table: string, id: string, data: Record<string, unknown>) {
  if (!isSupabaseConfigured() || !supabase) return;
  supabase.from(table).update(data).eq('id', id).then(({ error }) => {
    if (error) console.error(`[Supabase] update ${table}:`, error.message);
  });
}

function sbDelete(table: string, id: string) {
  if (!isSupabaseConfigured() || !supabase) return;
  supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) console.error(`[Supabase] delete ${table}:`, error.message);
  });
}

function sbDeleteBySession(table: string, sessionId: string) {
  if (!isSupabaseConfigured() || !supabase) return;
  supabase.from(table).delete().eq('session_id', sessionId).then(({ error }) => {
    if (error) console.error(`[Supabase] delete ${table} by session:`, error.message);
  });
}

// ============================================
// INIT FROM SUPABASE
// Load all data from Supabase into localStorage on app start
// ============================================

export async function initFromSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    console.log('[Supabase] Loading data from Supabase...');

    // Fetch all data in parallel
    const [sessionsRes, documentsRes, analysesRes, proposalsRes, votesRes, approvedTextsRes] = await Promise.all([
      supabase.from('sessions').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*').order('uploaded_at', { ascending: true }),
      supabase.from('analyses').select('*'),
      supabase.from('proposals').select('*').order('created_at', { ascending: true }),
      supabase.from('votes').select('*').order('voted_at', { ascending: true }),
      supabase.from('approved_texts').select('*')
    ]);

    // Map Supabase data to localStorage format and store
    if (sessionsRes.data && sessionsRes.data.length > 0) {
      const sessions = sessionsRes.data.map(s => ({
        id: s.id,
        name: s.name,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        status: s.status,
        currentStep: s.current_step
      }));
      // Merge: Supabase data takes priority, keep local-only sessions
      const localSessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
      const supabaseIds = new Set(sessions.map(s => s.id));
      const localOnly = localSessions.filter(s => !supabaseIds.has(s.id));
      setInStorage(STORAGE_KEYS.SESSIONS, [...sessions, ...localOnly]);
      console.log(`[Supabase] Loaded ${sessions.length} sessions`);
    }

    if (documentsRes.data && documentsRes.data.length > 0) {
      const documents = documentsRes.data.map(d => ({
        id: d.id,
        sessionId: d.session_id,
        filename: d.filename,
        respondentId: d.respondent_id,
        uploadedAt: d.uploaded_at,
        rawText: d.raw_text,
        parsedResponses: d.parsed_responses
      }));
      const localDocs = getFromStorage<StoredDocument>(STORAGE_KEYS.DOCUMENTS);
      const sbIds = new Set(documents.map(d => d.id));
      const localOnly = localDocs.filter(d => !sbIds.has(d.id));
      setInStorage(STORAGE_KEYS.DOCUMENTS, [...documents, ...localOnly]);
      console.log(`[Supabase] Loaded ${documents.length} documents`);
    }

    if (analysesRes.data && analysesRes.data.length > 0) {
      const analyses = analysesRes.data.map(a => ({
        id: a.id,
        sessionId: a.session_id,
        questionType: a.question_type,
        analyzedAt: a.analyzed_at,
        themes: a.themes,
        quickWins: a.quick_wins,
        discussionPoints: a.discussion_points
      }));
      const localAnalyses = getFromStorage<StoredAnalysis>(STORAGE_KEYS.ANALYSES);
      const sbIds = new Set(analyses.map(a => a.id));
      const localOnly = localAnalyses.filter(a => !sbIds.has(a.id));
      setInStorage(STORAGE_KEYS.ANALYSES, [...analyses, ...localOnly]);
      console.log(`[Supabase] Loaded ${analyses.length} analyses`);
    }

    if (proposalsRes.data && proposalsRes.data.length > 0) {
      const proposals = proposalsRes.data.map(p => ({
        id: p.id,
        sessionId: p.session_id,
        questionType: p.question_type,
        themeId: p.theme_id || undefined,
        variants: p.variants,
        status: p.status,
        createdAt: p.created_at,
        approvedAt: p.approved_at || undefined,
        approvedVariantId: p.approved_variant_id || undefined
      }));
      const localProposals = getFromStorage<StoredProposal>(STORAGE_KEYS.PROPOSALS);
      const sbIds = new Set(proposals.map(p => p.id));
      const localOnly = localProposals.filter(p => !sbIds.has(p.id));
      setInStorage(STORAGE_KEYS.PROPOSALS, [...proposals, ...localOnly]);
      console.log(`[Supabase] Loaded ${proposals.length} proposals`);
    }

    if (votesRes.data && votesRes.data.length > 0) {
      const votes = votesRes.data.map(v => ({
        id: v.id,
        sessionId: v.session_id,
        proposalId: v.proposal_id,
        variantId: v.variant_id,
        respondentId: v.respondent_id,
        value: v.value,
        comment: v.comment || undefined,
        votedAt: v.voted_at
      }));
      setInStorage(STORAGE_KEYS.VOTES, votes);
      console.log(`[Supabase] Loaded ${votes.length} votes`);
    }

    if (approvedTextsRes.data && approvedTextsRes.data.length > 0) {
      const approvedTexts = approvedTextsRes.data.map(t => ({
        id: t.id,
        sessionId: t.session_id,
        questionType: t.question_type,
        text: t.text,
        approvedAt: t.approved_at,
        basedOnProposalId: t.based_on_proposal_id,
        basedOnVariantId: t.based_on_variant_id
      }));
      const localTexts = getFromStorage<StoredApprovedText>(STORAGE_KEYS.APPROVED_TEXTS);
      const sbIds = new Set(approvedTexts.map(t => t.id));
      const localOnly = localTexts.filter(t => !sbIds.has(t.id));
      setInStorage(STORAGE_KEYS.APPROVED_TEXTS, [...approvedTexts, ...localOnly]);
      console.log(`[Supabase] Loaded ${approvedTexts.length} approved texts`);
    }

    // Load flow_state, generated_vision, and goal_clusters from sessions.flow_state
    if (sessionsRes.data) {
      const flowStatesFromDb: { sessionId: string; state: FlowState }[] = [];
      const visionsFromDb: StoredGeneratedVision[] = [];
      const goalClustersFromDb: { sessionId: string; clusters: unknown[]; selectedClusterIds: string[]; allVotes: Record<string, Record<string, number>>; ranking: string[]; formulations: Record<string, string>; phase: string; savedAt: Date }[] = [];

      for (const s of sessionsRes.data) {
        if (!s.flow_state || Object.keys(s.flow_state).length === 0) continue;
        const combined = s.flow_state as Record<string, unknown>;

        // Extract flowState
        if (combined.flowState) {
          flowStatesFromDb.push({ sessionId: s.id, state: combined.flowState as FlowState });
        } else if (combined.currentStep) {
          // Direct flow state (not nested)
          flowStatesFromDb.push({ sessionId: s.id, state: combined as unknown as FlowState });
        }

        // Extract generatedVision
        if (combined.generatedVision) {
          const gv = combined.generatedVision as { uitgebreid: string; beknopt: string; generatedAt: string };
          visionsFromDb.push({
            sessionId: s.id,
            uitgebreid: gv.uitgebreid,
            beknopt: gv.beknopt,
            generatedAt: new Date(gv.generatedAt)
          });
        }

        // Extract goalClusters
        if (combined.goalClusters) {
          const gc = combined.goalClusters as Record<string, unknown>;
          goalClustersFromDb.push({
            sessionId: s.id,
            clusters: (gc.clusters || []) as unknown[],
            selectedClusterIds: (gc.selectedClusterIds || []) as string[],
            allVotes: (gc.allVotes || {}) as Record<string, Record<string, number>>,
            ranking: (gc.ranking || []) as string[],
            formulations: (gc.formulations || {}) as Record<string, string>,
            phase: (gc.phase || 'clusters') as string,
            savedAt: new Date((gc.savedAt as string) || new Date().toISOString())
          });
        }

        // Extract goalClusterVersions
        if (combined.goalClusterVersions && Array.isArray(combined.goalClusterVersions)) {
          const versions = combined.goalClusterVersions as ClusterVersion[];
          const existing = getFromStorage<ClusterVersion>(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS);
          const existingIds = new Set(existing.map(v => v.id));
          const newVersions = versions.filter(v => !existingIds.has(v.id));
          if (newVersions.length > 0) {
            setInStorage(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS, [...existing, ...newVersions]);
            console.log(`[Supabase] Loaded ${newVersions.length} cluster versions for session ${s.id}`);
          }
        }

        // Extract scopeItems
        if (combined.scopeItems && Array.isArray(combined.scopeItems)) {
          const items = combined.scopeItems as StoredScopeItem[];
          const existing = getFromStorage<StoredScopeItemsData>(STORAGE_KEYS.SCOPE_ITEMS);
          const alreadyExists = existing.some(d => d.sessionId === s.id);
          if (!alreadyExists && items.length > 0) {
            existing.push({ sessionId: s.id, items, savedAt: new Date() });
            setInStorage(STORAGE_KEYS.SCOPE_ITEMS, existing);
            console.log(`[Supabase] Loaded ${items.length} scope items for session ${s.id}`);
          }
        }
      }

      if (flowStatesFromDb.length > 0) {
        const localFlowStates = getFromStorage<{ sessionId: string; state: FlowState }>(STORAGE_KEYS.FLOW_STATES);
        const sbIds = new Set(flowStatesFromDb.map(f => f.sessionId));
        const localOnly = localFlowStates.filter(f => !sbIds.has(f.sessionId));
        setInStorage(STORAGE_KEYS.FLOW_STATES, [...flowStatesFromDb, ...localOnly]);
        console.log(`[Supabase] Loaded ${flowStatesFromDb.length} flow states`);
      }

      if (visionsFromDb.length > 0) {
        const localVisions = getFromStorage<StoredGeneratedVision>(STORAGE_KEYS.GENERATED_VISION);
        const sbIds = new Set(visionsFromDb.map(v => v.sessionId));
        const localOnly = localVisions.filter(v => !sbIds.has(v.sessionId));
        setInStorage(STORAGE_KEYS.GENERATED_VISION, [...visionsFromDb, ...localOnly]);
        console.log(`[Supabase] Loaded ${visionsFromDb.length} generated visions`);
      }

      if (goalClustersFromDb.length > 0) {
        const localClusters = getFromStorage<{ sessionId: string }>(STORAGE_KEYS.GOAL_CLUSTERS);
        const sbIds = new Set(goalClustersFromDb.map(g => g.sessionId));
        const localOnly = localClusters.filter(g => !sbIds.has(g.sessionId));
        setInStorage(STORAGE_KEYS.GOAL_CLUSTERS, [...goalClustersFromDb, ...localOnly]);
        console.log(`[Supabase] Loaded ${goalClustersFromDb.length} goal clusters`);
      }
    }

    console.log('[Supabase] Data loading complete');
    return true;
  } catch (error) {
    console.error('[Supabase] Failed to load data:', error);
    return false;
  }
}

// === SESSION ===

export function createSession(name: string): StoredSession {
  const session: StoredSession = {
    id: uuidv4(),
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "in_progress",
    currentStep: "upload"
  };

  const sessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
  sessions.push(session);
  setInStorage(STORAGE_KEYS.SESSIONS, sessions);

  // Sync to Supabase
  sbInsert('sessions', {
    id: session.id,
    name: session.name,
    status: session.status,
    current_step: session.currentStep,
    created_at: session.createdAt.toISOString(),
    updated_at: session.updatedAt.toISOString()
  });

  return session;
}

export function getSession(id: string): StoredSession | null {
  const sessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
  const session = sessions.find((s) => s.id === id);
  if (session) {
    return {
      ...session,
      createdAt: parseDate(session.createdAt),
      updatedAt: parseDate(session.updatedAt)
    };
  }
  return null;
}

// Save or update a full session (used for syncing from server)
export function saveSession(session: StoredSession): void {
  const sessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    // Update existing
    sessions[index] = { ...session, updatedAt: new Date() };
  } else {
    // Add new
    sessions.push(session);
  }
  setInStorage(STORAGE_KEYS.SESSIONS, sessions);
}

export function updateSession(id: string, updates: Partial<StoredSession>): void {
  const sessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
  const index = sessions.findIndex((s) => s.id === id);
  if (index !== -1) {
    sessions[index] = {
      ...sessions[index],
      ...updates,
      updatedAt: new Date()
    };
    setInStorage(STORAGE_KEYS.SESSIONS, sessions);

    // Sync to Supabase
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.currentStep) dbUpdates.current_step = updates.currentStep;
    sbUpdate('sessions', id, dbUpdates);
  }
}

export function updateSessionStep(id: string, step: FlowStep): void {
  updateSession(id, { currentStep: step });
  sbUpdate('sessions', id, { current_step: step });
}

export function listSessions(): StoredSession[] {
  const sessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
  return sessions
    .map((s) => ({
      ...s,
      createdAt: parseDate(s.createdAt),
      updatedAt: parseDate(s.updatedAt)
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function deleteSession(id: string): void {
  // Delete session
  const sessions = getFromStorage<StoredSession>(STORAGE_KEYS.SESSIONS);
  setInStorage(
    STORAGE_KEYS.SESSIONS,
    sessions.filter((s) => s.id !== id)
  );

  // Delete related documents
  const documents = getFromStorage<StoredDocument>(STORAGE_KEYS.DOCUMENTS);
  setInStorage(
    STORAGE_KEYS.DOCUMENTS,
    documents.filter((d) => d.sessionId !== id)
  );

  // Delete related analyses
  const analyses = getFromStorage<StoredAnalysis>(STORAGE_KEYS.ANALYSES);
  setInStorage(
    STORAGE_KEYS.ANALYSES,
    analyses.filter((a) => a.sessionId !== id)
  );

  // Delete related proposals
  const proposals = getFromStorage<StoredProposal>(STORAGE_KEYS.PROPOSALS);
  setInStorage(
    STORAGE_KEYS.PROPOSALS,
    proposals.filter((p) => p.sessionId !== id)
  );

  // Delete related votes
  const votes = getFromStorage<StoredVote>(STORAGE_KEYS.VOTES);
  setInStorage(
    STORAGE_KEYS.VOTES,
    votes.filter((v) => v.sessionId !== id)
  );

  // Delete approved texts
  const approvedTexts = getFromStorage<StoredApprovedText>(STORAGE_KEYS.APPROVED_TEXTS);
  setInStorage(
    STORAGE_KEYS.APPROVED_TEXTS,
    approvedTexts.filter((t) => t.sessionId !== id)
  );

  // Delete final documents
  const finalDocs = getFromStorage<StoredFinalDocument>(STORAGE_KEYS.FINAL_DOCUMENTS);
  setInStorage(
    STORAGE_KEYS.FINAL_DOCUMENTS,
    finalDocs.filter((d) => d.sessionId !== id)
  );

  // Delete flow state
  const flowStates = getFromStorage<{ sessionId: string; state: FlowState }>(STORAGE_KEYS.FLOW_STATES);
  setInStorage(
    STORAGE_KEYS.FLOW_STATES,
    flowStates.filter((f) => f.sessionId !== id)
  );

  // Sync deletion to Supabase (cascade deletes handle related data)
  sbDelete('sessions', id);
}

// === DOCUMENTS ===

export function saveDocument(sessionId: string, doc: Omit<StoredDocument, "id" | "sessionId">): StoredDocument {
  const newDoc: StoredDocument = {
    ...doc,
    id: uuidv4(),
    sessionId
  };

  const documents = getFromStorage<StoredDocument>(STORAGE_KEYS.DOCUMENTS);
  documents.push(newDoc);
  setInStorage(STORAGE_KEYS.DOCUMENTS, documents);

  // Sync to Supabase
  sbInsert('documents', {
    id: newDoc.id,
    session_id: sessionId,
    filename: newDoc.filename,
    respondent_id: newDoc.respondentId,
    respondent_name: newDoc.respondentId,
    raw_text: newDoc.rawText,
    uploaded_at: newDoc.uploadedAt instanceof Date ? newDoc.uploadedAt.toISOString() : newDoc.uploadedAt,
    parsed_responses: newDoc.parsedResponses
  });

  return newDoc;
}

export function getDocuments(sessionId: string): StoredDocument[] {
  const documents = getFromStorage<StoredDocument>(STORAGE_KEYS.DOCUMENTS);
  return documents
    .filter((d) => d.sessionId === sessionId)
    .map((d) => ({
      ...d,
      uploadedAt: parseDate(d.uploadedAt)
    }));
}

export function deleteDocument(id: string): void {
  const documents = getFromStorage<StoredDocument>(STORAGE_KEYS.DOCUMENTS);
  setInStorage(
    STORAGE_KEYS.DOCUMENTS,
    documents.filter((d) => d.id !== id)
  );
  sbDelete('documents', id);
}

export function updateDocument(id: string, updates: Partial<StoredDocument>): void {
  const documents = getFromStorage<StoredDocument>(STORAGE_KEYS.DOCUMENTS);
  const index = documents.findIndex((d) => d.id === id);
  if (index !== -1) {
    documents[index] = {
      ...documents[index],
      ...updates
    };
    setInStorage(STORAGE_KEYS.DOCUMENTS, documents);

    if (updates.parsedResponses) {
      sbUpdate('documents', id, { parsed_responses: updates.parsedResponses });
    }
  }
}

// === ANALYSIS ===

export function saveAnalysis(sessionId: string, analysis: Omit<StoredAnalysis, "id" | "sessionId">): StoredAnalysis {
  const newAnalysis: StoredAnalysis = {
    ...analysis,
    id: uuidv4(),
    sessionId
  };

  const analyses = getFromStorage<StoredAnalysis>(STORAGE_KEYS.ANALYSES);
  // Replace existing analysis for same session and question type
  const filtered = analyses.filter(
    (a) => !(a.sessionId === sessionId && a.questionType === analysis.questionType)
  );
  filtered.push(newAnalysis);
  setInStorage(STORAGE_KEYS.ANALYSES, filtered);

  // Sync to Supabase (upsert by session_id + question_type)
  sbUpsert('analyses', {
    id: newAnalysis.id,
    session_id: sessionId,
    question_type: newAnalysis.questionType,
    analyzed_at: newAnalysis.analyzedAt instanceof Date ? newAnalysis.analyzedAt.toISOString() : newAnalysis.analyzedAt,
    themes: newAnalysis.themes || [],
    quick_wins: newAnalysis.quickWins || [],
    discussion_points: newAnalysis.discussionPoints || []
  });

  return newAnalysis;
}

export function getAnalysis(sessionId: string, questionType: QuestionType): StoredAnalysis | null {
  const analyses = getFromStorage<StoredAnalysis>(STORAGE_KEYS.ANALYSES);
  const analysis = analyses.find(
    (a) => a.sessionId === sessionId && a.questionType === questionType
  );
  if (analysis) {
    return {
      ...analysis,
      analyzedAt: parseDate(analysis.analyzedAt)
    };
  }
  return null;
}

// === PROPOSALS ===

export function saveProposal(sessionId: string, proposal: Omit<StoredProposal, "id" | "sessionId">): StoredProposal {
  const newProposal: StoredProposal = {
    ...proposal,
    id: uuidv4(),
    sessionId
  };

  const proposals = getFromStorage<StoredProposal>(STORAGE_KEYS.PROPOSALS);
  proposals.push(newProposal);
  setInStorage(STORAGE_KEYS.PROPOSALS, proposals);

  // Sync to Supabase
  sbInsert('proposals', {
    id: newProposal.id,
    session_id: sessionId,
    question_type: newProposal.questionType,
    theme_id: newProposal.themeId || null,
    variants: newProposal.variants,
    status: newProposal.status,
    created_at: newProposal.createdAt instanceof Date ? newProposal.createdAt.toISOString() : newProposal.createdAt
  });

  return newProposal;
}

export function updateProposalStatus(
  id: string,
  status: StoredProposal["status"],
  approvedVariantId?: string
): void {
  const proposals = getFromStorage<StoredProposal>(STORAGE_KEYS.PROPOSALS);
  const index = proposals.findIndex((p) => p.id === id);
  if (index !== -1) {
    proposals[index] = {
      ...proposals[index],
      status,
      approvedVariantId,
      approvedAt: status === "approved" ? new Date() : undefined
    };
    setInStorage(STORAGE_KEYS.PROPOSALS, proposals);

    // Sync to Supabase
    const dbUpdates: Record<string, unknown> = { status };
    if (approvedVariantId) {
      dbUpdates.approved_variant_id = approvedVariantId;
      dbUpdates.approved_at = new Date().toISOString();
    }
    sbUpdate('proposals', id, dbUpdates);
  }
}

export function getProposals(sessionId: string, questionType?: QuestionType): StoredProposal[] {
  const proposals = getFromStorage<StoredProposal>(STORAGE_KEYS.PROPOSALS);
  return proposals
    .filter((p) => p.sessionId === sessionId && (!questionType || p.questionType === questionType))
    .map((p) => ({
      ...p,
      createdAt: parseDate(p.createdAt),
      approvedAt: p.approvedAt ? parseDate(p.approvedAt) : undefined
    }));
}

// === VOTES ===

export function saveVote(sessionId: string, vote: Omit<StoredVote, "id" | "sessionId">): StoredVote {
  const newVote: StoredVote = {
    ...vote,
    id: uuidv4(),
    sessionId
  };

  const votes = getFromStorage<StoredVote>(STORAGE_KEYS.VOTES);
  // Replace existing vote from same respondent for same proposal/variant
  const filtered = votes.filter(
    (v) =>
      !(
        v.sessionId === sessionId &&
        v.proposalId === vote.proposalId &&
        v.variantId === vote.variantId &&
        v.respondentId === vote.respondentId
      )
  );
  filtered.push(newVote);
  setInStorage(STORAGE_KEYS.VOTES, filtered);

  // Sync to Supabase
  sbUpsert('votes', {
    id: newVote.id,
    session_id: sessionId,
    proposal_id: newVote.proposalId,
    variant_id: newVote.variantId,
    respondent_id: newVote.respondentId,
    value: newVote.value,
    comment: newVote.comment || null,
    voted_at: newVote.votedAt instanceof Date ? newVote.votedAt.toISOString() : newVote.votedAt
  });

  return newVote;
}

export function getVotes(proposalId: string, variantId?: string): StoredVote[] {
  const votes = getFromStorage<StoredVote>(STORAGE_KEYS.VOTES);
  return votes
    .filter((v) => v.proposalId === proposalId && (!variantId || v.variantId === variantId))
    .map((v) => ({
      ...v,
      votedAt: parseDate(v.votedAt)
    }));
}

export function getVotesBySession(sessionId: string): StoredVote[] {
  const votes = getFromStorage<StoredVote>(STORAGE_KEYS.VOTES);
  return votes
    .filter((v) => v.sessionId === sessionId)
    .map((v) => ({
      ...v,
      votedAt: parseDate(v.votedAt)
    }));
}

// === APPROVED TEXTS ===

export function saveApprovedText(
  sessionId: string,
  text: Omit<StoredApprovedText, "id" | "sessionId">
): StoredApprovedText {
  const newText: StoredApprovedText = {
    ...text,
    id: uuidv4(),
    sessionId
  };

  const approvedTexts = getFromStorage<StoredApprovedText>(STORAGE_KEYS.APPROVED_TEXTS);
  // Replace existing for same question type
  const filtered = approvedTexts.filter(
    (t) => !(t.sessionId === sessionId && t.questionType === text.questionType)
  );
  filtered.push(newText);
  setInStorage(STORAGE_KEYS.APPROVED_TEXTS, filtered);

  // Sync to Supabase
  sbUpsert('approved_texts', {
    id: newText.id,
    session_id: sessionId,
    question_type: newText.questionType,
    text: newText.text,
    approved_at: newText.approvedAt instanceof Date ? newText.approvedAt.toISOString() : newText.approvedAt,
    based_on_proposal_id: null,
    based_on_variant_id: newText.basedOnVariantId
  });

  return newText;
}

export function deleteApprovedText(sessionId: string, questionType: QuestionType): void {
  const approvedTexts = getFromStorage<StoredApprovedText>(STORAGE_KEYS.APPROVED_TEXTS);
  const toDelete = approvedTexts.find(
    (t) => t.sessionId === sessionId && t.questionType === questionType
  );
  const filtered = approvedTexts.filter(
    (t) => !(t.sessionId === sessionId && t.questionType === questionType)
  );
  setInStorage(STORAGE_KEYS.APPROVED_TEXTS, filtered);

  if (toDelete) {
    sbDelete('approved_texts', toDelete.id);
  }
}

export function getApprovedText(sessionId: string, questionType: QuestionType): StoredApprovedText | null {
  const approvedTexts = getFromStorage<StoredApprovedText>(STORAGE_KEYS.APPROVED_TEXTS);
  const text = approvedTexts.find(
    (t) => t.sessionId === sessionId && t.questionType === questionType
  );
  if (text) {
    return {
      ...text,
      approvedAt: parseDate(text.approvedAt)
    };
  }
  return null;
}

export function getAllApprovedTexts(sessionId: string): StoredApprovedText[] {
  const approvedTexts = getFromStorage<StoredApprovedText>(STORAGE_KEYS.APPROVED_TEXTS);
  return approvedTexts
    .filter((t) => t.sessionId === sessionId)
    .map((t) => ({
      ...t,
      approvedAt: parseDate(t.approvedAt)
    }));
}

// === FINAL DOCUMENT ===

export function saveFinalDocument(
  sessionId: string,
  doc: Omit<StoredFinalDocument, "id" | "sessionId">
): StoredFinalDocument {
  const newDoc: StoredFinalDocument = {
    ...doc,
    id: uuidv4(),
    sessionId
  };

  const finalDocs = getFromStorage<StoredFinalDocument>(STORAGE_KEYS.FINAL_DOCUMENTS);
  // Replace existing
  const filtered = finalDocs.filter((d) => d.sessionId !== sessionId);
  filtered.push(newDoc);
  setInStorage(STORAGE_KEYS.FINAL_DOCUMENTS, filtered);

  return newDoc;
}

export function getFinalDocument(sessionId: string): StoredFinalDocument | null {
  const finalDocs = getFromStorage<StoredFinalDocument>(STORAGE_KEYS.FINAL_DOCUMENTS);
  const doc = finalDocs.find((d) => d.sessionId === sessionId);
  if (doc) {
    return {
      ...doc,
      generatedAt: parseDate(doc.generatedAt),
      exportedAt: doc.exportedAt ? parseDate(doc.exportedAt) : undefined
    };
  }
  return null;
}

// === FLOW STATE ===

// Sync flowState + generatedVision + goalClusters as combined object to sessions.flow_state
function syncExtraDataToSupabase(sessionId: string): void {
  const combined: Record<string, unknown> = {};

  const flowStates = getFromStorage<{ sessionId: string; state: FlowState }>(STORAGE_KEYS.FLOW_STATES);
  const fs = flowStates.find(f => f.sessionId === sessionId);
  if (fs) combined.flowState = fs.state;

  const visions = getFromStorage<StoredGeneratedVision>(STORAGE_KEYS.GENERATED_VISION);
  const vision = visions.find(v => v.sessionId === sessionId);
  if (vision) combined.generatedVision = { uitgebreid: vision.uitgebreid, beknopt: vision.beknopt, generatedAt: vision.generatedAt };

  const goalData = getFromStorage<{ sessionId: string; clusters: unknown[]; selectedClusterIds: string[]; allVotes: Record<string, Record<string, number>>; ranking: string[]; formulations: Record<string, string>; phase: string; savedAt: Date }>(STORAGE_KEYS.GOAL_CLUSTERS);
  const gc = goalData.find(g => g.sessionId === sessionId);
  if (gc) combined.goalClusters = { clusters: gc.clusters, selectedClusterIds: gc.selectedClusterIds, allVotes: gc.allVotes, ranking: gc.ranking, formulations: gc.formulations, phase: gc.phase, savedAt: gc.savedAt };

  // Include cluster versions
  const versions = getFromStorage<ClusterVersion>(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS).filter(v => v.sessionId === sessionId);
  if (versions.length > 0) combined.goalClusterVersions = versions;

  // Include scope items
  const scopeData = getFromStorage<StoredScopeItemsData>(STORAGE_KEYS.SCOPE_ITEMS);
  const si = scopeData.find(s => s.sessionId === sessionId);
  if (si) combined.scopeItems = si.items;

  sbUpdate('sessions', sessionId, { flow_state: combined });
}

export function saveFlowState(sessionId: string, state: FlowState): void {
  const flowStates = getFromStorage<{ sessionId: string; state: FlowState }>(STORAGE_KEYS.FLOW_STATES);
  const filtered = flowStates.filter((f) => f.sessionId !== sessionId);
  filtered.push({ sessionId, state });
  setInStorage(STORAGE_KEYS.FLOW_STATES, filtered);

  // Sync combined data to Supabase via sessions.flow_state column
  syncExtraDataToSupabase(sessionId);
}

export function getFlowState(sessionId: string): FlowState | null {
  const flowStates = getFromStorage<{ sessionId: string; state: FlowState }>(STORAGE_KEYS.FLOW_STATES);
  const found = flowStates.find((f) => f.sessionId === sessionId);
  return found ? found.state : null;
}

// === SESSION RECOVERY ===

export interface SessionRecoveryResult {
  type: "resume_prompt" | "new_session";
  session?: StoredSession;
}

export function checkForExistingSession(): SessionRecoveryResult {
  const sessions = listSessions();

  if (sessions.length > 0) {
    const lastInProgressSession = sessions.find((s) => s.status === "in_progress");

    if (lastInProgressSession) {
      return {
        type: "resume_prompt",
        session: lastInProgressSession
      };
    }
  }

  return { type: "new_session" };
}

// === FULL SESSION EXPORT ===

export interface FullSessionExport {
  session: StoredSession;
  documents: StoredDocument[];
  analyses: StoredAnalysis[];
  proposals: StoredProposal[];
  votes: StoredVote[];
  approvedTexts: StoredApprovedText[];
  finalDocument: StoredFinalDocument | null;
  flowState: FlowState | null;
}

export function exportSessionData(sessionId: string): FullSessionExport | null {
  const session = getSession(sessionId);
  if (!session) return null;

  return {
    session,
    documents: getDocuments(sessionId),
    analyses: getFromStorage<StoredAnalysis>(STORAGE_KEYS.ANALYSES).filter(
      (a) => a.sessionId === sessionId
    ),
    proposals: getProposals(sessionId),
    votes: getVotesBySession(sessionId),
    approvedTexts: getAllApprovedTexts(sessionId),
    finalDocument: getFinalDocument(sessionId),
    flowState: getFlowState(sessionId)
  };
}

// === GENERATED VISION ===

export interface StoredGeneratedVision {
  sessionId: string;
  uitgebreid: string;
  beknopt: string;
  generatedAt: Date;
}

export function saveGeneratedVision(
  sessionId: string,
  uitgebreid: string,
  beknopt: string
): StoredGeneratedVision {
  const vision: StoredGeneratedVision = {
    sessionId,
    uitgebreid,
    beknopt,
    generatedAt: new Date()
  };

  const visions = getFromStorage<StoredGeneratedVision>(STORAGE_KEYS.GENERATED_VISION);
  // Replace existing for same session
  const filtered = visions.filter((v) => v.sessionId !== sessionId);
  filtered.push(vision);
  setInStorage(STORAGE_KEYS.GENERATED_VISION, filtered);

  // Sync to Supabase via sessions.flow_state
  syncExtraDataToSupabase(sessionId);

  return vision;
}

export function getGeneratedVision(sessionId: string): StoredGeneratedVision | null {
  const visions = getFromStorage<StoredGeneratedVision>(STORAGE_KEYS.GENERATED_VISION);
  const vision = visions.find((v) => v.sessionId === sessionId);
  if (vision) {
    return {
      ...vision,
      generatedAt: parseDate(vision.generatedAt)
    };
  }
  return null;
}

// === CELEBRATION FLAG ===

export function setCelebrationShown(sessionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`kib_celebration_${sessionId}`, "true");
}

export function isCelebrationShown(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`kib_celebration_${sessionId}`) === "true";
}

// === GOAL CLUSTERS ===

interface StoredGoalClusterData {
  sessionId: string;
  clusters: unknown[];
  selectedClusterIds: string[];
  allVotes: Record<string, Record<string, number>>;
  ranking: string[];
  formulations: Record<string, string>;
  phase: string;
  savedAt: Date;
}

export function saveGoalClusters(
  sessionId: string,
  data: {
    clusters: unknown[];
    selectedClusterIds: string[];
    allVotes: Record<string, Record<string, number>>;
    ranking: string[];
    formulations: Record<string, string>;
    phase: string;
  }
): void {
  const stored: StoredGoalClusterData = {
    sessionId,
    ...data,
    savedAt: new Date()
  };

  const allData = getFromStorage<StoredGoalClusterData>(STORAGE_KEYS.GOAL_CLUSTERS);
  const index = allData.findIndex((d) => d.sessionId === sessionId);
  if (index >= 0) {
    allData[index] = stored;
  } else {
    allData.push(stored);
  }
  setInStorage(STORAGE_KEYS.GOAL_CLUSTERS, allData);

  // Sync to Supabase via sessions.flow_state
  syncExtraDataToSupabase(sessionId);
}

export function getGoalClusters(sessionId: string): StoredGoalClusterData | null {
  const allData = getFromStorage<StoredGoalClusterData>(STORAGE_KEYS.GOAL_CLUSTERS);
  const data = allData.find((d) => d.sessionId === sessionId);
  if (data) {
    return {
      ...data,
      savedAt: parseDate(data.savedAt)
    };
  }
  return null;
}

// === GOAL CLUSTER VERSIONS (append-only history) ===

export function saveClusterVersion(
  sessionId: string,
  clusters: unknown[],
  label: string,
  trigger: ClusterVersionTrigger
): ClusterVersion {
  const version: ClusterVersion = {
    id: uuidv4(),
    sessionId,
    clusters,
    createdAt: new Date(),
    label,
    trigger
  };

  const allVersions = getFromStorage<ClusterVersion>(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS);
  allVersions.push(version);
  setInStorage(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS, allVersions);

  // Sync to Supabase via sessions.flow_state
  syncExtraDataToSupabase(sessionId);

  return version;
}

export function getClusterVersions(sessionId: string): ClusterVersion[] {
  const allVersions = getFromStorage<ClusterVersion>(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS);
  return allVersions
    .filter((v) => v.sessionId === sessionId)
    .map((v) => ({
      ...v,
      createdAt: parseDate(v.createdAt)
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function deleteClusterVersion(sessionId: string, versionId: string): void {
  const allVersions = getFromStorage<ClusterVersion>(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS);
  const filtered = allVersions.filter((v) => !(v.sessionId === sessionId && v.id === versionId));
  setInStorage(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS, filtered);
  syncExtraDataToSupabase(sessionId);
}

export function clearClusterVersions(sessionId: string): void {
  const allVersions = getFromStorage<ClusterVersion>(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS);
  const filtered = allVersions.filter((v) => v.sessionId !== sessionId);
  setInStorage(STORAGE_KEYS.GOAL_CLUSTER_VERSIONS, filtered);
  syncExtraDataToSupabase(sessionId);
}

// === SCOPE ITEMS ===

export interface StoredScopeItem {
  id: string;
  text: string;
  source: string;
}

interface StoredScopeItemsData {
  sessionId: string;
  items: StoredScopeItem[];
  savedAt: Date;
}

export function saveScopeItems(sessionId: string, items: StoredScopeItem[]): void {
  const allData = getFromStorage<StoredScopeItemsData>(STORAGE_KEYS.SCOPE_ITEMS);
  const filtered = allData.filter((d) => d.sessionId !== sessionId);
  filtered.push({ sessionId, items, savedAt: new Date() });
  setInStorage(STORAGE_KEYS.SCOPE_ITEMS, filtered);

  // Sync to Supabase via sessions.flow_state
  syncExtraDataToSupabase(sessionId);
}

export function getScopeItems(sessionId: string): StoredScopeItem[] | null {
  const allData = getFromStorage<StoredScopeItemsData>(STORAGE_KEYS.SCOPE_ITEMS);
  const data = allData.find((d) => d.sessionId === sessionId);
  return data ? data.items : null;
}

export function clearScopeItems(sessionId: string): void {
  const allData = getFromStorage<StoredScopeItemsData>(STORAGE_KEYS.SCOPE_ITEMS);
  const filtered = allData.filter((d) => d.sessionId !== sessionId);
  setInStorage(STORAGE_KEYS.SCOPE_ITEMS, filtered);
  syncExtraDataToSupabase(sessionId);
}
