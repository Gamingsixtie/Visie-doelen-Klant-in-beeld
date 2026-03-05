"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type {
  StoredSession,
  StoredDocument,
  FlowState,
  FlowStep,
  QuestionType,
  StoredApprovedText,
  SyncState,
  VisieSubStepKey,
  VisieStepSyncState,
  DoelenStepSyncState
} from "./types";
import { getInitialFlowState, getInitialSyncState } from "./types";
import * as persistence from "./persistence";
import { useSaveStatus } from "./save-status-context";

// === CONTEXT TYPE ===

interface SessionContextType {
  // Current session
  currentSession: StoredSession | null;
  flowState: FlowState;
  documents: StoredDocument[];
  approvedTexts: StoredApprovedText[];
  syncState: SyncState;
  isLoading: boolean;
  isViewerMode: boolean;

  // Session management
  createNewSession: (name: string) => StoredSession;
  loadSession: (sessionId: string) => void;
  loadSessionFromSync: (sessionId: string) => Promise<boolean>;
  syncSessionToServer: () => Promise<void>;
  closeSession: () => void;
  completeSession: () => void;

  // Document management
  addDocument: (doc: Omit<StoredDocument, "id" | "sessionId">) => StoredDocument;
  removeDocument: (docId: string) => void;
  updateDocumentResponse: (docId: string, questionType: QuestionType, newText: string) => void;

  // Flow state management
  updateFlowState: (updates: Partial<FlowState>) => void;
  setCurrentStep: (step: FlowStep) => void;
  completeStep: (step: FlowStep) => void;
  unlockStep: (step: FlowStep) => void;

  // Approved texts
  saveApprovedText: (questionType: QuestionType, text: string, proposalId: string, variantId: string) => void;
  getApprovedText: (questionType: QuestionType) => StoredApprovedText | null;
  removeApprovedText: (questionType: QuestionType) => void;

  // Real-time sync state (for viewer sync)
  updateVisieStepState: (subStep: VisieSubStepKey, state: Partial<VisieStepSyncState>) => void;
  getVisieStepState: (subStep: VisieSubStepKey) => VisieStepSyncState;
  updateDoelenStepState: (state: Partial<DoelenStepSyncState>) => void;
  getDoelenStepState: () => DoelenStepSyncState;

  // Check for existing sessions
  existingSessions: StoredSession[];
  refreshSessions: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// === PROVIDER ===

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<StoredSession | null>(null);
  const [flowState, setFlowState] = useState<FlowState>(getInitialFlowState());
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [approvedTexts, setApprovedTexts] = useState<StoredApprovedText[]>([]);
  const [existingSessions, setExistingSessions] = useState<StoredSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(getInitialSyncState());
  const { triggerSave } = useSaveStatus();

  // Load existing sessions on mount - first sync from Supabase, then load
  useEffect(() => {
    async function init() {
      try {
        await persistence.initFromSupabase();
      } catch (e) {
        console.error("Failed to init from Supabase:", e);
      }
      refreshSessions();
      setIsLoading(false);
    }
    init();
  }, []);

  const refreshSessions = useCallback(() => {
    const sessions = persistence.listSessions();
    setExistingSessions(sessions);
  }, []);

  // Session management
  const createNewSession = useCallback((name: string): StoredSession => {
    const session = persistence.createSession(name);
    const initialState = getInitialFlowState();

    persistence.saveFlowState(session.id, initialState);

    setCurrentSession(session);
    setFlowState(initialState);
    setDocuments([]);
    setApprovedTexts([]);
    setSyncState(getInitialSyncState());
    refreshSessions();

    return session;
  }, [refreshSessions]);

  const loadSession = useCallback((sessionId: string) => {
    const session = persistence.getSession(sessionId);
    if (!session) return;

    const savedFlowState = persistence.getFlowState(sessionId);
    const savedDocuments = persistence.getDocuments(sessionId);
    const savedApprovedTexts = persistence.getAllApprovedTexts(sessionId);

    setCurrentSession(session);
    setFlowState(savedFlowState || getInitialFlowState());
    setDocuments(savedDocuments);
    setApprovedTexts(savedApprovedTexts);
    setSyncState(getInitialSyncState()); // Reset sync state for presenter
    setIsViewerMode(false);
  }, []);

