"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/session-context";
import { SessionHeader, ProgressIndicator, StepNavigation } from "@/components/layout";
import { UploadStep } from "@/components/steps/UploadStep";
import { VisieStep } from "@/components/steps/VisieStep";
import { DoelenStep } from "@/components/steps/DoelenStep";
import { ScopeStep } from "@/components/steps/ScopeStep";
import { ExportStep } from "@/components/steps/ExportStep";
import type { FlowStep } from "@/lib/types";

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const {
    currentSession,
    flowState,
    loadSession,
    setCurrentStep,
    completeStep,
    unlockStep,
    isLoading
  } = useSession();

  const [isInitialized, setIsInitialized] = useState(false);

  // Load session on mount
  useEffect(() => {
    if (sessionId && !currentSession) {
      loadSession(sessionId);
    }
    setIsInitialized(true);
  }, [sessionId, currentSession, loadSession]);

  // Redirect if session not found
  useEffect(() => {
    if (isInitialized && !isLoading && !currentSession) {
      router.push("/");
    }
  }, [isInitialized, isLoading, currentSession, router]);

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

  if (isLoading || !isInitialized || !currentSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (flowState.currentStep) {
      case "upload":
        return <UploadStep onComplete={handleStepComplete} />;
      case "visie_huidige":
      case "visie_gewenste":
      case "visie_beweging":
      case "visie_stakeholders":
        return (
          <VisieStep
            subStep={flowState.currentStep}
            onComplete={handleStepComplete}
          />
        );
      case "doelen":
        return <DoelenStep onComplete={handleStepComplete} />;
      case "scope":
        return <ScopeStep onComplete={handleStepComplete} />;
      case "export":
        return <ExportStep />;
      default:
        return <UploadStep onComplete={handleStepComplete} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <SessionHeader />
      <ProgressIndicator
        currentStep={flowState.currentStep}
        onStepClick={handleStepClick}
      />

      <main className="flex-1 overflow-auto">{renderCurrentStep()}</main>

      {flowState.currentStep !== "export" && (
        <StepNavigation
          currentStep={flowState.currentStep}
          onNavigate={handleNavigate}
          canProceed={flowState.steps[flowState.currentStep] === "completed"}
        />
      )}
    </div>
  );
}
