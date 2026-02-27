"use client";

import { useSession } from "@/lib/session-context";
import { FLOW_ORDER, FLOW_STEP_LABELS, type FlowStep, type StepStatus } from "@/lib/types";

interface ProgressIndicatorProps {
  currentStep?: FlowStep;
  onStepClick?: (step: FlowStep) => void;
}

export function ProgressIndicator({ currentStep, onStepClick }: ProgressIndicatorProps) {
  const { flowState } = useSession();
  const activeStep = currentStep || flowState.currentStep;

  // Group steps for display
  const mainSteps: { key: FlowStep | "visie"; label: string; subSteps?: FlowStep[] }[] = [
    { key: "upload", label: "Upload" },
    {
      key: "visie",
      label: "Visie",
      subSteps: ["visie_huidige", "visie_gewenste", "visie_beweging", "visie_stakeholders"]
    },
    { key: "doelen", label: "Doelen" },
    { key: "scope", label: "Scope" },
    { key: "export", label: "Export" }
  ];

  const getStepStatus = (step: FlowStep): StepStatus => {
    return flowState.steps[step];
  };

  const isVisieActive = (
    activeStep === "visie_huidige" ||
    activeStep === "visie_gewenste" ||
    activeStep === "visie_beweging" ||
    activeStep === "visie_stakeholders"
  );

  const getVisieStatus = (): StepStatus => {
    const huidige = getStepStatus("visie_huidige");
    const gewenste = getStepStatus("visie_gewenste");
    const beweging = getStepStatus("visie_beweging");
    const stakeholders = getStepStatus("visie_stakeholders");

    if (huidige === "completed" && gewenste === "completed" && beweging === "completed" && stakeholders === "completed") {
      return "completed";
    }
    if (huidige !== "locked" || gewenste !== "locked" || beweging !== "locked" || stakeholders !== "locked") {
      return "active";
    }
    return "locked";
  };

  const renderStepIndicator = (status: StepStatus, isActive: boolean) => {
    if (status === "completed") {
      return (
        <div className="step-indicator completed">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }

    if (status === "active" || isActive) {
      return <div className="step-indicator active" />;
    }

    return <div className="step-indicator locked" />;
  };

  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Main steps */}
        <div className="flex items-center justify-between">
          {mainSteps.map((mainStep, index) => {
            const isVisie = mainStep.key === "visie";
            const status = isVisie
              ? getVisieStatus()
              : getStepStatus(mainStep.key as FlowStep);
            const isActive = isVisie ? isVisieActive : activeStep === mainStep.key;
            const canClick =
              status !== "locked" && onStepClick && !isVisie;

            return (
              <div key={mainStep.key} className="flex items-center">
                {index > 0 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      status === "completed" || (status === "active" && !isActive)
                        ? "bg-cito-green"
                        : "bg-gray-200"
                    }`}
                  />
                )}

                <div className="flex flex-col items-center">
                  <button
                    onClick={() => canClick && onStepClick(mainStep.key as FlowStep)}
                    disabled={!canClick}
                    className={`flex flex-col items-center ${
                      canClick ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {renderStepIndicator(status, isActive)}
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isActive
                          ? "text-cito-blue"
                          : status === "completed"
                          ? "text-cito-green"
                          : "text-gray-400"
                      }`}
                    >
                      {mainStep.label}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visie substeps (only show when in visie) */}
        {isVisieActive && (
          <div className="mt-4 ml-[calc(20%+8px)] flex items-center gap-4">
            {["visie_huidige", "visie_gewenste", "visie_beweging", "visie_stakeholders"].map(
              (subStep, index) => {
                const step = subStep as FlowStep;
                const status = getStepStatus(step);
                const isActive = activeStep === step;
                const canClick = status !== "locked" && onStepClick;

                return (
                  <div key={step} className="flex items-center">
                    {index > 0 && (
                      <div
                        className={`w-8 h-0.5 mr-2 ${
                          status === "completed" ? "bg-cito-green" : "bg-gray-200"
                        }`}
                      />
                    )}
                    <button
                      onClick={() => canClick && onStepClick(step)}
                      disabled={!canClick}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        isActive
                          ? "bg-cito-blue text-white"
                          : status === "completed"
                          ? "bg-cito-light-green text-cito-green"
                          : "bg-gray-100 text-gray-400"
                      } ${canClick ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                    >
                      {status === "completed" && (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {FLOW_STEP_LABELS[step]}
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
