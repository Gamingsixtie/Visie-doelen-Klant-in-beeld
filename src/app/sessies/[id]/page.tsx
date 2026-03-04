"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { SessionHeader, ProgressIndicator, StepNavigation } from "@/components/layout";
import { UploadStep } from "@/components/steps/UploadStep";
import { VisieStep } from "@/components/steps/VisieStep";
import { VisieSummaryStep } from "@/components/steps/VisieSummaryStep";
import { DoelenStep } from "@/components/steps/DoelenStep";
import { ScopeStep } from "@/components/steps/ScopeStep";
import { ExportStep } from "@/components/steps/ExportStep";
import type { FlowStep } from "@/lib/types";

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.id as string;
  const isSyncMode = searchParams.get("sync") === "true";

  const {
    currentSession,
    flowState,
    syncState,
    loadSession,
    loadSessionFromSync,
    syncSessionToServer,
    setCurrentStep,
    completeStep,
    unlockStep,
    isLoading,
    isViewerMode
  } = useSession();

  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "failed">("idle");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-sync session to server when data changes (for presenters)
  // Sync immediately when any data changes (including syncState for component-level state)
  useEffect(() => {
    if (currentSession && !isViewerMode && !isSyncMode) {
      syncSessionToServer();
    }
  }, [currentSession, flowState, syncState, syncSessionToServer, isViewerMode, isSyncMode]);

  // Auto-refresh for viewers - with visual feedback
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    // Only run auto-refresh for sync mode (QR code viewers)
    if (!autoRefresh || !isSyncMode || !sessionId) return;

    const refreshData = async () => {
      const success = await loadSessionFromSync(sessionId);
      if (success) {
        setLastRefresh(new Date());
      }
    };

    // Initial refresh
    refreshData();

    const interval = setInterval(refreshData, 2000); // Refresh every 2 seconds for faster sync

    return () => clearInterval(interval);
  }, [autoRefresh, isSyncMode, sessionId, loadSessionFromSync]);

  // Load session on mount
  useEffect(() => {
    const initSession = async () => {
      if (!sessionId) return;

      // If sync mode (viewer via QR code), ONLY load from server - never local
      if (isSyncMode) {
        setSyncStatus("syncing");
        const success = await loadSessionFromSync(sessionId);
        setSyncStatus(success ? "success" : "failed");
        if (success) {
          setAutoRefresh(true); // Enable auto-refresh for synced sessions
        }
      } else {
        // Presenter mode - load from local storage
        loadSession(sessionId);
      }

      setIsInitialized(true);
    };

    initSession();
  }, [sessionId, isSyncMode, loadSession, loadSessionFromSync]);

  // Redirect if session not found (only if not in sync mode or sync failed)
  useEffect(() => {
    if (isInitialized && !isLoading && !currentSession && syncStatus !== "syncing") {
      if (syncStatus === "failed" || !isSyncMode) {
        // Don't redirect immediately in sync mode, show error
        if (!isSyncMode) {
          router.push("/");
        }
      }
    }
  }, [isInitialized, isLoading, currentSession, router, syncStatus, isSyncMode]);

  const handleStepClick = (step: FlowStep) => {
    setCurrentStep(step);
  };

  const handleStepComplete = () => {
    const currentStep = flowState.currentStep;
    completeStep(currentStep);

    // Unlock and navigate to next step
    const stepOrder: FlowStep[] = [
      "upload",
      "visie_huidige",
      "visie_gewenste",
      "visie_beweging",
      "visie_stakeholders",
      "visie_samenvatting",
      "doelen",
      "scope",
      "export"
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      unlockStep(nextStep);
      setCurrentStep(nextStep);
    }
  };

  const handleNavigate = (step: FlowStep) => {
    setCurrentStep(step);
  };

  // Show sync loading state
  if (syncStatus === "syncing") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="spinner" />
        <p className="text-gray-600">Sessie synchroniseren...</p>
      </div>
    );
  }

  // Show sync error state
  if (isSyncMode && syncStatus === "failed" && !currentSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Sessie niet beschikbaar</h2>
        <p className="text-gray-600 text-center max-w-md">
          De sessie is nog niet gedeeld door de presentator, of de link is verlopen.
          Vraag de presentator om de sessie te delen via de &quot;Meekijken&quot; knop.
        </p>
        <button
          onClick={() => loadSessionFromSync(sessionId)}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (isLoading || !isInitialized || !currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const renderCurrentStep = () => {
    // Pass readOnly={true} when in sync mode (viewing via QR code)
    const readOnly = isSyncMode;

    switch (flowState.currentStep) {
      case "upload":
        return <UploadStep onComplete={handleStepComplete} readOnly={readOnly} />;
      case "visie_huidige":
      case "visie_gewenste":
      case "visie_beweging":
      case "visie_stakeholders":
        return (
          <VisieStep
            key={flowState.currentStep}
            subStep={flowState.currentStep}
            onComplete={handleStepComplete}
            onNavigateToStep={(step) => setCurrentStep(step)}
            readOnly={readOnly}
          />
        );
      case "visie_samenvatting":
        return (
          <VisieSummaryStep
            onComplete={handleStepComplete}
            onNavigateToStep={(step) => setCurrentStep(step)}
          />
        );
      case "doelen":
        return <DoelenStep onComplete={handleStepComplete} readOnly={readOnly} />;
      case "scope":
        return <ScopeStep onComplete={handleStepComplete} readOnly={readOnly} />;
      case "export":
        return <ExportStep />;
      default:
        return <UploadStep onComplete={handleStepComplete} readOnly={readOnly} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <SessionHeader />

      {/* Viewer mode banner - shown when accessing via QR code (sync mode) */}
      {isSyncMode && (
        <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="font-medium">Bekijk modus</span>
            <span className="text-purple-200 text-sm">- Je volgt de sessie van de presentator</span>
            {autoRefresh && lastRefresh && (
              <span className="text-purple-200 text-xs ml-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-purple-300"
              />
              Auto-vernieuwen
            </label>
            <button
              onClick={async () => {
                const success = await loadSessionFromSync(sessionId);
                if (success) setLastRefresh(new Date());
              }}
              className="px-3 py-1 bg-purple-500 hover:bg-purple-400 rounded text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Vernieuwen
            </button>
          </div>
        </div>
      )}

      <ProgressIndicator
        currentStep={flowState.currentStep}
        onStepClick={handleStepClick}
      />

      <main className="flex-1 overflow-auto">{renderCurrentStep()}</main>

      {flowState.currentStep !== "export" && !isSyncMode && (
        <StepNavigation
          currentStep={flowState.currentStep}
          onNavigate={handleNavigate}
          canProceed={flowState.steps[flowState.currentStep] === "completed"}
        />
      )}
    </div>
  );
}