  // Load session from server sync (for viewers)
  // IMPORTANT: This does NOT save to localStorage - viewers only get live data from server
  const loadSessionFromSync = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/session-sync?sessionId=${sessionId}`);
      const data = await response.json();

      if (!data.available || !data.sessionData) {
        return false;
      }

      const { session, flowState: syncedFlowState, documents: syncedDocs, approvedTexts: syncedTexts, syncState: syncedSyncState } = data.sessionData;

      // ONLY update React state - do NOT save to localStorage
      // This ensures viewers always get fresh data from server
      if (session) {
        setCurrentSession(session);
      }
      if (syncedFlowState) {
        setFlowState(syncedFlowState);
      }
      if (syncedDocs && Array.isArray(syncedDocs)) {
        setDocuments(syncedDocs);
      }
      if (syncedTexts && Array.isArray(syncedTexts)) {
        setApprovedTexts(syncedTexts);
      }
      if (syncedSyncState) {
        setSyncState(syncedSyncState);
      }

      // ALWAYS set viewer mode when loading from sync
      setIsViewerMode(true);
      return true;
    } catch (error) {
      console.error("Failed to load session from sync:", error);
      return false;
    }
  }, []);

  // Sync current session to server (for presenters to share)
  // This is called whenever session data changes
  const syncSessionToServer = useCallback(async (): Promise<void> => {
    if (!currentSession || isViewerMode) return; // Viewers should never sync TO server

    try {
      const sessionData = {
        session: currentSession,
        flowState,
        documents,
        approvedTexts,
        syncState
      };

      await fetch("/api/session-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          sessionData
        })
      });
    } catch (error) {
      console.error("Failed to sync session to server:", error);
    }
  }, [currentSession, flowState, documents, approvedTexts, syncState, isViewerMode]);

  const closeSession = useCallback(() => {
    setCurrentSession(null);
    setFlowState(getInitialFlowState());
    setDocuments([]);
    setApprovedTexts([]);
    setSyncState(getInitialSyncState());
  }, []);

  const completeSession = useCallback(() => {
    if (!currentSession) return;

    persistence.updateSession(currentSession.id, { status: "completed" });
    setCurrentSession((prev) => prev ? { ...prev, status: "completed" } : null);
    refreshSessions();
  }, [currentSession, refreshSessions]);

  // Document management
  const addDocument = useCallback((doc: Omit<StoredDocument, "id" | "sessionId">): StoredDocument => {
    if (!currentSession) throw new Error("No active session");

    const savedDoc = persistence.saveDocument(currentSession.id, doc);
    setDocuments((prev) => [...prev, savedDoc]);
    triggerSave();
    return savedDoc;
  }, [currentSession, triggerSave]);

  const removeDocument = useCallback((docId: string) => {
    persistence.deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  const updateDocumentResponse = useCallback(
    (docId: string, questionType: QuestionType, newText: string) => {
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id === docId) {
            const updatedDoc = {
              ...doc,
              parsedResponses: {
                ...doc.parsedResponses,
                [questionType]: newText
              }
            };
            // Also persist the change
            persistence.updateDocument(docId, updatedDoc);
            return updatedDoc;
          }
          return doc;
        })
      );
    },
    []
  );

  // Flow state management
  const updateFlowState = useCallback((updates: Partial<FlowState>) => {
    if (!currentSession) return;

    setFlowState((prev) => {
      const newState = { ...prev, ...updates };
      persistence.saveFlowState(currentSession.id, newState);
      return newState;
    });
    triggerSave();
  }, [currentSession, triggerSave]);

  const setCurrentStep = useCallback((step: FlowStep) => {
    if (!currentSession) return;

    setFlowState((prev) => {
      const newState = { ...prev, currentStep: step };
      persistence.saveFlowState(currentSession.id, newState);
      persistence.updateSessionStep(currentSession.id, step);
      return newState;
    });
  }, [currentSession]);

  const completeStep = useCallback((step: FlowStep) => {
    if (!currentSession) return;

    setFlowState((prev) => {
      const newSteps = { ...prev.steps, [step]: "completed" as const };
      const newState = { ...prev, steps: newSteps };
      persistence.saveFlowState(currentSession.id, newState);
      return newState;
    });
  }, [currentSession]);

  const unlockStep = useCallback((step: FlowStep) => {
    if (!currentSession) return;

    setFlowState((prev) => {
      if (prev.steps[step] === "locked") {
        const newSteps = { ...prev.steps, [step]: "active" as const };
        const newState = { ...prev, steps: newSteps };
        persistence.saveFlowState(currentSession.id, newState);
        return newState;
      }
      return prev;
    });
  }, [currentSession]);

  // Approved texts
  const saveApprovedTextFn = useCallback(
    (questionType: QuestionType, text: string, proposalId: string, variantId: string) => {
      if (!currentSession) return;

      const savedText = persistence.saveApprovedText(currentSession.id, {
        questionType,
        text,
        approvedAt: new Date(),
        basedOnProposalId: proposalId,
        basedOnVariantId: variantId
      });

      setApprovedTexts((prev) => {
        const filtered = prev.filter((t) => t.questionType !== questionType);
        return [...filtered, savedText];
      });
      triggerSave();
    },
    [currentSession]
  );

  const getApprovedTextFn = useCallback(
    (questionType: QuestionType): StoredApprovedText | null => {
      return approvedTexts.find((t) => t.questionType === questionType) || null;
    },
    [approvedTexts]
  );

  const removeApprovedTextFn = useCallback(
    (questionType: QuestionType) => {
      if (!currentSession) return;
      persistence.deleteApprovedText(currentSession.id, questionType);
      setApprovedTexts((prev) => prev.filter((t) => t.questionType !== questionType));
      triggerSave();
    },
    [currentSession, triggerSave]
  );

  // Real-time sync state management
  const updateVisieStepState = useCallback(
    (subStep: VisieSubStepKey, state: Partial<VisieStepSyncState>) => {
      setSyncState((prev) => ({
        ...prev,
        visieSteps: {
          ...prev.visieSteps,
          [subStep]: {
            ...prev.visieSteps[subStep],
            ...state
          }
        }
      }));
    },
    []
  );

  const getVisieStepState = useCallback(
    (subStep: VisieSubStepKey): VisieStepSyncState => {
      return syncState.visieSteps[subStep] || getInitialSyncState().visieSteps[subStep];
    },
    [syncState]
  );

  // Doelen step sync state management
  const updateDoelenStepState = useCallback(
    (state: Partial<DoelenStepSyncState>) => {
      setSyncState((prev) => ({
        ...prev,
        doelenStep: {
          ...prev.doelenStep,
          ...state
        }
      }));
    },
    []
  );

  const getDoelenStepState = useCallback(
    (): DoelenStepSyncState => {
      return syncState.doelenStep || getInitialSyncState().doelenStep;
    },
    [syncState]
  );

  const value: SessionContextType = {
    currentSession,
    flowState,
    documents,
    approvedTexts,
    syncState,
    isLoading,
    isViewerMode,
    createNewSession,
    loadSession,
    loadSessionFromSync,
    syncSessionToServer,
    closeSession,
    completeSession,
    addDocument,
    removeDocument,
    updateDocumentResponse,
    updateFlowState,
    setCurrentStep,
    completeStep,
    unlockStep,
    saveApprovedText: saveApprovedTextFn,
    getApprovedText: getApprovedTextFn,
    removeApprovedText: removeApprovedTextFn,
    updateVisieStepState,
    getVisieStepState,
    updateDoelenStepState,
    getDoelenStepState,
    existingSessions,
    refreshSessions
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// === HOOK ===

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
