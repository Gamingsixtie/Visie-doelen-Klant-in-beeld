"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { ResponseMatrix } from "@/components/consolidation";
import {
  ScopeAnalyzer,
  ScopeSummary,
  ScopeQuickAdd
} from "@/components/scope";
import type { ScopeItem } from "@/components/scope";

interface ScopeStepProps {
  onComplete: () => void;
}

type StepPhase = "overview" | "analyzing" | "categorizing" | "review" | "approved";

export function ScopeStep({ onComplete }: ScopeStepProps) {
  const { documents, getApprovedText, saveApprovedText } = useSession();
  const [phase, setPhase] = useState<StepPhase>("overview");
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);

  // Get approved goals for reference
  const approvedGoals: string[] = [];
  const goal1 = getApprovedText("goal_1");
  const goal2 = getApprovedText("goal_2");
  const goal3 = getApprovedText("goal_3");
  if (goal1) approvedGoals.push(goal1.text);
  if (goal2) approvedGoals.push(goal2.text);
  if (goal3) approvedGoals.push(goal3.text);

  // Check if already approved
  useEffect(() => {
    const approved = getApprovedText("out_of_scope");
    if (approved) {
      setPhase("approved");
    }
  }, [getApprovedText]);

  // Collect initial scope items from documents
  useEffect(() => {
    const items: ScopeItem[] = [];
    let idCounter = 0;

    documents.forEach((doc) => {
      if (doc.parsedResponses.out_of_scope) {
        // Split by common separators
        const parts = doc.parsedResponses.out_of_scope
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        parts.forEach((text) => {
          items.push({
            id: `scope-${idCounter++}`,
            text,
            category: "unclear",
            source: doc.filename.replace(".docx", "")
          });
        });
      }
    });

    // Deduplicate by text similarity
    const uniqueItems: ScopeItem[] = [];
    items.forEach((item) => {
      const exists = uniqueItems.some(
        (u) => u.text.toLowerCase() === item.text.toLowerCase()
      );
      if (!exists) {
        uniqueItems.push(item);
      }
    });

    setScopeItems(uniqueItems);
  }, [documents]);

  const handleStartAnalysis = async () => {
    setPhase("analyzing");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: "scope",
          responses: scopeItems.map((item) => ({
            respondentId: item.source,
            answer: item.text
          })),
          context: {
            approvedGoals
          }
        })
      });

      if (!response.ok) {
        throw new Error("Analyse mislukt");
      }

      const result = await response.json();

      // Update scope items with AI suggestions
      if (result.scopeAnalysis) {
        const updatedItems = scopeItems.map((item) => {
          const analysis = result.scopeAnalysis?.find(
            (a: { text: string; category: string; conflicts?: string[]; suggestion?: string }) =>
              a.text.toLowerCase() === item.text.toLowerCase()
          );
          if (analysis) {
            return {
              ...item,
              category: analysis.category || "unclear",
              conflictsWithGoals: analysis.conflicts || [],
              suggestedClarification: analysis.suggestion
            };
          }
          return item;
        });
        setScopeItems(updatedItems);
      }

      setPhase("categorizing");
    } catch (err) {
      // If AI analysis fails, just proceed to manual categorization
      console.error("AI analysis failed:", err);
      setPhase("categorizing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemsChange = (newItems: ScopeItem[]) => {
    setScopeItems(newItems);
  };

  const handleAddItem = (text: string, category: ScopeItem["category"]) => {
    const newItem: ScopeItem = {
      id: `scope-${Date.now()}`,
      text,
      category,
      source: "Handmatig toegevoegd"
    };
    setScopeItems([...scopeItems, newItem]);
  };

  const handleProceedToReview = () => {
    // Mark any remaining "unclear" items as out_of_scope by default
    const updatedItems = scopeItems.map((item) =>
      item.category === "unclear" ? { ...item, category: "out_of_scope" as const } : item
    );
    setScopeItems(updatedItems);
    setPhase("review");
  };

  const handleApprove = () => {
    const outOfScopeItems = scopeItems
      .filter((i) => i.category === "out_of_scope")
      .map((i) => i.text);

    const scopeText = outOfScopeItems.map((item) => `• ${item}`).join("\n");
    saveApprovedText("out_of_scope", scopeText, "scope", "scope-final");
    setPhase("approved");
    onComplete();
  };

  const approved = getApprovedText("out_of_scope");
  const outOfScopeItems = scopeItems
    .filter((i) => i.category === "out_of_scope")
    .map((i) => i.text);
  const inScopeItems = scopeItems
    .filter((i) => i.category === "in_scope")
    .map((i) => i.text);

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Scope afbakening
          </h1>
          <p className="text-gray-600">
            Bepaal wat binnen en buiten de scope van het programma valt.
          </p>

          {/* Phase indicator */}
          <div className="mt-4 flex items-center gap-2">
            {["overview", "categorizing", "review", "approved"].map((p, index) => (
              <div key={p} className="flex items-center">
                {index > 0 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    phase === p || (phase === "analyzing" && p === "overview")
                      ? "bg-cito-blue text-white"
                      : ["overview", "categorizing", "review", "approved"].indexOf(
                          phase === "analyzing" ? "overview" : phase
                        ) > index
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

        {/* Phase: Overview */}
        {phase === "overview" && (
          <div className="space-y-6">
            {/* Toggle view */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowMatrix(!showMatrix)}
                className="text-sm text-cito-blue hover:underline flex items-center gap-1"
              >
                {showMatrix ? (
                  <>
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
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    Lijst weergave
                  </>
                ) : (
                  <>
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
                        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                      />
                    </svg>
                    Matrix weergave
                  </>
                )}
              </button>
            </div>

            {showMatrix ? (
              <div className="card overflow-hidden">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Scope items vergelijken
                </h2>
                <ResponseMatrix
                  documents={documents}
                  questionTypes={["out_of_scope"]}
                  highlightConsensus
                />
              </div>
            ) : (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Gevonden scope-items ({scopeItems.length})
                </h2>

                {scopeItems.length === 0 ? (
                  <p className="text-gray-500">
                    Geen scope-items gevonden in de documenten.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents
                      .filter((doc) => doc.parsedResponses.out_of_scope)
                      .map((doc) => (
                        <div key={doc.id} className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-cito-blue mb-2">
                            {doc.filename.replace(".docx", "")}
                          </p>
                          <p className="text-gray-700">
                            {doc.parsedResponses.out_of_scope}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Goals reference */}
            {approvedGoals.length > 0 && (
              <div className="card bg-cito-light-blue">
                <h3 className="font-semibold text-cito-blue mb-3">
                  Goedgekeurde doelen (ter referentie)
                </h3>
                <ul className="space-y-2">
                  {approvedGoals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="w-6 h-6 bg-cito-blue text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scopeItems.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={handleStartAnalysis}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  AI Analyse starten
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
              AI analyseert scope-items...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Controleert op conflicten met doelen en groepering
            </p>
          </div>
        )}

        {/* Phase: Categorizing */}
        {phase === "categorizing" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Categoriseer scope-items
              </h2>
              <p className="text-gray-600 mb-6">
                Sleep items naar de juiste categorie of voeg nieuwe toe.
              </p>

              <ScopeAnalyzer
                items={scopeItems}
                approvedGoals={approvedGoals}
                onItemsChange={handleItemsChange}
              />
            </div>

            <ScopeQuickAdd onAdd={handleAddItem} />

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("overview")}
                className="btn btn-secondary"
              >
                Terug naar overzicht
              </button>
              <button
                onClick={handleProceedToReview}
                className="btn btn-primary flex items-center gap-2"
              >
                Door naar review
                <svg
                  className="w-5 h-5"
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
            </div>
          </div>
        )}

        {/* Phase: Review */}
        {phase === "review" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Review scope-afbakening
              </h2>

              <ScopeSummary
                outOfScopeItems={outOfScopeItems}
                inScopeItems={inScopeItems}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("categorizing")}
                className="btn btn-secondary"
              >
                Terug naar bewerken
              </button>
              <button
                onClick={handleApprove}
                disabled={outOfScopeItems.length === 0}
                className="btn btn-success flex items-center gap-2 disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
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
                Goedkeuren
              </button>
            </div>
          </div>
        )}

        {/* Phase: Approved */}
        {phase === "approved" && approved && (
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
                  <h2 className="text-xl font-semibold text-green-800 mb-4">
                    Scope vastgesteld
                  </h2>
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Buiten scope:</h3>
                    <div className="text-gray-800 whitespace-pre-line">
                      {approved.text}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onComplete}
                className="btn btn-primary flex items-center gap-2"
              >
                Naar export
                <svg
                  className="w-5 h-5"
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
