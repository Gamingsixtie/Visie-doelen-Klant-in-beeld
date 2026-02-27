"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { ResponseMatrix } from "@/components/consolidation";
import { ThemeClusterList } from "@/components/consolidation/ThemeCluster";
import { ProposalCard } from "@/components/voting";
import type { QuestionType, ThemeCluster, ProposalVariant } from "@/lib/types";

interface VisieStepProps {
  subStep: "visie_huidige" | "visie_gewenste" | "visie_beweging" | "visie_stakeholders";
  onComplete: () => void;
}

const SUB_STEP_CONFIG: Record<
  VisieStepProps["subStep"],
  { questionType: QuestionType; title: string; description: string }
> = {
  visie_huidige: {
    questionType: "current_situation",
    title: "Huidige situatie",
    description: "Analyseer hoe het MT de huidige situatie beschrijft"
  },
  visie_gewenste: {
    questionType: "desired_situation",
    title: "Gewenste situatie",
    description: "Analyseer hoe het MT de gewenste toekomst ziet"
  },
  visie_beweging: {
    questionType: "change_direction",
    title: "Beweging",
    description: "Analyseer welke verandering nodig is"
  },
  visie_stakeholders: {
    questionType: "stakeholders",
    title: "Belanghebbenden",
    description: "Analyseer voor wie deze verandering relevant is"
  }
};

type StepPhase = "overview" | "analyzing" | "themes" | "voting" | "approved";

