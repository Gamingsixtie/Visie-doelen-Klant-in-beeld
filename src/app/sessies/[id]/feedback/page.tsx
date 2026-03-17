"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { MemberSelector, ClusterFeedbackCard, FeedbackOverview, ConsolidatedChanges, FacilitatorControls } from "@/components/feedback";
import { MT_MEMBERS, FACILITATOR_NAME } from "@/lib/types";
import * as feedbackService from "@/lib/feedback-service";
import type { FeedbackRound, FeedbackSuggestion, SuggestionVote, SuggestionType, ChangeVote, ChangeVoteValue, FeedbackPhase, ConsolidatedChanges as ConsolidatedChangesType, ProposedChange, ConsolidatedChangesVersion, FeedbackStepType } from "@/lib/feedback-service";
import { supabase } from "@/lib/supabase";
import * as persistence from "@/lib/persistence";

const STEP_TYPE_LABELS: Record<string, string> = {
  doelen: "Doelen",
  scope: "Scope",
  visie_huidige: "Visie - Huidige situatie",
  visie_gewenste: "Visie - Gewenste situatie",
  visie_beweging: "Visie - Beweging",
  visie_stakeholders: "Visie - Stakeholders"
};

interface ClusterData {
  id: string;
  name: string;
  description: string;
  goals: Array<{ id: string; respondentName: string; text: string; rank: number }>;
}

