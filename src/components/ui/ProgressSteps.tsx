"use client";

interface ProgressStep {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  currentStepIndex: number;
}

export function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step.status === "completed"
                    ? "bg-green-500 text-white"
                    : step.status === "current"
                    ? "bg-cito-blue text-white ring-4 ring-cito-light-blue"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step.status === "completed" ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`ml-3 text-sm font-medium ${
                  step.status === "current" ? "text-cito-blue" : "text-gray-600"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 mx-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      step.status === "completed" ? "bg-green-500 w-full" : "w-0"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile view */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium ${
                step.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : step.status === "current"
                  ? "bg-cito-blue text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {index + 1}. {step.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact progress bar
interface MiniProgressProps {
  current: number;
  total: number;
  label?: string;
}

export function MiniProgress({ current, total, label }: MiniProgressProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-cito-blue">{percentage}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-cito-blue rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