export function VisieStep({ subStep, onComplete }: VisieStepProps) {
  const { documents, saveApprovedText, getApprovedText } = useSession();
  const config = SUB_STEP_CONFIG[subStep];

  const [phase, setPhase] = useState<StepPhase>("overview");
  const [themes, setThemes] = useState<ThemeCluster[]>([]);
  const [proposals, setProposals] = useState<ProposalVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  // Check if already approved
  useEffect(() => {
    const approvedText = getApprovedText(config.questionType);
    if (approvedText) {
      setPhase("approved");
    }
  }, [config.questionType, getApprovedText]);

  // Get responses for this question
  const responses = documents
    .filter((doc) => doc.parsedResponses[config.questionType])
    .map((doc) => ({
      respondentId: doc.respondentId,
      filename: doc.filename,
      answer: doc.parsedResponses[config.questionType]
    }));

  const handleStartAnalysis = async () => {
    setPhase("analyzing");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: config.questionType,
          responses: responses.map((r) => ({
            respondentId: r.respondentId,
            answer: r.answer
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Analyse mislukt");
      }

      const result = await response.json();
      setThemes(result.themes || []);
      setPhase("themes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setPhase("overview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTheme = (updatedTheme: ThemeCluster) => {
    setThemes((prev) =>
      prev.map((t) => (t.id === updatedTheme.id ? updatedTheme : t))
    );
  };

  const handleDeleteTheme = (themeId: string) => {
    setThemes((prev) => prev.filter((t) => t.id !== themeId));
  };

  const handleGenerateProposals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: config.questionType,
          themes,
          originalResponses: responses
        })
      });

      if (!response.ok) {
        throw new Error("Genereren van voorstellen mislukt");
      }

      const result = await response.json();
      setProposals(result.variants || []);
      setRecommendation(result.recommendation || null);

      // Pre-select recommended variant
      const recommendedVariant = result.variants?.find(
        (v: ProposalVariant) => v.type === result.recommendation
      );
      if (recommendedVariant) {
        setSelectedVariant(recommendedVariant.id);
      }

      setPhase("voting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProposal = (variantId: string, newText: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === variantId ? { ...p, text: newText } : p))
    );
  };

  const handleApprove = () => {
    if (!selectedVariant) return;

    const variant = proposals.find((p) => p.id === selectedVariant);
    if (!variant) return;

    saveApprovedText(config.questionType, variant.text, "proposal-1", variant.id);
    setPhase("approved");
    onComplete();
  };

  const approvedText = getApprovedText(config.questionType);

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Visie: {config.title}
          </h1>
          <p className="text-gray-600">{config.description}</p>

          {/* Phase indicator */}
          <div className="mt-4 flex items-center gap-2">
            {["overview", "themes", "voting", "approved"].map((p, index) => (
              <div key={p} className="flex items-center">
                {index > 0 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    phase === p
                      ? "bg-cito-blue text-white"
                      : ["overview", "themes", "voting", "approved"].indexOf(phase) >
                        index
                      ? "bg-cito-green text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Phase: Overview - Show all responses */}
        {phase === "overview" && (
          <div className="space-y-6">
            {/* Toggle between list and matrix view */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowMatrix(!showMatrix)}
                className="text-sm text-cito-blue hover:underline flex items-center gap-1"
              >
                {showMatrix ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Lijst weergave
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Matrix weergave
                  </>
                )}
              </button>
            </div>

            {showMatrix ? (
              <div className="card overflow-hidden">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Antwoorden vergelijken
                </h2>
                <ResponseMatrix
                  documents={documents}
                  questionTypes={[config.questionType]}
                  highlightConsensus
                />
              </div>
            ) : (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Alle antwoorden ({responses.length})
                </h2>

                {responses.length === 0 ? (
                  <p className="text-gray-500">
                    Geen antwoorden gevonden. Upload eerst de MT-canvassen.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {responses.map((r) => (
                      <div
                        key={r.respondentId}
                        className="p-4 bg-gray-50 rounded-lg border-l-4 border-cito-blue"
                      >
                        <p className="text-sm font-medium text-cito-blue mb-1">
                          {r.filename.replace(".docx", "")}
                        </p>
                        <p className="text-gray-800">{r.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {responses.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleStartAnalysis}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Start AI analyse
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase: Analyzing */}
        {phase === "analyzing" && (
          <div className="card text-center py-12">
            <div className="spinner mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              AI analyseert de antwoorden...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Zoekt naar overeenkomsten, verschillen en thema's
            </p>
          </div>
        )}

        {/* Phase: Themes */}
        {phase === "themes" && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Gevonden thema's ({themes.length})
                </h2>
                <span className="text-sm text-gray-500">
                  Klik op een thema om te bewerken
                </span>
              </div>

              <ThemeClusterList
                themes={themes}
                onUpdateTheme={handleUpdateTheme}
                onDeleteTheme={handleDeleteTheme}
                editable
                showQuickWins
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("overview")}
                className="btn btn-secondary"
              >
                Terug naar overzicht
              </button>
              <button
                onClick={handleGenerateProposals}
                disabled={isLoading || themes.length === 0}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Genereer formuleringen
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Phase: Voting */}
        {phase === "voting" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Kies een formulering
              </h2>
              <p className="text-gray-600 mb-6">
                Selecteer de formulering die het beste past. Je kunt de tekst ook aanpassen.
              </p>

              <div className="space-y-4">
                {proposals.map((variant) => (
                  <ProposalCard
                    key={variant.id}
                    variant={variant}
                    isSelected={selectedVariant === variant.id}
                    isRecommended={variant.type === recommendation}
                    onSelect={() => setSelectedVariant(variant.id)}
                    editable
                    onEdit={(text) => handleEditProposal(variant.id, text)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("themes")}
                className="btn btn-secondary"
              >
                Terug naar thema's
              </button>
              <button
                onClick={handleApprove}
                disabled={!selectedVariant}
                className="btn btn-success flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Goedkeuren
              </button>
            </div>
          </div>
        )}

        {/* Phase: Approved */}
        {phase === "approved" && approvedText && (
          <div className="space-y-6">
            <div className="card bg-green-50 border-2 border-green-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-white"
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
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-green-800 mb-3">
                    {config.title} - Goedgekeurd
                  </h2>
                  <p className="text-gray-800 text-lg leading-relaxed">
                    {approvedText.text}
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    Goedgekeurd op:{" "}
                    {new Date(approvedText.approvedAt).toLocaleString("nl-NL")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={onComplete} className="btn btn-primary flex items-center gap-2">
                Volgende stap
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
