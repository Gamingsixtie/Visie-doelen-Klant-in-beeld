"use client";

import { useSession } from "@/lib/session-context";
import { canProceedTo, getNextStep, getPreviousStep, FLOW_STEP_LABELS, type FlowStep } from "@/lib/types";

interface StepNavigationProps {
  currentStep: FlowStep;
  onNavigate: (step: FlowStep) => void;
  canProceed?: boolean;
  proceedLabel?: string;
  backLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}

export function StepNavigation({
  currentStep,
  onNavigate,
  canProceed = true,
  proceedLabel,
  backLabel,
  showSkip = false,
  onSkip
}: StepNavigationProps) {
  const { flowState } = useSession();

  const previousStep = getPreviousStep(currentStep);
  const nextStep = getNextStep(currentStep);

  const canGoBack = previousStep !== null;
  const canGoForward = nextStep !== null && canProceed && canProceedTo(flowState, nextStep);

  const handleBack = () => {
    if (previousStep) {
      onNavigate(previousStep);
    }
  };

  const handleNext = () => {
    if (nextStep && canGoForward) {
      onNavigate(nextStep);
    }
  };

  return (
    <div className="bg-white border-t px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Back button */}
        <div>
          {canGoBack && (
            <button
              onClick={handleBack}
              className="btn btn-secondary flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {backLabel || (previousStep ? FLOW_STEP_LABELS[previousStep] : "Terug")}
            </button>
          )}
        </div>

        {/* Skip button (optional) */}
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Overslaan
          </button>
        )}

        {/* Next button */}
        <div>
          {nextStep && (
            <button
              onClick={handleNext}
              disabled={!canGoForward}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {proceedLabel || (nextStep ? FLOW_STEP_LABELS[nextStep] : "Volgende")}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Final step - show completion button */}
          {!nextStep && currentStep === "export" && (
            <button
              onClick={() => onNavigate("export")}
              className="btn btn-success flex items-center gap-2"
            >
              Afronden
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
