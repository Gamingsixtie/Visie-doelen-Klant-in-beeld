// ============================================
// DATA PERSISTENCE LAYER
// LocalStorage-based persistence for sessions and data
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
  getInitialFlowState
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
  FLOW_STATES: "kib_flow_states"
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

  return session;
}

// Sync function for Supabase
function syncToSupabase(table: string, data: Record<string, unknown>, operation = 'insert') {
  if (isSupabaseConfigured() && supabase) {
    if (operation === 'insert') {
      supabase.from(table).insert(data).then(({ error }: { error: unknown }) => {
        if (error) console.error('Supabase sync error:', error);
      });
    } else if (operation === 'update') {
      supabase.from(table).update(data.updates).eq('id', data.id).then(({ error }: { error: unknown }) => {
        if (error) console.error('Supabase sync error:', error);
      });
    } else if (operation === 'delete') {
      supabase.from(table).delete().eq('id', data.id).then(({ error }: { error: unknown }) => {
        if (error) console.error('Supabase sync error:', error);
      });
    }
  }
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
  }
}

export function updateSessionStep(id: string, step: FlowStep): void {
  updateSession(id, { currentStep: step });
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

  return newText;
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

export function saveFlowState(sessionId: string, state: FlowState): void {
  const flowStates = getFromStorage<{ sessionId: string; state: FlowState }>(STORAGE_KEYS.FLOW_STATES);
  const filtered = flowStates.filter((f) => f.sessionId !== sessionId);
  filtered.push({ sessionId, state });
  setInStorage(STORAGE_KEYS.FLOW_STATES, filtered);
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
