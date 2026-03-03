"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/session-context";
import { useToast, AnalyzingIndicator } from "@/components/ui";
import { ResponseMatrix } from "@/components/consolidation";
import { ThemeClusterList } from "@/components/consolidation/ThemeCluster";
import { ThemeVoting, ThemeVotingResults, type ThemeWithVotes } from "@/components/consolidation";
import { ProposalCard } from "@/components/voting";
import { RefineWithAI } from "@/components/ui/RefineWithAI";
import { ConfirmDialog } from "@/components/ui";
import type { QuestionType, ThemeCluster, ProposalVariant } from "@/lib/types";
import * as persistence from "@/lib/persistence";

interface VisieStepProps {
  subStep: "visie_huidige" | "visie_gewenste" | "visie_beweging" | "visie_stakeholders";
  onComplete: () => void;
  onNavigateToStep?: (step: "visie_huidige" | "visie_gewenste" | "visie_beweging" | "visie_stakeholders" | "visie_samenvatting") => void;
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

type StepPhase = "overview" | "analyzing" | "themes" | "theme_voting" | "voting_results" | "voting" | "approved";

// Inline component for adding manual theme in voting results
function AddManualThemeInline({ onAdd }: { onAdd: (name: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [themeName, setThemeName] = useState("");

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="text-sm text-cito-blue hover:underline flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nieuw thema handmatig toevoegen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={themeName}
        onChange={(e) => setThemeName(e.target.value)}
        placeholder="Naam van het thema..."
        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && themeName.trim()) {
            onAdd(themeName.trim());
            setThemeName("");
            setIsAdding(false);
          } else if (e.key === "Escape") {
            setIsAdding(false);
            setThemeName("");
          }
        }}
      />
      <button
        onClick={() => {
          if (themeName.trim()) {
            onAdd(themeName.trim());
            setThemeName("");
            setIsAdding(false);
          }
        }}
        disabled={!themeName.trim()}
        className="px-3 py-1.5 bg-cito-blue text-white text-sm rounded-lg hover:bg-blue-800 disabled:opacity-50"
      >
        Toevoegen
      </button>
      <button
        onClick={() => {
          setIsAdding(false);
          setThemeName("");
        }}
        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
      >
        Annuleren
      </button>
    </div>
  );
}