export default function FeedbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const memberParam = searchParams.get("member");
  const stepParam = searchParams.get("step") as FeedbackStepType | null;

  const [currentMember, setCurrentMember] = useState<string | null>(memberParam);
  const [round, setRound] = useState<FeedbackRound | null>(null);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [suggestions, setSuggestions] = useState<FeedbackSuggestion[]>([]);
  const [votes, setVotes] = useState<SuggestionVote[]>([]);
  const [changeVotes, setChangeVotes] = useState<ChangeVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | string>("overview");
  const [sessionName, setSessionName] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [changesHistory, setChangesHistory] = useState<ConsolidatedChangesVersion[]>([]);
  const [memberReady, setMemberReady] = useState<string[]>([]);

  // Derived state
  const phase: FeedbackPhase = round?.phase || "collecting";
  const isFacilitator = currentMember === FACILITATOR_NAME;
  const isCurrentMemberReady = currentMember ? memberReady.includes(currentMember) : false;
  const consolidatedChanges = round?.consolidated_changes as ConsolidatedChangesType | null;
  const proposedChanges: ProposedChange[] = consolidatedChanges?.changes || [];
  const stepType: FeedbackStepType = (round?.step_type as FeedbackStepType) || "doelen";
  const stepLabel = STEP_TYPE_LABELS[stepType] || "Doelen";

  // Load session name
  useEffect(() => {
    if (!supabase || !sessionId) return;
    supabase
      .from("sessions")
      .select("name")
      .eq("id", sessionId)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setSessionName(data[0].name);
      });
  }, [sessionId]);

  // Load feedback round data
  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Try to find an active round for the specific step type (or any)
      let targetRound = await feedbackService.getActiveRound(sessionId, stepParam || undefined);

      // Fall back to latest open round (backward compat)
      if (!targetRound) {
        targetRound = await feedbackService.getLatestOpenRound(sessionId);
      }

      // Fall back to most recent round of any status (prefer matching step type)
      if (!targetRound) {
        const allRounds = await feedbackService.getFeedbackRounds(sessionId);
        if (allRounds.length > 0) {
          if (stepParam) {
            targetRound = allRounds.find(r => r.step_type === stepParam) || allRounds[0];
          } else {
            targetRound = allRounds[0];
          }
        }
      }

      if (!targetRound) {
        setError("Geen feedbackronde gevonden voor deze sessie. Start eerst een feedbackronde vanuit de doelen-stap.");
        return;
      }

      setRound(targetRound);
      setClusters((targetRound.source_clusters || []) as ClusterData[]);
      setChangesHistory((targetRound.consolidated_changes_history || []) as ConsolidatedChangesVersion[]);
      setMemberReady((targetRound.member_ready || []) as string[]);

      const fullData = await feedbackService.getFullRoundData(targetRound.id);
      if (fullData) {
        setSuggestions(fullData.suggestions);
        setVotes(fullData.votes);
        setChangeVotes(fullData.changeVotes);
      }
    } catch (err) {
      console.error("Error loading feedback data:", err);
      setError("Fout bij laden van feedback data");
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, [sessionId, stepParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!round) return;
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, [round, loadData]);

  // Handle member selection
  const handleSelectMember = (name: string) => {
    setCurrentMember(name);
    setActiveTab(name);
    const url = new URL(window.location.href);
    url.searchParams.set("member", name);
    window.history.replaceState({}, "", url.toString());
  };

  // Handle add suggestion
  const handleAddSuggestion = async (
    clusterId: string,
    type: SuggestionType,
    content: Record<string, unknown>
  ) => {
    if (!round || !currentMember) return;

    const suggestion = await feedbackService.addSuggestion(
      round.id,
      currentMember,
      clusterId,
      type,
      content
    );

    if (suggestion) {
      setSuggestions(prev => [...prev, suggestion]);
    }
  };

  // Handle vote on suggestion
  const handleVoteSuggestion = async (suggestionId: string, value: "accept" | "reject") => {
    if (!currentMember) return;

    const vote = await feedbackService.voteSuggestion(suggestionId, currentMember, value);
    if (vote) {
      setVotes(prev => {
        const filtered = prev.filter(
          v => !(v.suggestion_id === suggestionId && v.member_name === currentMember)
        );
        return [...filtered, vote];
      });
    }
  };

  // Handle delete suggestion
  const handleDeleteSuggestion = async (suggestionId: string) => {
    const success = await feedbackService.deleteSuggestion(suggestionId);
    if (success) {
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      setVotes(prev => prev.filter(v => v.suggestion_id !== suggestionId));
    }
  };

  // Handle AI consolidation (facilitator only)
  const handleConsolidate = async () => {
    if (!round || !isFacilitator) return;
    setIsConsolidating(true);

    try {
      // Set phase to consolidating
      await feedbackService.updateRoundPhase(round.id, "consolidating");
      setRound(prev => prev ? { ...prev, phase: "consolidating" } : null);

      // Call AI consolidation API
      const response = await fetch("/api/consolidate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusters: clusters.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            goals: c.goals
          })),
          suggestions: suggestions.map(s => ({
            id: s.id,
            member_name: s.member_name,
            cluster_id: s.cluster_id,
            suggestion_type: s.suggestion_type,
            content: s.content
          })),
          stepType
        })
      });

      const data = await response.json();

      if (!data.success || !data.consolidated) {
        throw new Error(data.error || "Consolidatie mislukt");
      }

      // Save consolidated changes with history and move to voting phase
      await feedbackService.saveConsolidatedChangesWithHistory(round.id, data.consolidated, "AI consolidatie");
      setRound(prev => prev ? {
        ...prev,
        phase: "voting",
        consolidated_changes: data.consolidated
      } : null);
    } catch (err) {
      console.error("Consolidation error:", err);
      // Revert to collecting phase on error
      await feedbackService.updateRoundPhase(round.id, "collecting");
      setRound(prev => prev ? { ...prev, phase: "collecting" } : null);
      alert("Fout bij consolidatie: " + (err instanceof Error ? err.message : "Onbekende fout"));
    } finally {
      setIsConsolidating(false);
    }
  };

  // Handle vote on proposed change
  const handleVoteChange = async (changeId: string, value: ChangeVoteValue, comment?: string) => {
    if (!round || !currentMember) return;

    const vote = await feedbackService.voteOnChange(round.id, changeId, currentMember, value, comment);
    if (vote) {
      setChangeVotes(prev => {
        const filtered = prev.filter(
          v => !(v.change_id === changeId && v.member_name === currentMember)
        );
        return [...filtered, vote];
      });
    }
  };

  // Handle apply approved changes (facilitator only) - only applies majority-approved changes
  const handleApplyChanges = async () => {
    if (!round || !isFacilitator || !consolidatedChanges) return;
    setIsApplying(true);

    try {
      // Determine which changes have majority (agree > disagree)
      const approvedChangeIds = consolidatedChanges.changes
        .filter(change => {
          const votes = changeVotes.filter(v => v.change_id === change.change_id);
          const agreeCount = votes.filter(v => v.value === "agree").length;
          const disagreeCount = votes.filter(v => v.value === "disagree").length;
          return agreeCount > disagreeCount && votes.length > 0;
        })
        .map(c => c.change_id);

      // Apply only majority-approved changes to clusters (any change_type that modifies text)
      const updatedClusters = clusters.map(cluster => {
        const change = consolidatedChanges.changes.find(
          c => c.cluster_id === cluster.id && approvedChangeIds.includes(c.change_id)
        );
        if (change && (change.proposed_name !== change.original_name || change.proposed_description !== change.original_description)) {
          return {
            ...cluster,
            name: change.proposed_name,
            description: change.proposed_description
          };
        }
        return cluster;
      });

      // Save updated clusters to Supabase session flow_state (step-type aware)
      if (supabase) {
        const { data: sessionRows } = await supabase
          .from("sessions")
          .select("flow_state")
          .eq("id", sessionId)
          .limit(1);

        const session = sessionRows?.[0];
        if (session?.flow_state) {
          const flowState = session.flow_state as Record<string, unknown>;

          if (stepType === "doelen") {
            // Clusters are stored at flow_state.goalClusters.clusters (persistence layer format)
            const goalClustersObj = (flowState.goalClusters || {}) as Record<string, unknown>;
            console.log("[Feedback] Saving to Supabase:", {
              sessionId,
              clusterCount: updatedClusters.length,
              clusterNames: updatedClusters.map(c => c.name)
            });
            const { error: updateError } = await supabase
              .from("sessions")
              .update({
                flow_state: {
                  ...flowState,
                  goalClusters: { ...goalClustersObj, clusters: updatedClusters }
                }
              })
              .eq("id", sessionId);
            console.log("[Feedback] Supabase update result:", { error: updateError?.message || "success" });
          } else if (stepType === "scope") {
            // Scope: updatedClusters have { id, name (=text), description (=source) }
            const scopeState = (flowState.scope || {}) as Record<string, unknown>;
            const scopeItems = updatedClusters.map(c => ({ id: c.id, text: c.name, source: c.description }));
            await supabase
              .from("sessions")
              .update({
                flow_state: {
                  ...flowState,
                  scope: { ...scopeState, scopeItems }
                }
              })
              .eq("id", sessionId);
          } else if (stepType.startsWith("visie_")) {
            // Visie: single cluster with description = approved text
            const visieState = (flowState.visie || {}) as Record<string, unknown>;
            const visieKey = stepType.replace("visie_", "") as string;
            const currentSubState = (visieState[visieKey] || {}) as Record<string, unknown>;
            const updatedText = updatedClusters[0]?.description || "";
            await supabase
              .from("sessions")
              .update({
                flow_state: {
                  ...flowState,
                  visie: {
                    ...visieState,
                    [visieKey]: { ...currentSubState, approvedText: updatedText }
                  }
                }
              })
              .eq("id", sessionId);
          }
        }
      }

      // Sync updated clusters to localStorage for DoelenStep persistence
      if (stepType === "doelen") {
        console.log("[Feedback] Saving to localStorage:", {
          sessionId,
          clusterCount: updatedClusters.length,
          clusters: updatedClusters.map(c => ({ id: c.id, name: c.name })),
          approvedChangeIds
        });

        const existingData = persistence.getGoalClusters(sessionId);
        persistence.saveGoalClusters(sessionId, {
          clusters: updatedClusters,
          selectedClusterIds: existingData?.selectedClusterIds || [],
          allVotes: existingData?.allVotes || {},
          ranking: existingData?.ranking || [],
          formulations: existingData?.formulations || {},
          phase: existingData?.phase || "clusters"
        });

        // Verify it was saved
        const verified = persistence.getGoalClusters(sessionId);
        console.log("[Feedback] Verified localStorage save:", {
          savedAt: verified?.savedAt,
          clusterCount: verified?.clusters.length
        });

        persistence.saveClusterVersion(
          sessionId,
          updatedClusters,
          "Feedback toegepast",
          "feedback_applied"
        );
      }

      // Mark round as approved
      await feedbackService.updateRoundPhase(round.id, "approved");
      setRound(prev => prev ? { ...prev, phase: "approved" } : null);
      setClusters(updatedClusters);
    } catch (err) {
      console.error("Apply changes error:", err);
      alert("Fout bij doorvoeren: " + (err instanceof Error ? err.message : "Onbekende fout"));
    } finally {
      setIsApplying(false);
    }
  };

  // Handle facilitator editing a proposed change
  const handleEditChange = async (changeId: string, updates: Partial<ProposedChange>) => {
    if (!round || !isFacilitator || !consolidatedChanges) return;

    // Build updated changes
    const updatedChanges: ConsolidatedChangesType = {
      ...consolidatedChanges,
      changes: consolidatedChanges.changes.map(c =>
        c.change_id === changeId ? { ...c, ...updates } : c
      )
    };

    // Save with history
    const success = await feedbackService.saveConsolidatedChangesWithHistory(
      round.id,
      updatedChanges,
      `Handmatige bewerking`
    );

    if (success) {
      // Reset votes for edited change
      await feedbackService.deleteChangeVotesForChange(round.id, changeId);
      setChangeVotes(prev => prev.filter(v => v.change_id !== changeId));

      // Update local state
      setRound(prev => prev ? { ...prev, consolidated_changes: updatedChanges } : null);
      // Reload to get updated history
      loadData();
    }
  };

  // Handle AI refinement of a proposed change
  const handleRefineChange = async (changeId: string, feedback: string) => {
    if (!round || !isFacilitator || !consolidatedChanges) return;

    const change = consolidatedChanges.changes.find(c => c.change_id === changeId);
    if (!change) return;

    const response = await fetch("/api/refine-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposedChange: change,
        feedback
      })
    });

    const data = await response.json();

    if (!data.success || !data.refined) {
      throw new Error(data.error || "Verfijning mislukt");
    }

    // Build updated changes with refined data
    const updatedChanges: ConsolidatedChangesType = {
      ...consolidatedChanges,
      changes: consolidatedChanges.changes.map(c =>
        c.change_id === changeId
          ? {
              ...c,
              proposed_name: data.refined.proposed_name,
              proposed_description: data.refined.proposed_description,
              summary: data.refined.summary
            }
          : c
      )
    };

    // Save with history
    const success = await feedbackService.saveConsolidatedChangesWithHistory(
      round.id,
      updatedChanges,
      "AI verfijning"
    );

    if (success) {
      // Reset votes for refined change
      await feedbackService.deleteChangeVotesForChange(round.id, changeId);
      setChangeVotes(prev => prev.filter(v => v.change_id !== changeId));

      // Update local state
      setRound(prev => prev ? { ...prev, consolidated_changes: updatedChanges } : null);
      // Reload to get updated history
      loadData();
    }
  };

  // Handle deleting a rejected change (facilitator only)
  const handleDeleteChange = async (changeId: string) => {
    if (!round || !isFacilitator || !consolidatedChanges) return;

    const updatedChanges: ConsolidatedChangesType = {
      ...consolidatedChanges,
      changes: consolidatedChanges.changes.filter(c => c.change_id !== changeId)
    };

    const success = await feedbackService.saveConsolidatedChangesWithHistory(
      round.id,
      updatedChanges,
      "Voorstel verwijderd"
    );

    if (success) {
      await feedbackService.deleteChangeVotesForChange(round.id, changeId);
      setChangeVotes(prev => prev.filter(v => v.change_id !== changeId));
      setRound(prev => prev ? { ...prev, consolidated_changes: updatedChanges } : null);
      loadData();
    }
  };

  // Handle resetting the feedback round (clears all feedback, keeps goals)
  const handleResetRound = async () => {
    if (!round || !isFacilitator) return;

    const success = await feedbackService.resetFeedbackRound(round.id);
    if (success) {
      setSuggestions([]);
      setVotes([]);
      setChangeVotes([]);
      setChangesHistory([]);
      setRound(prev => prev ? { ...prev, phase: "collecting", consolidated_changes: null } : null);
    }
  };

  // Handle member ready toggle
  const handleToggleReady = async () => {
    if (!round || !currentMember || isFacilitator) return;

    if (isCurrentMemberReady) {
      const success = await feedbackService.unmarkMemberReady(round.id, currentMember);
      if (success) {
        setMemberReady(prev => prev.filter(m => m !== currentMember));
      }
    } else {
      const success = await feedbackService.markMemberReady(round.id, currentMember);
      if (success) {
        const newReady = [...memberReady, currentMember];
        setMemberReady(newReady);

        // Send email notification to facilitator
        fetch("/api/notify-facilitator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberName: currentMember,
            sessionName,
            stepType,
            readyCount: newReady.length,
            totalMembers: MT_MEMBERS.length
          })
        }).catch(() => {}); // Fire-and-forget
      }
    }
  };

  // Handle restoring a previous version
  const handleRestoreVersion = async (versionId: string) => {
    if (!round || !isFacilitator) return;

    const result = await feedbackService.restoreConsolidatedChangesVersion(round.id, versionId);
    if (result) {
      // Reset all votes since all changes may have changed
      await feedbackService.deleteAllChangeVotes(round.id);
      setChangeVotes([]);

      // Update local state
      setRound(prev => prev ? { ...prev, consolidated_changes: result.changes } : null);
      setChangesHistory(result.history);
    }
  };

  // Handle starting a new feedback round (iterative loop)
  const handleStartNewRound = async () => {
    if (!round || !isFacilitator) return;

    // Get the latest data from Supabase (after apply, clusters may have changed)
    if (!supabase) return;
    const { data: sessionRows } = await supabase
      .from("sessions")
      .select("flow_state")
      .eq("id", sessionId)
      .limit(1);

    const session = sessionRows?.[0];
    if (!session?.flow_state) return;

    const flowState = session.flow_state as Record<string, unknown>;
    let freshClusters: ClusterData[] = [];

    if (stepType === "doelen") {
      // Clusters are stored at flow_state.goalClusters.clusters (persistence layer format)
      const goalClustersObj = (flowState.goalClusters || {}) as Record<string, unknown>;
      freshClusters = (goalClustersObj.clusters || []) as ClusterData[];
    } else if (stepType === "scope") {
      const scopeState = (flowState.scope || {}) as Record<string, unknown>;
      const scopeItems = (scopeState.scopeItems || []) as Array<{ id: string; text: string; source: string }>;
      freshClusters = scopeItems.map(item => ({
        id: item.id,
        name: item.text,
        description: item.source || "",
        goals: []
      }));
    } else if (stepType.startsWith("visie_")) {
      const visieState = (flowState.visie || {}) as Record<string, unknown>;
      const visieKey = stepType.replace("visie_", "");
      const subState = (visieState[visieKey] || {}) as Record<string, unknown>;
      const approvedText = (subState.approvedText || "") as string;
      freshClusters = [{
        id: visieKey,
        name: stepLabel,
        description: approvedText,
        goals: []
      }];
    }

    if (freshClusters.length === 0) return;

    // Create a new round with the updated data (old round is already closed via "approved" phase)
    const newRound = await feedbackService.createFeedbackRound(
      sessionId,
      freshClusters,
      FACILITATOR_NAME,
      stepType
    );

    if (newRound) {
      // Reset local state for new round
      setRound(newRound);
      setClusters(freshClusters);
      setSuggestions([]);
      setVotes([]);
      setChangeVotes([]);
      setChangesHistory([]);
      setActiveTab("overview");
    }
  };

  // Show member selector if no member chosen
  if (!currentMember) {
    return <MemberSelector onSelect={handleSelectMember} sessionName={sessionName} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-3" />
          <p className="text-gray-600">Feedback laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-4">&#9888;&#65039;</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Geen feedbackronde</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/sessies/${sessionId}`)}
            className="px-4 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800"
          >
            Terug naar sessie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{stepLabel} Feedback</h1>
              {sessionName && <p className="text-sm text-gray-500">{sessionName}</p>}
            </div>
            <div className="flex items-center gap-3">
              {/* Phase indicator */}
              <PhaseIndicator phase={phase} />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Laatst bijgewerkt: {lastRefresh.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <button
                onClick={() => setCurrentMember(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
              >
                <div className="w-6 h-6 rounded-full bg-cito-blue text-white font-bold flex items-center justify-center text-xs">
                  {currentMember.charAt(0)}
                </div>
                {currentMember}
                {isFacilitator && (
                  <span className="text-xs text-cito-blue font-medium">(facilitator)</span>
                )}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - only in collecting phase */}
      {phase === "collecting" && (
        <div className="bg-white border-b">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto">
              <TabButton
                label="Overzicht"
                isActive={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              />
              {MT_MEMBERS.map(name => {
                const memberSuggestionCount = suggestions.filter(s => s.member_name === name).length;
                return (
                  <TabButton
                    key={name}
                    label={name}
                    isActive={activeTab === name}
                    onClick={() => setActiveTab(name)}
                    badge={memberSuggestionCount > 0 ? memberSuggestionCount : undefined}
                    highlight={name === currentMember}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Facilitator controls */}
        <FacilitatorControls
          phase={phase}
          isFacilitator={isFacilitator}
          suggestionsCount={suggestions.length}
          changes={proposedChanges}
          changeVotes={changeVotes}
          onStartConsolidation={handleConsolidate}
          onApplyChanges={handleApplyChanges}
          onResetRound={isFacilitator ? handleResetRound : undefined}
          isConsolidating={isConsolidating}
          isApplying={isApplying}
          versions={changesHistory}
          onRestoreVersion={handleRestoreVersion}
        />

        {/* Phase: Collecting */}
        {phase === "collecting" && (
          <>
            {activeTab === "overview" ? (
              <FeedbackOverview
                clusters={clusters}
                suggestions={suggestions}
                votes={votes}
                phase={phase}
                facilitatorName={round?.facilitator_name}
                memberReady={memberReady}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Feedback van {activeTab}
                    {activeTab === currentMember && (
                      <span className="ml-2 text-sm font-normal text-cito-blue">(jij)</span>
                    )}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {suggestions.filter(s => s.member_name === activeTab).length} suggestie(s)
                  </span>
                </div>

                {clusters.map(cluster => (
                  <ClusterFeedbackCard
                    key={cluster.id}
                    cluster={cluster}
                    allClusters={clusters}
                    suggestions={suggestions.filter(
                      s => activeTab === currentMember
                        ? true
                        : s.member_name === activeTab || s.cluster_id === cluster.id
                    )}
                    votes={votes}
                    currentMember={currentMember}
                    onAddSuggestion={handleAddSuggestion}
                    onVoteSuggestion={handleVoteSuggestion}
                    onDeleteSuggestion={handleDeleteSuggestion}
                    phase={phase}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Klaar met feedback - sticky footer for MT members in collecting phase */}
        {phase === "collecting" && currentMember && !isFacilitator && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {isCurrentMemberReady
                  ? "Je hebt aangegeven dat je klaar bent met feedback."
                  : "Klaar met feedback geven? Laat het de facilitator weten."
                }
              </div>
              <button
                onClick={handleToggleReady}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  isCurrentMemberReady
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-cito-blue text-white hover:bg-blue-800"
                }`}
              >
                {isCurrentMemberReady ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Klaar — klik om te wijzigen
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ik ben klaar met feedback
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Phase: Consolidating */}
        {phase === "consolidating" && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="spinner w-12 h-12 mb-4" />
            <h2 className="text-lg font-semibold text-gray-800 mb-2">AI consolideert feedback</h2>
            <p className="text-gray-500 text-center max-w-md">
              De AI analyseert alle {suggestions.length} suggesties en stelt wijzigingen voor op basis van de feedback van het MT.
            </p>
          </div>
        )}

        {/* Phase: Voting - shareable link for MT members */}
        {phase === "voting" && isFacilitator && (
          <VotingShareLink sessionId={sessionId} stepType={stepType} />
        )}

        {/* Phase: Voting */}
        {phase === "voting" && consolidatedChanges && (
          <ConsolidatedChanges
            changes={proposedChanges}
            unchangedClusterIds={consolidatedChanges.unchanged_clusters || []}
            consolidationSummary={consolidatedChanges.consolidation_summary || ""}
            changeVotes={changeVotes}
            currentMember={currentMember}
            onVote={handleVoteChange}
            isVotingPhase={true}
            isFacilitator={isFacilitator}
            onEditChange={handleEditChange}
            onRefineChange={handleRefineChange}
            onDeleteChange={isFacilitator ? handleDeleteChange : undefined}
          />
        )}

        {/* Phase: Approved */}
        {phase === "approved" && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{stepLabel} bijgewerkt!</h2>
            <p className="text-gray-500 mb-6">
              De feedbackronde is afgerond. De goedgekeurde wijzigingen zijn doorgevoerd.
            </p>
            {isFacilitator && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Het MT kan nu de doorgevoerde wijzigingen controleren en eventueel nieuwe feedback geven.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleStartNewRound}
                    className="px-6 py-2.5 bg-cito-blue text-white rounded-lg hover:bg-blue-800 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Nieuwe feedbackronde starten
                  </button>
                  <button
                    onClick={() => router.push(`/sessies/${sessionId}`)}
                    className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Terug naar sessie
                  </button>
                </div>
              </div>
            )}
            {!isFacilitator && (
              <button
                onClick={() => router.push(`/sessies/${sessionId}`)}
                className="px-6 py-2.5 bg-cito-blue text-white rounded-lg hover:bg-blue-800"
              >
                Terug naar sessie
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Phase indicator pill
function PhaseIndicator({ phase }: { phase: FeedbackPhase }) {
  const config: Record<FeedbackPhase, { label: string; className: string }> = {
    collecting: { label: "Feedback verzamelen", className: "bg-blue-100 text-blue-700" },
    consolidating: { label: "AI consolidatie", className: "bg-amber-100 text-amber-700" },
    voting: { label: "Stemronde", className: "bg-purple-100 text-purple-700" },
    approved: { label: "Afgerond", className: "bg-green-100 text-green-700" }
  };
  const c = config[phase];
  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${c.className}`}>{c.label}</span>;
}

// Voting share link for facilitator
function VotingShareLink({ sessionId, stepType }: { sessionId: string; stepType: string }) {
  const [copied, setCopied] = useState(false);
  const votingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/sessies/${sessionId}/feedback?step=${stepType}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(votingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-purple-50 border-purple-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Stemronde link delen</h3>
          <p className="text-sm text-gray-600 mb-3">
            Deel deze link met MT-leden zodat zij op hun eigen laptop kunnen stemmen op de voorgestelde wijzigingen.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={votingUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-1"
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
        </div>
      </div>
    </div>
  );
}

// Tab button component
function TabButton({
  label,
  isActive,
  onClick,
  badge,
  highlight
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        isActive
          ? "border-cito-blue text-cito-blue"
          : "border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300"
      } ${highlight && !isActive ? "text-cito-blue" : ""}`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-cito-blue text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
