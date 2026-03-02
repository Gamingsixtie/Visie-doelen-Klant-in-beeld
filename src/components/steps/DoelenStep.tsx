"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui";
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
import { MT_MEMBERS } from "@/lib/types";

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
  const { documents, getApprovedText, saveApprovedText, updateFlowState, flowState } = useSession();
  const { showToast } = useToast();
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
  const [currentVoter, setCurrentVoter] = useState("");
  const [useShortlistVoting, setUseShortlistVoting] = useState<boolean | null>(null);

  // Check if already approved
  useEffect(() => {
    const approved1 = getApprovedText("goal_1");
    const approved2 = getApprovedText("goal_2");
    const approved3 = getApprovedText("goal_3");
    if (approved1 && approved2 && approved3) {
      setPhase("approved");
    }
  }, [getApprovedText]);

  // Set initial voter to first MT member
  useEffect(() => {
    if (MT_MEMBERS.length > 0 && !currentVoter) {
      setCurrentVoter(MT_MEMBERS[0]);
    }
  }, [currentVoter]);

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

      // Convert themes to goal clusters with better goal matching
      const goalClusters: GoalClusterType[] = (result.themes || []).map(
        (theme: ThemeCluster & { averagePriority?: number; priorityBreakdown?: { prio1: number; prio2: number; prio3: number } }, index: number) => {
          // Find all goals that match this theme based on relatedResponses or exampleQuotes
          const matchedGoals: Goal[] = [];
          const relatedRespondents = theme.relatedResponses || theme.mentionedBy || [];

          // Match goals by respondent and by checking if the quote appears in the goal text
          relatedRespondents.forEach((respId: string) => {
            // Find ALL goals from this respondent that might match
            const respondentGoals = allGoals.filter((g) =>
              g.respondentId === respId ||
              g.respondentName.toLowerCase().includes(respId.toLowerCase()) ||
              respId.toLowerCase().includes(g.respondentName.toLowerCase())
            );

            // Check which goals match the theme (by checking if theme keywords appear)
            const themeKeywords = theme.name.toLowerCase().split(/\s+/);
            respondentGoals.forEach((goal) => {
              const goalLower = goal.text.toLowerCase();
              const hasMatch = themeKeywords.some(kw => kw.length > 3 && goalLower.includes(kw)) ||
                (theme.exampleQuotes || []).some((q: string) =>
                  goalLower.includes(q.toLowerCase().slice(0, 20)) ||
                  q.toLowerCase().includes(goalLower.slice(0, 20))
                );

              if (hasMatch && !matchedGoals.find(mg => mg.id === goal.id)) {
                matchedGoals.push({
                  id: goal.id,
                  respondentId: goal.respondentId,
                  respondentName: goal.respondentName,
                  text: goal.text,
                  rank: goal.rank
                });
              }
            });

            // If no keyword match, add the first goal from this respondent
            if (matchedGoals.filter(g => g.respondentId === respId || g.respondentName.toLowerCase().includes(respId.toLowerCase())).length === 0) {
              const firstGoal = respondentGoals[0];
              if (firstGoal && !matchedGoals.find(mg => mg.id === firstGoal.id)) {
                matchedGoals.push({
                  id: firstGoal.id,
                  respondentId: firstGoal.respondentId,
                  respondentName: firstGoal.respondentName,
                  text: firstGoal.text,
                  rank: firstGoal.rank
                });
              }
            }
          });

          return {
            id: theme.id || `cluster-${index}`,
            name: theme.name,
            description: theme.description,
            goals: matchedGoals,
            votes: 0,
            // Use AI-provided averagePriority if available
            aiAveragePriority: theme.averagePriority,
            priorityBreakdown: theme.priorityBreakdown
          };
        }
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

    // Sort by votes (highest first)
    updatedClusters.sort((a, b) => b.votes - a.votes);
    setClusters(updatedClusters);

    // Pre-select top 5 based on votes (or all if less than 5)
    const maxToSelect = Math.min(updatedClusters.length, 5);
    const topIds = updatedClusters.slice(0, maxToSelect).map((c) => c.id);
    setRanking(topIds);

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
    // Save all ranked goals (up to 5)
    ranking.forEach((clusterId, index) => {
      const goalNumber = index + 1;
      // Support goal_1 through goal_5
      if (goalNumber <= 5) {
        const questionType = `goal_${goalNumber}` as "goal_1" | "goal_2" | "goal_3" | "goal_4" | "goal_5";
        const text = formulations[clusterId] || "";
        saveApprovedText(questionType, text, "cluster", clusterId);
      }
    });

    // Update flow state to mark doelen as approved
    updateFlowState({
      doelen: { ...flowState.doelen, status: "approved" }
    });

    setPhase("approved");
    showToast(`${ranking.length} doelen succesvol vastgesteld!`, "success");
    onComplete();
  };

  const approved1 = getApprovedText("goal_1");
  const approved2 = getApprovedText("goal_2");
  const approved3 = getApprovedText("goal_3");
  const approved4 = getApprovedText("goal_4");
  const approved5 = getApprovedText("goal_5");

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

            {/* Keuze: Direct gebruiken of shortlist stemronde */}
            {useShortlistVoting === null && (
              <div className="card bg-cito-light-blue border-cito-blue">
                <h3 className="font-semibold text-gray-900 mb-3">Hoe wilt u verder?</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Er zijn <strong>{clusters.length} doelclusters</strong> geïdentificeerd.
                </p>
                <div className="p-3 bg-white/50 rounded-lg mb-4 text-sm">
                  <p className="font-medium text-gray-700 mb-1">📚 Methodiek advies:</p>
                  <p className="text-gray-600">
                    Volgens programmamanagement best practices is <strong>3-5 doelen</strong> optimaal:
                    genoeg om richting te geven, maar niet zoveel dat focus verloren gaat.
                    Bij meer dan 5 doelen is een stemronde aanbevolen om te prioriteren.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setUseShortlistVoting(false);
                      // Neem ALLE clusters over, ga direct naar formulering
                      setSelectedClusterIds(clusters.map(c => c.id));
                      // Alle clusters meenemen naar ranking
                      setRanking(clusters.slice(0, Math.min(clusters.length, 5)).map(c => c.id));
                      setPhase("ranking");
                    }}
                    className={`p-4 bg-white rounded-lg border-2 transition-colors text-left ${
                      clusters.length <= 5
                        ? "border-green-300 hover:border-green-500"
                        : "border-gray-200 hover:border-cito-blue"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        clusters.length <= 5 ? "bg-green-500" : "bg-gray-400"
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-900">Alle doelen overnemen</span>
                      {clusters.length <= 5 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aanbevolen</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Neem alle {clusters.length} doelclusters over en ga direct naar de formulering.
                      {clusters.length > 5 && (
                        <span className="text-orange-600 block mt-1">
                          ⚠️ Meer dan 5 doelen - overweeg te prioriteren
                        </span>
                      )}
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setUseShortlistVoting(true);
                      // Pre-select all clusters for voting
                      setSelectedClusterIds(clusters.map(c => c.id));
                    }}
                    className={`p-4 bg-white rounded-lg border-2 transition-colors text-left ${
                      clusters.length > 5
                        ? "border-green-300 hover:border-green-500"
                        : "border-gray-200 hover:border-cito-blue"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        clusters.length > 5 ? "bg-green-500" : "bg-cito-blue"
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-900">MT Stemronde</span>
                      {clusters.length > 5 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aanbevolen</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Elk MT-lid stemt welke doelen het belangrijkst zijn.
                      Op basis van de stemmen wordt een shortlist van 3-5 doelen bepaald.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {useShortlistVoting === true && (
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
                  Door naar stemronde
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
            )}
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

              {/* Voter selector - uses MT member names */}
              <div className="mb-6 p-4 bg-cito-light-blue rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-medium text-cito-blue">
                      Stemmen per MT-lid
                    </label>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Elk MT-lid verdeelt 5 punten over de belangrijkste doelen
                    </p>
                  </div>
                  <div className="text-center bg-white rounded-lg px-4 py-2 shadow-sm">
                    <div className="text-lg font-bold text-cito-blue">
                      {Object.keys(allVotes).length}/{MT_MEMBERS.length}
                    </div>
                    <div className="text-xs text-gray-600">gestemd</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MT_MEMBERS.map((member) => {
                    const hasVoted = !!allVotes[member];
                    const isActive = currentVoter === member;
                    const memberVoteCount = Object.values(allVotes[member] || {}).reduce((s, v) => s + v, 0);
                    const maxDots = 5;

                    return (
                      <button
                        key={member}
                        onClick={() => {
                          setCurrentVoter(member);
                          setVotes(allVotes[member] || {});
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          isActive
                            ? "bg-cito-blue text-white shadow-md"
                            : hasVoted
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-white text-gray-700 border border-gray-300 hover:border-cito-blue"
                        }`}
                      >
                        {member}
                        {hasVoted && !isActive && (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="sr-only">(heeft gestemd)</span>
                          </>
                        )}
                        {!hasVoted && memberVoteCount > 0 && (
                          <span className="bg-cito-blue/20 px-1.5 py-0.5 rounded text-xs">
                            {memberVoteCount}/{maxDots}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <DotVoting
                clusters={clusters}
                totalDots={5}
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
            {/* Vote results summary - only show if voting was used */}
            {useShortlistVoting && Object.keys(allVotes).length > 0 && (
              <div className="card bg-cito-light-blue border-cito-blue">
                <h3 className="font-semibold text-cito-blue mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Stemresultaten
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Op basis van de stemmen van {Object.keys(allVotes).length} MT-leden zijn de doelen gerangschikt.
                  De top {Math.min(clusters.length, 5)} doelen zijn automatisch geselecteerd.
                </p>
                <div className="space-y-2">
                  {clusters.map((cluster, index) => {
                    const maxVotes = clusters[0]?.votes || 1;
                    const percentage = maxVotes > 0 ? (cluster.votes / maxVotes) * 100 : 0;
                    const isSelected = ranking.includes(cluster.id);

                    return (
                      <div
                        key={cluster.id}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "bg-white border-cito-blue"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? "bg-yellow-500 text-white" :
                              index === 1 ? "bg-gray-400 text-white" :
                              index === 2 ? "bg-orange-600 text-white" :
                              isSelected ? "bg-cito-blue text-white" :
                              "bg-gray-300 text-gray-600"
                            }`}>
                              {index + 1}
                            </span>
                            <span className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-500"}`}>
                              {cluster.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${
                              cluster.votes > 0 ? "text-cito-blue" : "text-gray-400"
                            }`}>
                              {cluster.votes} {cluster.votes === 1 ? "punt" : "punten"}
                            </span>
                            {isSelected && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                Geselecteerd
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isSelected ? "bg-cito-blue" : "bg-gray-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {useShortlistVoting === false
                  ? `Rangschik de ${clusters.length} doelen`
                  : "Bevestig of pas de ranking aan"}
              </h2>
              <p className="text-gray-600 mb-4">
                {useShortlistVoting === false
                  ? "Alle doelen worden overgenomen. Bepaal de volgorde van belangrijkheid."
                  : "De volgorde is gebaseerd op de stemresultaten. Je kunt de volgorde nog aanpassen indien gewenst."}
              </p>

              {/* Info over aantal */}
              <div className="p-3 bg-gray-50 rounded-lg mb-4 text-sm">
                <p className="text-gray-600">
                  <strong>Tip:</strong> Focus op 3-5 hoofddoelen. Meer doelen kunnen later als subdoelen worden opgepakt.
                  {ranking.length > 5 && (
                    <span className="text-orange-600 block mt-1">
                      ⚠️ Je hebt {ranking.length} doelen geselecteerd. Overweeg om te focussen op de top 5.
                    </span>
                  )}
                </p>
              </div>

              <GoalRanking
                clusters={clusters}
                initialRanking={ranking}
                onRankingChange={handleRankingChange}
                maxRanks={useShortlistVoting === false ? clusters.length : 5}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => useShortlistVoting ? setPhase("voting") : setPhase("clusters")}
                className="btn btn-secondary"
              >
                {useShortlistVoting ? "Terug naar stemmen" : "Terug naar clusters"}
              </button>
              <button
                onClick={handleProceedToFormulation}
                disabled={ranking.length < 1}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Door naar formulering ({ranking.length} doelen)
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
                Formuleer de {rankedClusters.length} doelen
              </h2>
              <p className="text-gray-600 mb-6">
                Pas de formulering van elk doel aan indien nodig.
              </p>

              <div className="space-y-6">
                {rankedClusters.map((cluster, index) => {
                  // Colors for different rank positions
                  const rankColors = [
                    "bg-yellow-500", // 1st - gold
                    "bg-gray-400",   // 2nd - silver
                    "bg-orange-600", // 3rd - bronze
                    "bg-blue-500",   // 4th
                    "bg-purple-500", // 5th
                    "bg-teal-500",   // 6th
                    "bg-pink-500",   // 7th+
                  ];
                  const bgColor = rankColors[Math.min(index, rankColors.length - 1)];

                  return (
                    <div
                      key={cluster.id}
                      className="p-4 border-2 border-cito-blue rounded-lg bg-cito-light-blue"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${bgColor}`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <label
                            htmlFor={`formulation-${cluster.id}`}
                            className="block font-semibold text-gray-900 mb-2"
                          >
                            {cluster.name}
                          </label>
                          <textarea
                            id={`formulation-${cluster.id}`}
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
                  );
                })}
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
                  aria-hidden="true"
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
                    {approved4 && (
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          4
                        </span>
                        <p className="text-gray-800 text-lg">{approved4.text}</p>
                      </div>
                    )}
                    {approved5 && (
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          5
                        </span>
                        <p className="text-gray-800 text-lg">{approved5.text}</p>
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