export function VisieStep({ subStep, onComplete, onNavigateToStep }: VisieStepProps) {
  const { documents, saveApprovedText, getApprovedText, removeApprovedText, updateFlowState, flowState, currentSession } = useSession();
  const { showToast } = useToast();
  const config = SUB_STEP_CONFIG[subStep];

  const [phase, setPhase] = useState<StepPhase>("overview");
  const [themes, setThemes] = useState<ThemeCluster[]>([]);
  const [proposals, setProposals] = useState<ProposalVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<(() => void) | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [votedThemes, setVotedThemes] = useState<ThemeWithVotes[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Load existing data from persistence on mount
  useEffect(() => {
    if (!currentSession) return;

    const approvedText = getApprovedText(config.questionType);
    if (approvedText) {
      setPhase("approved");
      return;
    }

    // Load saved analysis (themes)
    const savedAnalysis = persistence.getAnalysis(currentSession.id, config.questionType);
    if (savedAnalysis && savedAnalysis.themes.length > 0) {
      setThemes(savedAnalysis.themes);

      // Load saved proposals
      const savedProposals = persistence.getProposals(currentSession.id, config.questionType);
      if (savedProposals.length > 0 && savedProposals[0].variants.length > 0) {
        setProposals(savedProposals[0].variants);
        setRecommendation(savedProposals[0].status === "voting" ? "gebalanceerd" : null);
        setPhase("voting");
      } else {
        setPhase("themes");
      }
    }
  }, [currentSession, config.questionType, getApprovedText]);

  // Warn on unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
      const newThemes = result.themes || [];
      setThemes(newThemes);

      // Save analysis to persistence
      if (currentSession && newThemes.length > 0) {
        persistence.saveAnalysis(currentSession.id, {
          questionType: config.questionType,
          analyzedAt: new Date(),
          themes: newThemes,
          quickWins: result.quickWins || [],
          discussionPoints: result.discussionPoints || []
        });
      }

      setPhase("themes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setLastFailedAction(() => handleStartAnalysis);
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

  const handleAddTheme = (newTheme: ThemeCluster) => {
    setThemes((prev) => [...prev, newTheme]);
  };

  const handleGenerateProposals = async (themesToUse?: ThemeCluster[]) => {
    setPhase("analyzing");
    setIsLoading(true);
    setError(null);

    // Use provided themes or fall back to state
    const themesForApi = themesToUse || themes;

    try {
      const response = await fetch("/api/generate-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: config.questionType,
          themes: themesForApi,
          originalResponses: responses
        })
      });

      if (!response.ok) {
        throw new Error("Genereren van voorstellen mislukt");
      }

      const result = await response.json();
      const newProposals = result.variants || [];
      setProposals(newProposals);
      setRecommendation(result.recommendation || null);

      // Save proposals to persistence
      if (currentSession && newProposals.length > 0) {
        persistence.saveProposal(currentSession.id, {
          questionType: config.questionType,
          variants: newProposals,
          status: "voting",
          createdAt: new Date()
        });
      }

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
      setLastFailedAction(() => () => handleGenerateProposals(themesToUse));
      setPhase("voting_results");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProposal = (variantId: string, newText: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === variantId ? { ...p, text: newText } : p))
    );
    setIsDirty(true);
  };

  const handleApprove = () => {
    if (!selectedVariant) return;

    const variant = proposals.find((p) => p.id === selectedVariant);
    if (!variant) return;

    saveApprovedText(config.questionType, variant.text, "proposal-1", variant.id);

    // Update flow state to mark the visie substep as approved
    const visieSubStepMap: Record<string, "huidige" | "gewenste" | "beweging" | "stakeholders"> = {
      visie_huidige: "huidige",
      visie_gewenste: "gewenste",
      visie_beweging: "beweging",
      visie_stakeholders: "stakeholders"
    };
    const visieKey = visieSubStepMap[subStep];
    if (visieKey) {
      updateFlowState({
        visie: {
          ...flowState.visie,
          [visieKey]: { ...flowState.visie[visieKey], status: "approved" }
        }
      });
    }

    setPhase("approved");
    setIsDirty(false);
    showToast(`${config.title} succesvol vastgesteld!`, "success");
    onComplete();
  };

  const guardNavigation = (action: () => void) => {
    if (isDirty) {
      setPendingNavigation(() => action);
      setShowDirtyWarning(true);
    } else {
      action();
    }
  };

  const approvedText = getApprovedText(config.questionType);

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Visie: {config.title}
          </h1>
          <p className="text-gray-600">{config.description}</p>

          {/* Visie steps navigation */}
          {onNavigateToStep && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Visie onderdelen:</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { step: "visie_huidige", label: "A. Huidige situatie", questionType: "current_situation" as QuestionType },
                  { step: "visie_gewenste", label: "B. Gewenste situatie", questionType: "desired_situation" as QuestionType },
                  { step: "visie_beweging", label: "C. Beweging", questionType: "change_direction" as QuestionType },
                  { step: "visie_stakeholders", label: "D. Belanghebbenden", questionType: "stakeholders" as QuestionType },
                  { step: "visie_samenvatting", label: "Samenvatting", questionType: null }
                ] as const).map((item) => {
                  const isCurrent = item.step === subStep;
                  const isCompleted = item.questionType ? !!getApprovedText(item.questionType) : false;
                  const isSummary = item.step === "visie_samenvatting";

                  return (
                    <button
                      key={item.step}
                      onClick={() => !isCurrent && onNavigateToStep(item.step)}
                      disabled={isCurrent}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        isCurrent
                          ? "bg-cito-blue text-white cursor-default"
                          : isCompleted
                          ? "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"
                          : isSummary
                          ? "bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      {isCompleted && !isCurrent && (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase indicator */}
          <div className="mt-4 flex items-center gap-2">
            {["overview", "themes", "theme_voting", "voting", "approved"].map((p, index) => (
              <div key={p} className="flex items-center">
                {index > 0 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    phase === p
                      ? "bg-cito-blue text-white"
                      : ["overview", "themes", "theme_voting", "voting", "approved"].indexOf(phase) >
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

        {/* Phase content with transition animation */}
        <div key={phase} className="animate-fade-in">
        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            {lastFailedAction && (
              <button
                onClick={() => { setError(null); lastFailedAction(); }}
                className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 flex items-center gap-1.5 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Opnieuw proberen
              </button>
            )}
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

        {/* Phase: Analyzing - Step-by-step indicator */}
        {phase === "analyzing" && (
          <AnalyzingIndicator
            title={proposals.length === 0
              ? "AI analyseert de antwoorden..."
              : "AI genereert formuleringen..."}
            steps={proposals.length === 0
              ? [
                  { label: "Documenten inlezen..." },
                  { label: "Overeenkomsten identificeren..." },
                  { label: "Thema's clusteren..." },
                  { label: "Resultaten voorbereiden..." }
                ]
              : [
                  { label: "Thema's verwerken..." },
                  { label: "Formulering opstellen..." },
                  { label: "Tekst verfijnen..." }
                ]}
          />
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
                onAddTheme={handleAddTheme}
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
                onClick={() => setPhase("theme_voting")}
                disabled={themes.length === 0}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Punten geven aan thema's
              </button>
            </div>
          </div>
        )}


        {/* Phase: Theme Voting */}
        {phase === "theme_voting" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Geef punten aan thema's
              </h2>
              <p className="text-gray-600 mb-4">
                Verdeel 3 punten over de thema's die jij het belangrijkst vindt.
                Op basis van deze ranking wordt de formulering gegenereerd.
              </p>

              <ThemeVoting
                themes={themes}
                maxVotesPerPerson={3}
                onVotesComplete={(voted) => {
                  setVotedThemes(voted);
                  // Show voting results phase
                  setPhase("voting_results");
                }}
              />
            </div>

            <div className="flex justify-start">
              <button
                onClick={() => setPhase("themes")}
                className="btn btn-secondary"
              >
                Terug naar thema's
              </button>
            </div>
          </div>
        )}

        {/* Phase: Voting Results */}
        {phase === "voting_results" && votedThemes.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Results header */}
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-green-800">Stemresultaten</h2>
                  <p className="text-green-700">Hieronder zie je de ranking op basis van de gegeven punten</p>
                </div>
              </div>
            </div>

            {/* Results list */}
            <div className="space-y-3">
              {votedThemes.map((theme, index) => {
                const maxVotes = Math.max(...votedThemes.map(t => t.votes), 1);
                const percentage = (theme.votes / maxVotes) * 100;

                return (
                  <div
                    key={theme.id}
                    className={`card animate-slide-in-up stagger-${Math.min(index + 1, 5)} ${
                      index === 0 ? "border-2 border-cito-blue bg-cito-light-blue" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0
                          ? "bg-yellow-500 text-white"
                          : index === 1
                          ? "bg-gray-400 text-white"
                          : index === 2
                          ? "bg-orange-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                        <p className="text-sm text-gray-600">{theme.description}</p>
                        {theme.votedBy.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Gestemd door: {theme.votedBy.join(", ")}
                          </p>
                        )}
                      </div>

                      {/* Vote bar */}
                      <div className="w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cito-blue rounded-full vote-bar"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-cito-blue w-8 text-right">
                            {theme.votes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Themes with votes summary - Editable */}
            <div className="card bg-cito-light-blue">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-cito-blue">
                  Geselecteerde thema's voor formulering
                </h3>
                <span className="text-xs text-gray-500">
                  Klik op X om te verwijderen, of voeg een thema toe
                </span>
              </div>
              <p className="text-gray-700 mb-4">
                De AI zal een formulering genereren gebaseerd op onderstaande thema's. Je kunt nog aanpassen:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {votedThemes.filter(t => t.votes > 0).map((theme) => (
                  <span
                    key={theme.id}
                    className="px-3 py-1 bg-white rounded-full text-sm font-medium text-cito-blue shadow-sm flex items-center gap-2 group"
                  >
                    {theme.name} ({theme.votes} pt)
                    <button
                      onClick={() => {
                        setVotedThemes(prev => prev.map(t =>
                          t.id === theme.id ? { ...t, votes: 0 } : t
                        ));
                      }}
                      className="w-4 h-4 rounded-full bg-gray-200 hover:bg-red-500 hover:text-white text-gray-500 flex items-center justify-center text-xs transition-colors"
                      title="Verwijderen uit selectie"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add theme from non-selected */}
              {votedThemes.filter(t => t.votes === 0).length > 0 && (
                <div className="border-t border-cito-blue/20 pt-4">
                  <p className="text-sm text-gray-600 mb-2">Thema toevoegen aan selectie:</p>
                  <div className="flex flex-wrap gap-2">
                    {votedThemes.filter(t => t.votes === 0).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setVotedThemes(prev => prev.map(t =>
                            t.id === theme.id ? { ...t, votes: 1 } : t
                          ));
                        }}
                        className="px-3 py-1 bg-white/50 border border-dashed border-cito-blue/50 rounded-full text-sm text-gray-600 hover:bg-white hover:border-solid hover:text-cito-blue transition-all flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual add */}
              <div className="border-t border-cito-blue/20 pt-4 mt-4">
                <AddManualThemeInline
                  onAdd={(name) => {
                    const newTheme: ThemeWithVotes = {
                      id: `manual-${Date.now()}`,
                      name,
                      description: name,
                      questionType: config.questionType,
                      relatedResponses: [],
                      mentionedBy: ["Handmatig"],
                      consensusLevel: "medium",
                      aiConfidence: 1.0,
                      exampleQuotes: [],
                      votes: 1,
                      votedBy: ["Handmatig"],
                      voteDetails: {}
                    };
                    setVotedThemes(prev => [...prev, newTheme]);
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => setPhase("theme_voting")}
                className="btn btn-secondary"
              >
                Opnieuw stemmen
              </button>
              <button
                onClick={() => {
                  // Use only themes with votes for proposal generation
                  const rankedThemes = votedThemes.filter(t => t.votes > 0);
                  if (rankedThemes.length > 0) {
                    setThemes(rankedThemes);
                    // Pass themes directly to avoid race condition with setState
                    handleGenerateProposals(rankedThemes);
                  } else {
                    handleGenerateProposals();
                  }
                }}
                className="btn btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Genereer formuleringen met AI
              </button>
            </div>
          </div>
        )}

        {/* Phase: Voting - Single formulation */}
        {phase === "voting" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Formulering
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Pas de tekst aan indien nodig, of verfijn met AI.
              </p>

              {proposals.length > 0 && (
                <div className="p-4 border-2 border-cito-blue rounded-lg bg-cito-light-blue">
                  <textarea
                    value={proposals[0].text}
                    onChange={(e) => handleEditProposal(proposals[0].id, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue resize-none text-gray-800 leading-relaxed"
                  />
                  {proposals[0].includesThemes && proposals[0].includesThemes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500 mr-1">Verwerkte thema&apos;s:</span>
                      {proposals[0].includesThemes.map((theme, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-white text-cito-blue text-xs rounded border border-cito-blue/30"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <RefineWithAI
                      currentText={proposals[0].text}
                      context={`Formulering voor "${config.title}" in het programma Klant in Beeld`}
                      onRefined={(newText) => handleEditProposal(proposals[0].id, newText)}
                      label="Verfijn formulering"
                    />
                    <button
                      onClick={() => {
                        handleGenerateProposals(themes.length > 0 ? themes : undefined);
                      }}
                      className="text-sm text-gray-600 hover:text-cito-blue flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Opnieuw genereren
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => guardNavigation(() => { setPhase("themes"); setIsDirty(false); })}
                className="btn btn-secondary"
              >
                Terug naar thema&apos;s
              </button>
              <button
                onClick={() => {
                  if (proposals.length > 0) {
                    const variant = proposals[0];
                    saveApprovedText(config.questionType, variant.text, "proposal-1", variant.id);
                    const visieSubStepMap: Record<string, "huidige" | "gewenste" | "beweging" | "stakeholders"> = {
                      visie_huidige: "huidige",
                      visie_gewenste: "gewenste",
                      visie_beweging: "beweging",
                      visie_stakeholders: "stakeholders"
                    };
                    const visieKey = visieSubStepMap[subStep];
                    if (visieKey) {
                      updateFlowState({
                        visie: {
                          ...flowState.visie,
                          [visieKey]: { ...flowState.visie[visieKey], status: "approved" }
                        }
                      });
                    }
                    setPhase("approved");
                    setIsDirty(false);
                    showToast(`${config.title} succesvol vastgesteld!`, "success");
                    onComplete();
                  }
                }}
                disabled={proposals.length === 0}
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

            <div className="flex justify-between">
              <button
                onClick={() => {
                  removeApprovedText(config.questionType);
                  setPhase("voting");
                  showToast("Tekst vrijgegeven voor bewerking", "info");
                }}
                className="btn btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Bewerken
              </button>
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
        <ConfirmDialog
          isOpen={showDirtyWarning}
          title="Onopgeslagen wijzigingen"
          message="Je hebt de formulering aangepast maar nog niet goedgekeurd. Wil je doorgaan zonder op te slaan?"
          confirmLabel="Doorgaan"
          variant="warning"
          onConfirm={() => {
            setShowDirtyWarning(false);
            setIsDirty(false);
            if (pendingNavigation) pendingNavigation();
            setPendingNavigation(null);
          }}
          onCancel={() => {
            setShowDirtyWarning(false);
            setPendingNavigation(null);
          }}
        />
      </div>
    </div>
  );
}
