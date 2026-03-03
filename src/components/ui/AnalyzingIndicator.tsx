"use client";

import { useState, useEffect } from "react";

interface AnalyzingStep {
  label: string;
  icon?: React.ReactNode;
}

interface AnalyzingIndicatorProps {
  steps: AnalyzingStep[];
  /** Total estimated duration in ms. Steps transition evenly. Default: 8000 */
  estimatedDuration?: number;
  title?: string;
  subtitle?: string;
}

export function AnalyzingIndicator({
  steps,
  estimatedDuration = 8000,
  title = "AI is bezig met analyseren...",
  subtitle = "Dit kan enkele seconden duren"
}: AnalyzingIndicatorProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = estimatedDuration / steps.length;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [steps.length, estimatedDuration]);

  return (
    <div className="card text-center py-16 animate-fade-in">
      {/* Spinner */}
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-cito-light-blue" />
        <div className="absolute inset-0 rounded-full border-4 border-cito-blue border-t-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full bg-cito-light-blue flex items-center justify-center">
          <svg className="w-8 h-8 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Step indicators */}
      <div className="max-w-sm mx-auto mb-4 space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-500 ${
              index === currentStep
                ? "bg-cito-light-blue text-cito-blue font-medium"
                : index < currentStep
                ? "text-green-600"
                : "text-gray-400"
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {index < currentStep ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : index === currentStep ? (
                <div className="w-3 h-3 bg-cito-blue rounded-full animate-pulse" />
              ) : (
                <div className="w-3 h-3 bg-gray-300 rounded-full" />
              )}
            </div>
            <span className="text-sm">{step.label}</span>
          </div>
        ))}
      </div>

      <p className="text-gray-500 text-sm">{subtitle}</p>
    </div>
  );
}
