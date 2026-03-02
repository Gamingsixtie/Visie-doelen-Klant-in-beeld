"use client";

import { useState } from "react";

interface RegenerateFeedbackProps {
  onRegenerate: (feedback: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  currentText?: string;
}

export function RegenerateFeedback({
  onRegenerate,
  onCancel,
  isLoading = false,
  currentText
}: RegenerateFeedbackProps) {
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback.trim()) {
      onRegenerate(feedback.trim());
    }
  };

  const quickFeedbackOptions = [
    "Maak het korter en bondiger",
    "Maak het uitgebreider",
    "Gebruik eenvoudigere taal",
    "Maak het concreter met voorbeelden",
    "Focus meer op de klant",
    "Voeg meetbare doelen toe"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Opnieuw genereren met feedback
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {currentText && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Huidige tekst:</p>
              <p className="text-gray-800">{currentText}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Wat wil je anders?
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Beschrijf wat je anders wilt zien in de gegenereerde tekst..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue resize-none"
                rows={4}
                disabled={isLoading}
              />
            </div>

            {/* Quick feedback options */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Of kies een snelle optie:</p>
              <div className="flex flex-wrap gap-2">
                {quickFeedbackOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFeedback(option)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      feedback === option
                        ? "bg-cito-blue text-white border-cito-blue"
                        : "bg-white text-gray-700 border-gray-300 hover:border-cito-blue hover:text-cito-blue"
                    }`}
                    disabled={isLoading}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isLoading}
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={!feedback.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Opnieuw genereren
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
