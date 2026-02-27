"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { ResponseMatrix } from "@/components/consolidation";
import {
  GoalClusterList,
  DotVoting,
  DotVotingResults,
  GoalRanking,
  RankingSummary
} from "@/components/doelen";
import type { GoalClusterType, Goal } from "@/components/doelen";
import type { ThemeCluster } from "@/lib/types";

interface DoelenStepProps {
  onComplete: () => void;
}

type StepPhase =
  | "overview"
  | "analyzing"
  | "clusters"
  | "voting"
  | "ranking"
  | "formulation"
  | "approved";

export function DoelenStep({ onComplete }: DoelenStepProps) {
  const { documents, getApprovedText, saveApprovedText } = useSession();
  const [phase, setPhase] = useState<StepPhase>("overview");
  const [clusters, setClusters] = useState<GoalClusterType[]>([]);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [allVotes, setAllVotes] = useState<Record<string, Record<string, number>>>({});
  const [ranking, setRanking] = useState<string[]>([]);
  const [formulations, setFormulations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [currentVoter, setCurrentVoter] = useState("Facilitator");

  // Check if already approved
  useEffect(() => {
    const approved1 = getApprovedText("goal_1");
    const approved2 = getApprovedText("goal_2");
    const approved3 = getApprovedText("goal_3");
    if (approved1 && approved2 && approved3) {
      setPhase("approved");
    }
  }, [getApprovedText]);

  // Collect all goals from documents
  const allGoals = documents.flatMap((doc) => {
    const goals: Array<{
      id: string;
      respondentId: string;
      respondentName: string;
      text: string;
      rank: number;
    }> = [];
    if (doc.parsedResponses.goal_1) {
      goals.push({
        id: `${doc.id}-goal-1`,
        respondentId: doc.respondentId,
        respondentName: doc.filename.replace(".docx", ""),
        text: doc.parsedResponses.goal_1,
        rank: 1
      });
    }
    if (doc.parsedResponses.goal_2) {
      goals.push({
        id: `${doc.id}-goal-2`,
        respondentId: doc.respondentId,
        respondentName: doc.filename.replace(".docx", ""),
        text: doc.parsedResponses.goal_2,
        rank: 2
      });
    }
    if (doc.parsedResponses.goal_3) {
      goals.push({
        id: `${doc.id}-goal-3`,
        respondentId: doc.respondentId,
        respondentName: doc.filename.replace(".docx", ""),
        text: doc.parsedResponses.goal_3,
        rank: 3
      });
    }
    return goals;
  });

  const handleStartAnalysis = async () => {
    setPhase("analyzing");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionType: "goals",
          responses: allGoals.map((g) => ({
            respondentId: g.respondentId,
            answer: `[Prioriteit ${g.rank}] ${g.text}`
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Analyse mislukt");
      }

      const result = await response.json();

      // Convert themes to goal clusters
      const goalClusters: GoalClusterType[] = (result.themes || []).map(
        (theme: ThemeCluster, index: number) => ({
          id: theme.id || `cluster-${index}`,
          name: theme.name,
          description: theme.description,
          goals: (theme.relatedResponses || [])
            .map((respId) => {
              const goal = allGoals.find((g) => g.respondentId === respId);
              if (!goal) return null;
              return {
                id: goal.id,
                respondentId: goal.respondentId,
                respondentName: goal.respondentName,
                text: goal.text,
                rank: goal.rank
              } as Goal;
            })
            .filter(Boolean) as Goal[],
          votes: 0
        })
      );

      setClusters(goalClusters);
      setPhase("clusters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setPhase("overview");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (clusterId: string) => {
    if (selectedClusterIds.includes(clusterId)) {
      setSelectedClusterIds(selectedClusterIds.filter((id) => id !== clusterId));
    } else if (selectedClusterIds.length < 5) {
      setSelectedClusterIds([...selectedClusterIds, clusterId]);
    }
  };

  const handleEditClusterName = (clusterId: string, newName: string) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === clusterId ? { ...c, name: newName } : c))
    );
  };

  const handleVotesChange = (newVotes: Record<string, number>) => {
    setVotes(newVotes);
    setAllVotes((prev) => ({
      ...prev,
      [currentVoter]: newVotes
    }));
  };

  const handleProceedToVoting = () => {
    // Use selected clusters or all if none selected
    const clustersToVote =
      selectedClusterIds.length > 0
        ? clusters.filter((c) => selectedClusterIds.includes(c.id))
        : clusters;

    setClusters(clustersToVote);
    setPhase("voting");
  };

  const handleProceedToRanking = () => {
    // Calculate total votes and sort clusters
    const totals: Record<string, number> = {};
    clusters.forEach((c) => {
      totals[c.id] = 0;
    });

    Object.values(allVotes).forEach((voterVotes) => {
      Object.entries(voterVotes).forEach(([clusterId, count]) => {
        totals[clusterId] = (totals[clusterId] || 0) + count;
      });
    });

    // Update clusters with vote counts
    const updatedClusters = clusters.map((c) => ({
      ...c,
      votes: totals[c.id] || 0
    }));

    // Sort by votes
    updatedClusters.sort((a, b) => b.votes - a.votes);
    setClusters(updatedClusters);

    // Pre-select top 3 based on votes
    const top3Ids = updatedClusters.slice(0, 3).map((c) => c.id);
    setRanking(top3Ids);

    setPhase("ranking");
  };

  const handleRankingChange = (newRanking: string[]) => {
    setRanking(newRanking);
  };

  const handleProceedToFormulation = () => {
    // Initialize formulations with cluster descriptions
    const initialFormulations: Record<string, string> = {};
    ranking.forEach((clusterId) => {
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster) {
        initialFormulations[clusterId] = `${cluster.name}: ${cluster.description}`;
      }
    });
    setFormulations(initialFormulations);
    setPhase("formulation");
  };

  const handleFormulationChange = (clusterId: string, text: string) => {
    setFormulations((prev) => ({
      ...prev,
      [clusterId]: text
    }));
  };

  const handleApprove = () => {
    ranking.forEach((clusterId, index) => {
      const questionType = `goal_${index + 1}` as "goal_1" | "goal_2" | "goal_3";
      const text = formulations[clusterId] || "";
      saveApprovedText(questionType, text, "cluster", clusterId);
    });

    setPhase("approved");
    onComplete();
  };

  const approved1 = getApprovedText("goal_1");
  const approved2 = getApprovedText("goal_2");
  const approved3 = getApprovedText("goal_3");

  // Get clusters for ranking display
  const rankedClusters = ranking
    .map((id) => clusters.find((c) => c.id === id))
    .filter(Boolean) as GoalClusterType[];

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Doelen bepalen
          </h1>
          <p className="text-gray-600">
            Analyseer alle doelen en bepaal gezamenlijk de top 3.
          </p>

          {/* Phase indicator */}
          <div className="mt-4 flex items-center gap-2">
            {["overview", "clusters", "voting", "ranking", "approved"].map(
              (p, index) => (
                <div key={p} className="flex items-center">
                  {index > 0 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      phase === p || (phase === "analyzing" && p === "overview")
                        ? "bg-cito-blue text-white"
                        : phase === "formulation" && p === "ranking"
                        ? "bg-cito-blue text-white"
                        : [
                            "overview",
                            "clusters",
                            "voting",
                            "ranking",
                            "approved"
                          ].indexOf(
                            phase === "analyzing"
                              ? "overview"
                              : phase === "formulation"
                              ? "ranking"
                              : phase
                          ) > index
                        ? "bg-cito-green text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>
              )
            )}
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
                  Alle doelen vergelijken
                </h2>
                <ResponseMatrix
                  documents={documents}
                  questionTypes={["goal_1", "goal_2", "goal_3"]}
                  highlightConsensus
                />
              </div>
            ) : (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Alle doelen ({allGoals.length})
                </h2>

                {allGoals.length === 0 ? (
                  <p className="text-gray-500">Geen doelen gevonden.</p>
                ) : (
                  <div className="grid gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-cito-blue mb-3">
                          {doc.filename.replace(".docx", "")}
                        </p>
                        <div className="space-y-2">
                          {doc.parsedResponses.goal_1 && (
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                1
                              </span>
                              <p className="text-gray-800">
                                {doc.parsedResponses.goal_1}
                              </p>
                            </div>
                          )}
                          {doc.parsedResponses.goal_2 && (
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                2
                              </span>
                              <p className="text-gray-800">
                                {doc.parsedResponses.goal_2}
                              </p>
                            </div>
                          )}
                          {doc.parsedResponses.goal_3 && (
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                3
                              </span>
                              <p className="text-gray-800">
                                {doc.parsedResponses.goal_3}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {allGoals.length > 0 && (
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
                  AI Clustering starten
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
              AI analyseert en clustert de doelen...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Groepeert vergelijkbare doelen en identificeert patronen
            </p>
          </div>
        )}

        {/* Phase: Clusters */}
        {phase === "clusters" && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Geclustered doelen ({clusters.length})
                </h2>
                <span className="text-sm text-gray-500">
                  Selecteer de doelen voor de stemronde (max 5)
                </span>
              </div>

              <GoalClusterList
                clusters={clusters}
                selectedIds={selectedClusterIds}
                maxSelections={5}
                onToggleSelect={handleToggleSelect}
                onEditClusterName={handleEditClusterName}
                editable
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
                onClick={handleProceedToVoting}
                className="btn btn-primary flex items-center gap-2"
              >
                Door naar stemmen
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

        {/* Phase: Voting */}
        {phase === "voting" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Dot Voting
              </h2>
              <p className="text-gray-600 mb-6">
                Verdeel je punten over de doelen die jij het belangrijkst vindt.
              </p>

              {/* Voter selector */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stemmer:
                </label>
                <select
                  value={currentVoter}
                  onChange={(e) => {
                    setCurrentVoter(e.target.value);
                    setVotes(allVotes[e.target.value] || {});
                  }}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue"
                >
                  <option value="Facilitator">Facilitator</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.filename.replace(".docx", "")}>
                      {doc.filename.replace(".docx", "")}
                    </option>
                  ))}
                </select>
              </div>

              <DotVoting
                clusters={clusters}
                totalDots={3}
                currentVotes={votes}
                onVotesChange={handleVotesChange}
                voterName={currentVoter}
              />
            </div>

            {/* Results preview */}
            {Object.keys(allVotes).length > 0 && (
              <div className="card">
                <DotVotingResults clusters={clusters} allVotes={allVotes} />
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("clusters")}
                className="btn btn-secondary"
              >
                Terug naar clusters
              </button>
              <button
                onClick={handleProceedToRanking}
                disabled={Object.keys(allVotes).length === 0}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Door naar ranking
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

        {/* Phase: Ranking */}
        {phase === "ranking" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Bepaal de top 3
              </h2>
              <p className="text-gray-600 mb-6">
                Sleep de doelen in de juiste volgorde of klik om toe te voegen.
              </p>

              <GoalRanking
                clusters={clusters}
                initialRanking={ranking}
                onRankingChange={handleRankingChange}
                maxRanks={3}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("voting")}
                className="btn btn-secondary"
              >
                Terug naar stemmen
              </button>
              <button
                onClick={handleProceedToFormulation}
                disabled={ranking.length < 1}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Door naar formulering
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

        {/* Phase: Formulation */}
        {phase === "formulation" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Formuleer de doelen
              </h2>
              <p className="text-gray-600 mb-6">
                Pas de formulering van elk doel aan indien nodig.
              </p>

              <div className="space-y-6">
                {rankedClusters.map((cluster, index) => (
                  <div
                    key={cluster.id}
                    className="p-4 border-2 border-cito-blue rounded-lg bg-cito-light-blue"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : "bg-orange-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {cluster.name}
                        </h3>
                        <textarea
                          value={formulations[cluster.id] || ""}
                          onChange={(e) =>
                            handleFormulationChange(cluster.id, e.target.value)
                          }
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue resize-none"
                          placeholder="Beschrijf het doel..."
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Gebaseerd op input van{" "}
                          {cluster.goals.length} respondent
                          {cluster.goals.length > 1 ? "en" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setPhase("ranking")}
                className="btn btn-secondary"
              >
                Terug naar ranking
              </button>
              <button
                onClick={handleApprove}
                disabled={ranking.length < 1}
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
        {phase === "approved" && (
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
                    Doelen vastgesteld
                  </h2>
                  <div className="space-y-4">
                    {approved1 && (
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          1
                        </span>
                        <p className="text-gray-800 text-lg">{approved1.text}</p>
                      </div>
                    )}
                    {approved2 && (
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          2
                        </span>
                        <p className="text-gray-800 text-lg">{approved2.text}</p>
                      </div>
                    )}
                    {approved3 && (
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          3
                        </span>
                        <p className="text-gray-800 text-lg">{approved3.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onComplete}
                className="btn btn-primary flex items-center gap-2"
              >
                Volgende stap
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
