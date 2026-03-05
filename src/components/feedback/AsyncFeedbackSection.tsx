"use client";

import { useState, useEffect } from "react";
import { FACILITATOR_NAME } from "@/lib/types";
import type { FeedbackStepType } from "@/lib/feedback-service";

const STEP_DESCRIPTIONS: Record<string, string> = {
  doelen: "Laat MT-leden op hun eigen tijd feedback geven op deze doelen. Ze kunnen opmerkingen plaatsen, tekst aanpassen en samenvoeg-suggesties doen.",
  scope: "Laat MT-leden op hun eigen tijd feedback geven op de scope-afbakening. Ze kunnen items aanpassen, toevoegen of opmerkingen plaatsen.",
  visie_huidige: "Laat MT-leden op hun eigen tijd feedback geven op de visietekst over de huidige situatie.",
  visie_gewenste: "Laat MT-leden op hun eigen tijd feedback geven op de visietekst over de gewenste situatie.",
  visie_beweging: "Laat MT-leden op hun eigen tijd feedback geven op de visietekst over de beweging/verandering.",
  visie_stakeholders: "Laat MT-leden op hun eigen tijd feedback geven op de visietekst over de stakeholders."
};

interface AsyncFeedbackSectionProps {
  sessionId: string;
  sourceData: unknown[];
  stepType: FeedbackStepType;
  showToast: (message: string, type: "success" | "error") => void;
}

export function AsyncFeedbackSection({ sessionId, sourceData, stepType, showToast }: AsyncFeedbackSectionProps) {
  const [feedbackUrl, setFeedbackUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hasExistingRound, setHasExistingRound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check for existing feedback round for this step type
  useEffect(() => {
    if (!sessionId) return;
    import("@/lib/feedback-service").then(async (fb) => {
      const round = await fb.getActiveRound(sessionId, stepType);
      if (round) {
        setHasExistingRound(true);
        setFeedbackUrl(`${window.location.origin}/sessies/${sessionId}/feedback?step=${stepType}`);
      }
    });
  }, [sessionId, stepType]);

  const handleStartFeedback = async () => {
    if (!sessionId || sourceData.length === 0) return;
    setIsCreating(true);

    try {
      const fb = await import("@/lib/feedback-service");
      const round = await fb.createFeedbackRound(sessionId, sourceData, FACILITATOR_NAME, stepType);
      if (round) {
        const url = `${window.location.origin}/sessies/${sessionId}/feedback?step=${stepType}`;
        setFeedbackUrl(url);
        setHasExistingRound(true);
        showToast("Feedbackronde gestart! Deel de link met MT-leden.", "success");
      } else {
        showToast("Fout bij starten feedbackronde. Zijn de database-tabellen aangemaakt?", "error");
      }
    } catch (err) {
      console.error("Error creating feedback round:", err);
      showToast("Fout bij starten feedbackronde", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (!feedbackUrl) return;
    navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    showToast("Link gekopieerd!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const description = STEP_DESCRIPTIONS[stepType] || STEP_DESCRIPTIONS.doelen;

  return (
    <div className="card bg-amber-50 border-amber-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Async MT Feedback</h3>
          <p className="text-sm text-gray-600 mb-3">{description}</p>

          {feedbackUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={feedbackUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800 text-sm flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Gekopieerd
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Kopieer
                    </>
                  )}
                </button>
              </div>
              <a
                href={feedbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cito-blue hover:underline inline-flex items-center gap-1"
              >
                Open feedback pagina
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ) : (
            <button
              onClick={handleStartFeedback}
              disabled={isCreating || sourceData.length === 0}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="spinner w-4 h-4" />
                  Feedbackronde starten...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Async feedbackronde starten
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
