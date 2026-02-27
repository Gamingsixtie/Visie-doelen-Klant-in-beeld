"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type {
  StoredSession,
  StoredDocument,
  FlowState,
  FlowStep,
  QuestionType,
  StoredApprovedText
} from "./types";
import { getInitialFlowState } from "./types";
import * as persistence from "./persistence";

// === CONTEXT TYPE ===

interface SessionContextType {
  // Current session
  currentSession: StoredSession | null;
  flowState: FlowState;
  documents: StoredDocument[];
  approvedTexts: StoredApprovedText[];
  isLoading: boolean;

  // Session management
  createNewSession: (name: string) => StoredSession;
  loadSession: (sessionId: string) => void;
  closeSession: () => void;

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

  // Load existing sessions on mount
  useEffect(() => {
    refreshSessions();
    setIsLoading(false);
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
  }, []);

  const closeSession = useCallback(() => {
    setCurrentSession(null);
    setFlowState(getInitialFlowState());
    setDocuments([]);
    setApprovedTexts([]);
  }, []);

  // Document management
  const addDocument = useCallback((doc: Omit<StoredDocument, "id" | "sessionId">): StoredDocument => {
    if (!currentSession) throw new Error("No active session");

    const savedDoc = persistence.saveDocument(currentSession.id, doc);
    setDocuments((prev) => [...prev, savedDoc]);
    return savedDoc;
  }, [currentSession]);

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
  }, [currentSession]);

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
    },
    [currentSession]
  );

  const getApprovedTextFn = useCallback(
    (questionType: QuestionType): StoredApprovedText | null => {
      return approvedTexts.find((t) => t.questionType === questionType) || null;
    },
    [approvedTexts]
  );

  const value: SessionContextType = {
    currentSession,
    flowState,
    documents,
    approvedTexts,
    isLoading,
    createNewSession,
    loadSession,
    closeSession,
    addDocument,
    removeDocument,
    updateDocumentResponse,
    updateFlowState,
    setCurrentStep,
    completeStep,
    unlockStep,
    saveApprovedText: saveApprovedTextFn,
    getApprovedText: getApprovedTextFn,
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
