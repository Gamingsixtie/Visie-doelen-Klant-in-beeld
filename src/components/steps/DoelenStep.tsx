"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/session-context";
import { useToast, AnalyzingIndicator, ConfirmDialog, ActivityTimer, TIMER_PRESETS } from "@/components/ui";
import { ResponseMatrix } from "@/components/consolidation";
import { AsyncFeedbackSection } from "@/components/feedback";
import {
  GoalClusterList,
  DotVoting,
  DotVotingResults,
  GoalRanking,
  RankingSummary
} from "@/components/doelen";
import type { GoalClusterType, Goal, SubGoal } from "@/components/doelen";
import type { ThemeCluster, DoelenStepPhase, ClusterVersion } from "@/lib/types";
import { RefineWithAI } from "@/components/ui/RefineWithAI";
import { MT_MEMBERS, FACILITATOR_NAME } from "@/lib/types";
import * as persistence from "@/lib/persistence";
import { updateActiveRoundSourceClusters } from "@/lib/feedback-service";
import { supabase } from "@/lib/supabase";

interface DoelenStepProps {
  onComplete: () => void;
  readOnly?: boolean;
}

type StepPhase =
  | "overview"
  | "analyzing"
  | "clusters"
  | "voting"
  | "ranking"
  | "formulation"
  | "approved";

export function DoelenStep({ onComplete, readOnly: readOnlyProp }: DoelenStepProps) {
  const { documents, getApprovedText, saveApprovedText, removeApprovedText, updateFlowState, flowState, isViewerMode, updateDoelenStepState, getDoelenStepState, currentSession, completeStep, unlockStep } = useSession();
  const isReadOnly = readOnlyProp ?? isViewerMode;
  const { showToast } = useToast();

  // Get synced state from context (for real-time viewer sync)
  const syncedState = getDoelenStepState();

  // Use synced state values - these are shared with viewers
  const phase = syncedState.phase;
  const clusters = syncedState.clusters as GoalClusterType[];
  const selectedClusterIds = syncedState.selectedClusterIds;
  const allVotes = syncedState.allVotes;
  const ranking = syncedState.ranking;
  const formulations = syncedState.formulations;
  const currentVoter = syncedState.currentVoter || MT_MEMBERS[0];

  // Helper functions to update synced state
  const setPhase = (newPhase: DoelenStepPhase) => {
    updateDoelenStepState({ phase: newPhase });
  };
  const setClusters = (newClusters: GoalClusterType[] | ((prev: GoalClusterType[]) => GoalClusterType[])) => {
    const value = typeof newClusters === 'function' ? newClusters(clusters) : newClusters;
    updateDoelenStepState({ clusters: value });
  };
  const setSelectedClusterIds = (newIds: string[] | ((prev: string[]) => string[])) => {
    const value = typeof newIds === 'function' ? newIds(selectedClusterIds) : newIds;
    updateDoelenStepState({ selectedClusterIds: value });
  };
  const setAllVotes = (newVotes: Record<string, Record<string, number>> | ((prev: Record<string, Record<string, number>>) => Record<string, Record<string, number>>)) => {
    const value = typeof newVotes === 'function' ? newVotes(allVotes) : newVotes;
    updateDoelenStepState({ allVotes: value });
  };
  const setRanking = (newRanking: string[] | ((prev: string[]) => string[])) => {
    const value = typeof newRanking === 'function' ? newRanking(ranking) : newRanking;
    updateDoelenStepState({ ranking: value });
  };
  const setFormulations = (newFormulations: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    const value = typeof newFormulations === 'function' ? newFormulations(formulations) : newFormulations;
    updateDoelenStepState({ formulations: value });
  };
  const setCurrentVoter = (newVoter: string) => {
    updateDoelenStepState({ currentVoter: newVoter });
  };

  // Local-only state (not synced)
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<(() => void) | null>(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [useShortlistVoting, setUseShortlistVoting] = useState<boolean | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Merge mode state
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  // Add new goal state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");

  // Regenerate with Claude 4.6 state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedClusters, setRegeneratedClusters] = useState<GoalClusterType[] | null>(null);

  // Cluster version history
  const [clusterVersions, setClusterVersions] = useState<ClusterVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Guard to prevent save effect from overwriting Supabase before initial load completes
  const isInitialLoadComplete = useRef(false);

  // Check if already approved
  useEffect(() => {
    // Check if at least 1 goal is approved (any number from 1-5 is valid)
    const approved1 = getApprovedText("goal_1");
    if (approved1) {
      setPhase("approved");
    }
  }, [getApprovedText]);

  // Load goal clusters - Supabase is the source of truth
  // Always reload when component mounts to get latest data
  useEffect(() => {
    if (!currentSession || isReadOnly) return;

    const loadFromSupabase = async () => {
      if (!supabase) {
        // No Supabase, try localStorage
        const saved = persistence.getGoalClusters(currentSession.id);
        if (saved && saved.clusters.length > 0) {
          console.log("[DoelenStep] Loading from localStorage (no Supabase):", saved.clusters.length);
          updateDoelenStepState({
            clusters: saved.clusters as GoalClusterType[],
            selectedClusterIds: saved.selectedClusterIds,
            allVotes: saved.allVotes,
            ranking: saved.ranking,
            formulations: saved.formulations,
            phase: saved.phase as DoelenStepPhase
          });
        }
        return;
      }

      try {
        console.log("[DoelenStep] Loading from Supabase for session:", currentSession.id);
        const { data: sessionRows, error } = await supabase
          .from("sessions")
          .select("flow_state")
          .eq("id", currentSession.id)
          .limit(1);

        const session = sessionRows?.[0];
        console.log("[DoelenStep] Supabase response:", {
          hasData: !!session,
          hasFlowState: !!session?.flow_state,
          error: error?.message,
          flowStateKeys: session?.flow_state ? Object.keys(session.flow_state as object) : []
        });

        if (session?.flow_state) {
          const flowState = session.flow_state as Record<string, unknown>;
          const goalClusters = flowState.goalClusters as Record<string, unknown> | undefined;

          console.log("[DoelenStep] goalClusters check:", {
            hasGoalClusters: !!goalClusters,
            hasClustersArray: goalClusters ? Array.isArray(goalClusters.clusters) : false,
            clustersLength: goalClusters?.clusters ? (goalClusters.clusters as unknown[]).length : 0,
            clusterNames: goalClusters?.clusters ? (goalClusters.clusters as {name?: string}[]).slice(0,3).map(c => c.name) : []
          });

          if (goalClusters && Array.isArray(goalClusters.clusters) && goalClusters.clusters.length > 0) {
            console.log("[DoelenStep] Loaded from Supabase:", goalClusters.clusters.length, "clusters");

            const clustersData = goalClusters.clusters as GoalClusterType[];
            const selectedIds = (goalClusters.selectedClusterIds as string[]) || [];
            const votes = (goalClusters.allVotes as Record<string, Record<string, number>>) || {};
            const rankingData = (goalClusters.ranking as string[]) || [];
            const formulationsData = (goalClusters.formulations as Record<string, string>) || {};
            const phaseData = (goalClusters.phase as DoelenStepPhase) || "clusters";

            updateDoelenStepState({
              clusters: clustersData,
              selectedClusterIds: selectedIds,
              allVotes: votes,
              ranking: rankingData,
              formulations: formulationsData,
              phase: phaseData
            });

            // Sync to localStorage
            persistence.saveGoalClusters(currentSession.id, {
              clusters: clustersData,
              selectedClusterIds: selectedIds,
              allVotes: votes,
              ranking: rankingData,
              formulations: formulationsData,
              phase: phaseData
            });
            return;
          }
        }

        // Supabase empty, try localStorage
        const saved = persistence.getGoalClusters(currentSession.id);
        if (saved && saved.clusters.length > 0) {
          console.log("[DoelenStep] Supabase empty, loading from localStorage:", saved.clusters.length);
          updateDoelenStepState({
            clusters: saved.clusters as GoalClusterType[],
            selectedClusterIds: saved.selectedClusterIds,
            allVotes: saved.allVotes,
            ranking: saved.ranking,
            formulations: saved.formulations,
            phase: saved.phase as DoelenStepPhase
          });
        }
      } catch (err) {
        console.error("[DoelenStep] Error loading from Supabase:", err);
        // Fallback to localStorage
        const saved = persistence.getGoalClusters(currentSession.id);
        if (saved && saved.clusters.length > 0) {
          updateDoelenStepState({
            clusters: saved.clusters as GoalClusterType[],
            selectedClusterIds: saved.selectedClusterIds,
            allVotes: saved.allVotes,
            ranking: saved.ranking,
            formulations: saved.formulations,
            phase: saved.phase as DoelenStepPhase
          });
        }
      }
    };

    isInitialLoadComplete.current = false;
    loadFromSupabase().then(() => {
      isInitialLoadComplete.current = true;
      console.log("[DoelenStep] Initial load complete, save effect unlocked");
    });

    // Load cluster version history
    const versions = persistence.getClusterVersions(currentSession.id);
    if (versions.length > 0) {
      setClusterVersions(versions);
      setActiveVersionId(versions[versions.length - 1].id);
    }
  }, [currentSession, isReadOnly]);

  // Reload from Supabase when page becomes visible (returning from feedback)
  useEffect(() => {
    if (!currentSession || isReadOnly || !supabase) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && supabase) {
        console.log("[DoelenStep] Page visible, reloading from Supabase...");
        try {
          const { data: sessionRows } = await supabase
            .from("sessions")
            .select("flow_state")
            .eq("id", currentSession.id)
            .limit(1);

          const session = sessionRows?.[0];
          if (session?.flow_state) {
            const flowState = session.flow_state as Record<string, unknown>;
            const goalClusters = flowState.goalClusters as Record<string, unknown> | undefined;

            if (goalClusters && Array.isArray(goalClusters.clusters) && goalClusters.clusters.length > 0) {
              console.log("[DoelenStep] Reloaded from Supabase:", goalClusters.clusters.length, "clusters");
              updateDoelenStepState({
                clusters: goalClusters.clusters as GoalClusterType[],
                selectedClusterIds: (goalClusters.selectedClusterIds as string[]) || [],
                allVotes: (goalClusters.allVotes as Record<string, Record<string, number>>) || {},
                ranking: (goalClusters.ranking as string[]) || [],
                formulations: (goalClusters.formulations as Record<string, string>) || {},
                phase: (goalClusters.phase as DoelenStepPhase) || "clusters"
              });
            }
          }
        } catch (err) {
          console.error("[DoelenStep] Error reloading from Supabase:", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentSession, isReadOnly]);

  // Save goal clusters to persistence when state changes
  useEffect(() => {
    if (!currentSession || isReadOnly) return;
    if (clusters.length === 0) return; // Don't save empty state
    if (!isInitialLoadComplete.current) return; // Don't save stale state before Supabase load completes

    persistence.saveGoalClusters(currentSession.id, {
      clusters,
      selectedClusterIds,
      allVotes,
      ranking,
      formulations,
      phase
    });
  }, [currentSession, clusters, selectedClusterIds, allVotes, ranking, formulations, phase, isReadOnly]);

  // Auto-fix: if clusters exist but phase is still "overview", jump to "clusters" phase
  useEffect(() => {
    if (!currentSession || isReadOnly) return;
    if (clusters.length === 0) return;
    if (!isInitialLoadComplete.current) return;
    if (phase !== "overview") return;

    console.log("[DoelenStep] Clusters exist but phase is 'overview' — auto-fixing to 'clusters'");
    setPhase("clusters");
  }, [currentSession, clusters.length, isReadOnly, phase, setPhase]);

  // Auto-complete doelen step when clusters exist — ensures you can always navigate to scope
  useEffect(() => {
    if (!currentSession || isReadOnly) return;
    if (clusters.length === 0) return;
    if (!isInitialLoadComplete.current) return;
    if (flowState.steps.doelen === "completed") return;

    console.log("[DoelenStep] Clusters exist, auto-completing doelen step");
    completeStep("doelen");
    unlockStep("scope");
  }, [currentSession, clusters.length, isReadOnly, flowState.steps.doelen, completeStep, unlockStep]);

  // Sync clusters to active feedback round when clusters change
  useEffect(() => {
    if (!currentSession || isReadOnly || clusters.length === 0) return;
    if (!isInitialLoadComplete.current) return; // Don't sync stale clusters
    updateActiveRoundSourceClusters(currentSession.id, clusters, "doelen");
  }, [currentSession, clusters, isReadOnly]);

  // Set initial voter to first MT member (only if not already set and not in viewer mode)
  useEffect(() => {
    if (MT_MEMBERS.length > 0 && !currentVoter && !isReadOnly) {
      setCurrentVoter(MT_MEMBERS[0]);
    }
  }, [currentVoter, isReadOnly, setCurrentVoter]);

  // Sync local votes when currentVoter changes
  useEffect(() => {
    if (currentVoter && allVotes[currentVoter]) {
      setVotes(allVotes[currentVoter]);
    } else {
      setVotes({});
    }
  }, [currentVoter, allVotes]);

  // Warn on unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
            id: `cluster-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
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

      // Save version snapshot
      if (currentSession) {
        const version = persistence.saveClusterVersion(
          currentSession.id,
          goalClusters,
          `AI Analyse #${clusterVersions.length + 1}`,
          "ai_generate"
        );
        setClusterVersions(prev => [...prev, version]);
        setActiveVersionId(version.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setLastFailedAction(() => handleStartAnalysis);
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

  const handleEditClusterDescription = (clusterId: string, newDescription: string) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === clusterId ? { ...c, description: newDescription } : c))
    );
  };

  // Sub-goal handlers
  const handleAddSubGoal = (clusterId: string, subGoal: SubGoal) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.id === clusterId
          ? { ...c, subGoals: [...(c.subGoals || []), subGoal] }
          : c
      )
    );
    showToast("Subdoel toegevoegd", "success");
  };

  const handleRemoveSubGoal = (clusterId: string, subGoalId: string) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.id === clusterId
          ? { ...c, subGoals: (c.subGoals || []).filter((sg) => sg.id !== subGoalId) }
          : c
      )
    );
    showToast("Subdoel verwijderd", "info");
  };

  const handleEditSubGoal = (clusterId: string, subGoalId: string, name: string, description: string) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.id === clusterId
          ? {
              ...c,
              subGoals: (c.subGoals || []).map((sg) =>
                sg.id === subGoalId ? { ...sg, name, description } : sg
              )
            }
          : c
      )
    );
    showToast("Subdoel bijgewerkt", "success");
  };

  // Delete cluster handler
  const handleDeleteCluster = (clusterId: string) => {
    const clusterName = clusters.find(c => c.id === clusterId)?.name || clusterId;

    // Delete first, version save is optional
    const filtered = clusters.filter((c) => c.id !== clusterId);
    if (filtered.length === clusters.length) {
      console.error("Delete failed: cluster not found", clusterId, clusters.map(c => c.id));
      showToast("Fout: doel niet gevonden", "error");
      return;
    }

    setClusters(filtered);
    setSelectedClusterIds(selectedClusterIds.filter((id) => id !== clusterId));

    // Try to save version snapshot for undo (non-blocking)
    try {
      if (currentSession) {
        const version = persistence.saveClusterVersion(
          currentSession.id,
          clusters, // original clusters before delete
          `Voor verwijdering "${clusterName}"`,
          "re_generate"
        );
        setClusterVersions(prev => [...prev, version]);
      }
    } catch (e) {
      console.warn("Version save failed (non-blocking):", e);
    }

    showToast(`"${clusterName}" verwijderd`, "success");
  };

  // Merge handlers
  const handleToggleMergeSelect = (clusterId: string) => {
    setMergeSelectedIds((prev) =>
      prev.includes(clusterId)
        ? prev.filter((id) => id !== clusterId)
        : [...prev, clusterId]
    );
  };

  const handleMergeClusters = async () => {
    // Capture current selection to avoid stale closure issues
    const idsToMerge = [...mergeSelectedIds];

    if (idsToMerge.length < 2) {
      showToast("Selecteer minimaal 2 doelen om samen te voegen", "warning");
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      // Get ONLY the clusters that were selected for merge
      const clustersToMerge = clusters.filter((c) => idsToMerge.includes(c.id));

      // Double check we have the right clusters
      if (clustersToMerge.length !== idsToMerge.length) {
        throw new Error("Kon niet alle geselecteerde doelen vinden");
      }

      // Call AI to generate a merged goal
      const response = await fetch("/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: clustersToMerge.map((c) => `${c.name}: ${c.description}`).join("\n\n"),
          context: `Dit zijn ${clustersToMerge.length} programma doelen die samengevoegd moeten worden.`,
          feedback: `Voeg deze ${clustersToMerge.length} doelen samen tot ÉÉN helder geformuleerd doel.
          Behoud de essentie van alle doelen en formuleer een overkoepelend doel dat alle aspecten dekt.
          Geef ALLEEN het samengevoegde doel terug in het formaat: "TITEL: beschrijving"

          De doelen om samen te voegen zijn:
          ${clustersToMerge.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`).join("\n")}`
        })
      });

      if (!response.ok) {
        throw new Error("Samenvoegen mislukt");
      }

      const result = await response.json();
      const refinedText = result.refinedText || "";

      // Parse the result
      let newName = "Samengevoegd doel";
      let newDescription = refinedText;

      if (refinedText.includes(":")) {
        const [titlePart, ...descParts] = refinedText.split(":");
        newName = titlePart.trim();
        newDescription = descParts.join(":").trim();
      }

      // Combine all goals from merged clusters
      const combinedGoals: Goal[] = clustersToMerge.flatMap((c) => c.goals);

      // Create new merged cluster
      const mergedCluster: GoalClusterType = {
        id: `merged-${Date.now()}`,
        name: newName,
        description: newDescription,
        goals: combinedGoals,
        votes: clustersToMerge.reduce((sum, c) => sum + c.votes, 0),
        mergedFrom: clustersToMerge, // Store original clusters for undo
        subGoals: []
      };

      // Replace ONLY the merged clusters with new one, keep all others intact
      setClusters((prev) => {
        const keptClusters = prev.filter((c) => !idsToMerge.includes(c.id));
        return [...keptClusters, mergedCluster];
      });

      // Save version snapshot after merge
      if (currentSession) {
        // We need to compute the new clusters to save the version
        const keptClusters = clusters.filter((c) => !idsToMerge.includes(c.id));
        const newClusters = [...keptClusters, mergedCluster];
        const version = persistence.saveClusterVersion(
          currentSession.id,
          newClusters,
          `Na samenvoegen: "${newName}"`,
          "merge"
        );
        setClusterVersions(prev => [...prev, version]);
        setActiveVersionId(version.id);
      }

      // Reset merge mode
      setMergeSelectedIds([]);
      setIsMergeMode(false);
      showToast(`${clustersToMerge.length} doelen samengevoegd tot "${newName}"`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout bij samenvoegen");
    } finally {
      setIsMerging(false);
    }
  };

  // Add a new goal cluster manually
  const handleAddNewCluster = (name: string, description: string) => {
    const newCluster: GoalClusterType = {
      id: `manual-${Date.now()}`,
      name,
      description,
      goals: [],
      votes: 0,
      subGoals: []
    };
    setClusters((prev) => [...prev, newCluster]);
    showToast("Nieuw doel toegevoegd", "success");
  };

  const handleUndoMerge = (clusterId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId);
    const mergedFrom = cluster?.mergedFrom;
    if (!mergedFrom || mergedFrom.length === 0) return;

    // Restore original clusters
    setClusters((prev) => [
      ...prev.filter((c) => c.id !== clusterId),
      ...mergedFrom
    ]);

    showToast("Samenvoeging ongedaan gemaakt", "info");
  };

  // Regenerate goal clusters with Claude 4.6
  const handleRegenerateWithClaude46 = async () => {
    setIsRegenerating(true);
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

      if (!response.ok) throw new Error("Heranalyse mislukt");
      const result = await response.json();

      // Convert themes to goal clusters (same logic as handleStartAnalysis)
      const newGoalClusters: GoalClusterType[] = (result.themes || []).map(
        (theme: ThemeCluster & { averagePriority?: number; priorityBreakdown?: { prio1: number; prio2: number; prio3: number } }, index: number) => {
          const matchedGoals: Goal[] = [];
          const relatedRespondents = theme.relatedResponses || theme.mentionedBy || [];

          relatedRespondents.forEach((respId: string) => {
            const respondentGoals = allGoals.filter((g) =>
              g.respondentId === respId ||
              g.respondentName.toLowerCase().includes(respId.toLowerCase()) ||
              respId.toLowerCase().includes(g.respondentName.toLowerCase())
            );
            const themeKeywords = theme.name.toLowerCase().split(/\s+/);
            respondentGoals.forEach((goal) => {
              const goalLower = goal.text.toLowerCase();
              const hasMatch = themeKeywords.some(kw => kw.length > 3 && goalLower.includes(kw)) ||
                (theme.exampleQuotes || []).some((q: string) =>
                  goalLower.includes(q.toLowerCase().slice(0, 20)) ||
                  q.toLowerCase().includes(goalLower.slice(0, 20))
                );
              if (hasMatch && !matchedGoals.find(mg => mg.id === goal.id)) {
                matchedGoals.push({ id: goal.id, respondentId: goal.respondentId, respondentName: goal.respondentName, text: goal.text, rank: goal.rank });
              }
            });
            if (matchedGoals.filter(g => g.respondentId === respId || g.respondentName.toLowerCase().includes(respId.toLowerCase())).length === 0) {
              const firstGoal = respondentGoals[0];
              if (firstGoal && !matchedGoals.find(mg => mg.id === firstGoal.id)) {
                matchedGoals.push({ id: firstGoal.id, respondentId: firstGoal.respondentId, respondentName: firstGoal.respondentName, text: firstGoal.text, rank: firstGoal.rank });
              }
            }
          });

          return {
            id: `cluster-regen-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: theme.name,
            description: theme.description,
            goals: matchedGoals,
            votes: 0,
            aiAveragePriority: theme.averagePriority,
            priorityBreakdown: theme.priorityBreakdown
          };
        }
      );

      setRegeneratedClusters(newGoalClusters);
      showToast("Nieuwe analyse met Claude 4.6 gereed!", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Heranalyse mislukt");
      showToast("Heranalyse mislukt", "error");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Accept regenerated clusters
  const handleAcceptRegenerated = () => {
    if (!regeneratedClusters) return;

    // Save current clusters as a version before overwriting
    if (currentSession) {
      persistence.saveClusterVersion(
        currentSession.id,
        clusters,
        "Vorige versie (voor hergeneratie)",
        "re_generate"
      );
    }

    setClusters(regeneratedClusters);

    // Save new version
    if (currentSession) {
      const version = persistence.saveClusterVersion(
        currentSession.id,
        regeneratedClusters,
        "Claude 4.6 hergeneratie",
        "ai_generate"
      );
      setClusterVersions(prev => [...prev, version]);
      setActiveVersionId(version.id);
    }

    setRegeneratedClusters(null);
    showToast("Nieuwe doelen met Claude 4.6 overgenomen!", "success");
  };

  // Accept only selected regenerated clusters (add to existing)
  const handleAcceptSelectedRegenerated = (selectedIds: string[]) => {
    if (!regeneratedClusters) return;

    const selectedClusters = regeneratedClusters.filter(c => selectedIds.includes(c.id));
    if (selectedClusters.length === 0) return;

    // Save current version
    if (currentSession) {
      persistence.saveClusterVersion(
        currentSession.id,
        clusters,
        "Voor toevoeging Claude 4.6 doelen",
        "re_generate"
      );
    }

    // Add selected clusters to existing (avoid duplicates by name)
    const existingNames = new Set(clusters.map(c => c.name.toLowerCase()));
    const newToAdd = selectedClusters.filter(c => !existingNames.has(c.name.toLowerCase()));
    const toReplace = selectedClusters.filter(c => existingNames.has(c.name.toLowerCase()));

    let updatedClusters = [...clusters];

    // Replace matching clusters with the new version
    toReplace.forEach(newC => {
      updatedClusters = updatedClusters.map(old =>
        old.name.toLowerCase() === newC.name.toLowerCase()
          ? { ...newC, id: old.id } // Keep old ID for continuity
          : old
      );
    });

    // Add genuinely new clusters
    updatedClusters = [...updatedClusters, ...newToAdd];

    setClusters(updatedClusters);

    // Save new version
    if (currentSession) {
      const version = persistence.saveClusterVersion(
        currentSession.id,
        updatedClusters,
        `${selectedClusters.length} Claude 4.6 doelen toegevoegd`,
        "ai_generate"
      );
      setClusterVersions(prev => [...prev, version]);
      setActiveVersionId(version.id);
    }

    setRegeneratedClusters(null);
    showToast(`${selectedClusters.length} doel(en) toegevoegd/bijgewerkt`, "success");
  };

  // Dismiss regenerated clusters
  const handleDismissRegenerated = () => {
    setRegeneratedClusters(null);
    showToast("Huidige doelen behouden", "info");
  };

  // Quick merge: merge source cluster into target cluster
  const handleMergeInto = async (sourceClusterId: string, targetClusterId: string) => {
    const sourceCluster = clusters.find((c) => c.id === sourceClusterId);
    const targetCluster = clusters.find((c) => c.id === targetClusterId);

    if (!sourceCluster || !targetCluster) return;

    setIsMerging(true);
    setError(null);

    try {
      // Call AI to generate a merged goal
      const response = await fetch("/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: `${targetCluster.name}: ${targetCluster.description}\n\n${sourceCluster.name}: ${sourceCluster.description}`,
          context: `Dit zijn 2 programma doelen die samengevoegd moeten worden tot één doel.`,
          feedback: `Voeg deze 2 doelen samen tot ÉÉN helder geformuleerd doel.
          Het hoofddoel is: "${targetCluster.name}" waar "${sourceCluster.name}" aan wordt toegevoegd.
          Behoud de essentie van beide doelen en formuleer een overkoepelend doel dat alle aspecten dekt.
          Geef ALLEEN het samengevoegde doel terug in het formaat: "TITEL: beschrijving"`
        })
      });

      if (!response.ok) {
        throw new Error("Samenvoegen mislukt");
      }

      const result = await response.json();
      const refinedText = result.refinedText || "";

      // Parse the result
      let newName = targetCluster.name;
      let newDescription = refinedText;

      if (refinedText.includes(":")) {
        const [titlePart, ...descParts] = refinedText.split(":");
        newName = titlePart.trim();
        newDescription = descParts.join(":").trim();
      }

      // Combine all goals from both clusters
      const combinedGoals: Goal[] = [...targetCluster.goals, ...sourceCluster.goals];

      // Create new merged cluster
      const mergedCluster: GoalClusterType = {
        id: `merged-${Date.now()}`,
        name: newName,
        description: newDescription,
        goals: combinedGoals,
        votes: targetCluster.votes + sourceCluster.votes,
        mergedFrom: [targetCluster, sourceCluster], // Store original clusters for undo
        subGoals: [...(targetCluster.subGoals || []), ...(sourceCluster.subGoals || [])]
      };

      // Replace both clusters with the merged one
      setClusters((prev) => [
        ...prev.filter((c) => c.id !== sourceClusterId && c.id !== targetClusterId),
        mergedCluster
      ]);

      showToast(`"${sourceCluster.name}" samengevoegd met "${targetCluster.name}"`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout bij samenvoegen");
    } finally {
      setIsMerging(false);
    }
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

    // Pre-select only clusters that received votes, max 5
    const clustersWithVotes = updatedClusters.filter(c => c.votes > 0);
    const maxToSelect = Math.min(clustersWithVotes.length, 5);
    const topIds = clustersWithVotes.slice(0, maxToSelect).map((c) => c.id);
    setRanking(topIds);

    setPhase("ranking");
  };

  const handleRankingChange = (newRanking: string[]) => {
    setRanking(newRanking);
  };

  const handleProceedToFormulation = () => {
    // Initialize formulations with cluster descriptions AND sub-goals
    const initialFormulations: Record<string, string> = {};
    ranking.forEach((clusterId) => {
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster) {
        let formulation = `${cluster.name}: ${cluster.description}`;

        // Include sub-goals if they exist
        if (cluster.subGoals && cluster.subGoals.length > 0) {
          formulation += "\n\nSubdoelen:";
          cluster.subGoals.forEach((subGoal, idx) => {
            formulation += `\n${idx + 1}. ${subGoal.name}`;
            if (subGoal.description) {
              formulation += ` - ${subGoal.description}`;
            }
          });
        }

        initialFormulations[clusterId] = formulation;
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
    setIsDirty(true);
  };

  // Regenerate formulation for a single cluster including subdoelen
  const handleRegenerateFormulation = (clusterId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    let formulation = `${cluster.name}: ${cluster.description}`;

    // Include sub-goals if they exist
    if (cluster.subGoals && cluster.subGoals.length > 0) {
      formulation += "\n\nSubdoelen:";
      cluster.subGoals.forEach((subGoal, idx) => {
        formulation += `\n${idx + 1}. ${subGoal.name}`;
        if (subGoal.description) {
          formulation += ` - ${subGoal.description}`;
        }
      });
    }

    handleFormulationChange(clusterId, formulation);
    showToast("Formulering bijgewerkt met subdoelen", "success");
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
    setIsDirty(false);
    showToast(`${ranking.length} doelen succesvol vastgesteld!`, "success");
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
            Analyseer alle doelen en bepaal gezamenlijk de top 5 (of minder, afhankelijk van stemmen).
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

        {/* Phase: Overview */}
        {phase === "overview" && (
          <div className="space-y-6">
            {/* Timer for discussion */}
            <ActivityTimer
              mode={TIMER_PRESETS.doelen_overview.mode}
              duration={TIMER_PRESETS.doelen_overview.duration}
              label={TIMER_PRESETS.doelen_overview.label}
              showModeHelper
            />

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

            {allGoals.length > 0 && !isReadOnly && (
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
          <AnalyzingIndicator
            title="AI analyseert en clustert de doelen..."
            steps={[
              { label: "Doelen van alle MT-leden inlezen..." },
              { label: "Vergelijkbare doelen groeperen..." },
              { label: "Prioriteiten berekenen..." },
              { label: "Clusters samenstellen..." }
            ]}
          />
        )}

        {/* Phase: Clusters */}
        {phase === "clusters" && (
          <div className="space-y-6">
            {/* Timer for cluster discussion */}
            <ActivityTimer
              mode={TIMER_PRESETS.doelen_clusters.mode}
              duration={TIMER_PRESETS.doelen_clusters.duration}
              label={TIMER_PRESETS.doelen_clusters.label}
              showModeHelper
            />

            {/* Version selector - show when multiple versions exist */}
            {clusterVersions.length > 1 && !isReadOnly && (
              <div className="card p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600">Versiegeschiedenis</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Weet je zeker dat je alle versiegeschiedenis wilt wissen? Dit kan niet ongedaan worden.")) {
                        if (currentSession) {
                          persistence.clearClusterVersions(currentSession.id);
                        }
                        setClusterVersions([]);
                        setActiveVersionId(null);
                        showToast("Versiegeschiedenis gewist", "info");
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Alles wissen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clusterVersions.map((version) => (
                    <div key={version.id} className="flex items-center gap-0.5">
                      <button
                        onClick={() => {
                          setActiveVersionId(version.id);
                          setClusters(version.clusters as GoalClusterType[]);
                          showToast(`Versie "${version.label}" geladen`, "info");
                        }}
                        className={`px-3 py-1.5 text-xs rounded-l-full border transition-colors ${
                          activeVersionId === version.id
                            ? "bg-cito-blue text-white border-cito-blue"
                            : "bg-white text-gray-600 border-gray-300 hover:border-cito-blue hover:text-cito-blue"
                        }`}
                      >
                        {version.label}
                        <span className="ml-1 opacity-60">
                          {new Date(version.createdAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          if (currentSession) {
                            persistence.deleteClusterVersion(currentSession.id, version.id);
                          }
                          setClusterVersions(prev => prev.filter(v => v.id !== version.id));
                          if (activeVersionId === version.id) setActiveVersionId(null);
                        }}
                        className={`px-1.5 py-1.5 text-xs rounded-r-full border border-l-0 transition-colors ${
                          activeVersionId === version.id
                            ? "bg-cito-blue text-white/70 border-cito-blue hover:text-white"
                            : "bg-white text-gray-400 border-gray-300 hover:text-red-500 hover:border-red-300"
                        }`}
                        title="Verwijder deze versie"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regenerate with Claude 4.6 */}
            {!isReadOnly && !regeneratedClusters && (
              <div className="card bg-indigo-50 border-indigo-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Opnieuw analyseren met Claude 4.6</h3>
                      <p className="text-xs text-gray-600">Laat de doelen opnieuw clusteren met het nieuwste AI-model en vergelijk het resultaat.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRegenerateWithClaude46}
                    disabled={isRegenerating || allGoals.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center gap-2"
                  >
                    {isRegenerating ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        Analyseren...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Hergenereren
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Comparison view: old vs new clusters */}
            {regeneratedClusters && (
              <RegenerationComparison
                oldClusters={clusters}
                newClusters={regeneratedClusters}
                onAcceptSelected={handleAcceptSelectedRegenerated}
                onAcceptAll={handleAcceptRegenerated}
                onDismiss={handleDismissRegenerated}
              />
            )}

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Geclustered doelen ({clusters.length})
                </h2>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    {isMergeMode ? (
                      <>
                        <span className="text-sm text-purple-600">
                          {mergeSelectedIds.length} geselecteerd
                        </span>
                        <button
                          onClick={handleMergeClusters}
                          disabled={mergeSelectedIds.length < 2 || isMerging}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {isMerging ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Bezig...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                              </svg>
                              Voeg samen
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsMergeMode(false);
                            setMergeSelectedIds([]);
                          }}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                        >
                          Annuleren
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsMergeMode(true)}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 flex items-center gap-1"
                        title="Voeg vergelijkbare doelen samen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                        </svg>
                        Doelen samenvoegen
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isMergeMode && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-700 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Selecteer minimaal 2 doelen die je wilt samenvoegen. AI zal een nieuw gecombineerd doel genereren.
                  </p>
                </div>
              )}

              <GoalClusterList
                clusters={clusters}
                selectedIds={selectedClusterIds}
                maxSelections={5}
                onToggleSelect={handleToggleSelect}
                onEditClusterName={handleEditClusterName}
                onEditClusterDescription={handleEditClusterDescription}
                editable
                onAddSubGoal={handleAddSubGoal}
                onRemoveSubGoal={handleRemoveSubGoal}
                onEditSubGoal={handleEditSubGoal}
                isMergeMode={isMergeMode}
                mergeSelectedIds={mergeSelectedIds}
                onToggleMergeSelect={handleToggleMergeSelect}
                onUndoMerge={handleUndoMerge}
                onMergeInto={handleMergeInto}
                onDeleteCluster={handleDeleteCluster}
              />

              {/* Add new goal button/form */}
              {!isReadOnly && !isMergeMode && (
                <div className="mt-4">
                  {isAddingGoal ? (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg space-y-3">
                      <h4 className="font-medium text-green-800">Nieuw doel toevoegen</h4>
                      <input
                        type="text"
                        value={newGoalName}
                        onChange={(e) => setNewGoalName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Doelnaam..."
                        autoFocus
                      />
                      <textarea
                        value={newGoalDescription}
                        onChange={(e) => setNewGoalDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Beschrijving van het doel..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newGoalName.trim()) {
                              handleAddNewCluster(newGoalName.trim(), newGoalDescription.trim());
                              setNewGoalName("");
                              setNewGoalDescription("");
                              setIsAddingGoal(false);
                            }
                          }}
                          disabled={!newGoalName.trim()}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Toevoegen
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingGoal(false);
                            setNewGoalName("");
                            setNewGoalDescription("");
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingGoal(true)}
                      className="w-full p-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:border-green-500 hover:bg-green-50 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nieuw doel toevoegen
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Async feedback button */}
            {!isReadOnly && currentSession && clusters.length > 0 && (
              <AsyncFeedbackSection
                sessionId={currentSession.id}
                sourceData={clusters.map(c => ({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  goals: c.goals || []
                }))}
                stepType="doelen"
                showToast={showToast}
              />
            )}

            {/* Keuze: Direct gebruiken of shortlist stemronde */}
            {useShortlistVoting === null && !isReadOnly && (
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

            {useShortlistVoting === true && !isReadOnly && (
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
            {/* Timer for individual voting - per person */}
            <ActivityTimer
              mode={TIMER_PRESETS.doelen_voting.mode}
              duration={TIMER_PRESETS.doelen_voting.duration}
              label={`${currentVoter}: ${TIMER_PRESETS.doelen_voting.label}`}
              showModeHelper
            />

            {/* Async voting option */}
            {!isReadOnly && currentSession && (
              <AsyncDotVotingSection sessionId={currentSession.id} />
            )}

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Dot Voting {!isReadOnly && <span className="text-sm font-normal text-gray-500">(facilitator-gestuurd)</span>}
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

              {isReadOnly ? (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-700 text-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Bekijk de doelen hieronder - denk alvast na over je prioriteiten!
                    </p>
                  </div>
                  {/* Show clusters in read-only mode so viewers can think ahead */}
                  <div className="space-y-3">
                    {clusters.map((cluster, index) => (
                      <div key={cluster.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-cito-blue text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{cluster.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{cluster.description}</p>
                            {cluster.goals.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                {cluster.goals.length} gerelateerde doelen
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <DotVoting
                  clusters={clusters}
                  totalDots={5}
                  currentVotes={votes}
                  onVotesChange={handleVotesChange}
                  voterName={currentVoter}
                />
              )}
            </div>

            {/* Results preview */}
            {Object.keys(allVotes).length > 0 && (
              <div className="card">
                <DotVotingResults clusters={clusters} allVotes={allVotes} />
              </div>
            )}

            {!isReadOnly && (
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
            )}
          </div>
        )}

        {/* Phase: Ranking */}
        {phase === "ranking" && (
          <div className="space-y-6">
            {/* Timer for ranking discussion */}
            <ActivityTimer
              mode={TIMER_PRESETS.doelen_ranking.mode}
              duration={TIMER_PRESETS.doelen_ranking.duration}
              label={TIMER_PRESETS.doelen_ranking.label}
              showModeHelper
            />

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

            {!isReadOnly && (
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
            )}
          </div>
        )}

        {/* Phase: Formulation */}
        {phase === "formulation" && (
          <div className="space-y-6">
            {/* Timer for final formulation */}
            <ActivityTimer
              mode={TIMER_PRESETS.doelen_formulation.mode}
              duration={TIMER_PRESETS.doelen_formulation.duration}
              label={TIMER_PRESETS.doelen_formulation.label}
              showModeHelper
            />

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

                          {/* Show subdoelen if present */}
                          {cluster.subGoals && cluster.subGoals.length > 0 && (
                            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-blue-800">
                                  Subdoelen ({cluster.subGoals.length}):
                                </p>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleRegenerateFormulation(cluster.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                  >
                                    Voeg toe aan formulering
                                  </button>
                                )}
                              </div>
                              <ul className="text-xs text-blue-700 space-y-0.5">
                                {cluster.subGoals.map((sg, sgIdx) => (
                                  <li key={sg.id}>
                                    {sgIdx + 1}. {sg.name}
                                    {sg.description && <span className="text-blue-500"> - {sg.description}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <textarea
                            id={`formulation-${cluster.id}`}
                            value={formulations[cluster.id] || ""}
                            onChange={(e) =>
                              handleFormulationChange(cluster.id, e.target.value)
                            }
                            rows={cluster.subGoals && cluster.subGoals.length > 0 ? 6 : 3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue resize-none"
                            placeholder="Beschrijf het doel..."
                          />
                          <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                            <p className="text-xs text-gray-500">
                              Gebaseerd op input van{" "}
                              {cluster.goals.length} respondent
                              {cluster.goals.length > 1 ? "en" : ""}
                              {cluster.subGoals && cluster.subGoals.length > 0 && (
                                <span className="text-blue-600"> + {cluster.subGoals.length} subdoel{cluster.subGoals.length > 1 ? "en" : ""}</span>
                              )}
                            </p>
                            <div className="flex gap-2">
                              <RefineWithAI
                                currentText={formulations[cluster.id] || `${cluster.name}: ${cluster.description}`}
                                context={`Herformuleer dit doel volledig tot een heldere, professionele formulering. Huidige titel: ${cluster.name}. Beschrijving: ${cluster.description}.${cluster.subGoals && cluster.subGoals.length > 0 ? ` Subdoelen die MOETEN worden meegenomen: ${cluster.subGoals.map(sg => `${sg.name}${sg.description ? ` (${sg.description})` : ""}`).join("; ")}.` : ""} Maak een samenhangende formulering die titel, beschrijving en alle subdoelen integreert.`}
                                onRefined={(newFormulation) => {
                                  handleFormulationChange(cluster.id, newFormulation);
                                  showToast("Formulering verfijnd met AI", "success");
                                }}
                                label="Herformuleer volledig"
                                undoKey={`goal-formulation-${cluster.id}`}
                              />
                              <RefineWithAI
                                currentText={cluster.name}
                                context={`Dit is de titel van doel ${index + 1}. Beschrijving: ${cluster.description}.${cluster.subGoals && cluster.subGoals.length > 0 ? ` Subdoelen: ${cluster.subGoals.map(sg => sg.name).join(", ")}.` : ""} Huidige formulering: ${formulations[cluster.id] || ""}. Verfijn ALLEEN de titel (max 5-6 woorden), niet de beschrijving.`}
                                onRefined={(newTitle) => {
                                  handleEditClusterName(cluster.id, newTitle);
                                  const oldFormulation = formulations[cluster.id] || "";
                                  if (oldFormulation.startsWith(cluster.name)) {
                                    handleFormulationChange(cluster.id, oldFormulation.replace(cluster.name, newTitle));
                                  }
                                  showToast("Titel verfijnd en opgeslagen", "success");
                                }}
                                label="Verfijn titel"
                                undoKey={`goal-title-${cluster.id}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex justify-between">
                <button
                  onClick={() => guardNavigation(() => { setPhase("ranking"); setIsDirty(false); })}
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
            )}
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

            {!isReadOnly && (
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    // Remove all approved goals
                    const goalKeys = ["goal_1", "goal_2", "goal_3", "goal_4", "goal_5"] as const;
                    goalKeys.forEach((key) => {
                      if (getApprovedText(key)) removeApprovedText(key);
                    });
                    setPhase("formulation");
                    showToast("Doelen vrijgegeven voor bewerking", "info");
                  }}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Bewerken
                </button>
                <button
                  onClick={onComplete}
                  className="btn btn-primary flex items-center gap-2"
                >
                  Volgende stap
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
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

// === Regeneration Comparison View ===
function RegenerationComparison({
  oldClusters,
  newClusters,
  onAcceptSelected,
  onAcceptAll,
  onDismiss
}: {
  oldClusters: GoalClusterType[];
  newClusters: GoalClusterType[];
  onAcceptSelected: (selectedIds: string[]) => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(newClusters.map(c => c.id));
  const selectNone = () => setSelectedIds([]);

  // Try to match old and new clusters by name similarity
  const matchedPairs = newClusters.map(newC => {
    const bestMatch = oldClusters.find(oldC => {
      const oldWords = oldC.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const newWords = newC.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const overlap = oldWords.filter(w => newWords.some(nw => nw.includes(w) || w.includes(nw)));
      return overlap.length >= Math.min(2, oldWords.length);
    });
    return { newCluster: newC, matchedOld: bestMatch || null };
  });

  const unmatchedOld = oldClusters.filter(
    oldC => !matchedPairs.some(p => p.matchedOld?.id === oldC.id)
  );

  return (
    <div className="card border-2 border-indigo-300 bg-indigo-50/30">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="font-bold text-gray-900">Doelen opnieuw geanalyseerd met Claude 4.6</h3>
      </div>

      {/* Stats comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Vorige versie</p>
          <p className="text-lg font-bold text-gray-700">{oldClusters.length} clusters</p>
        </div>
        <div className="p-3 bg-white rounded-lg border border-indigo-200">
          <p className="text-xs font-medium text-indigo-600 uppercase mb-1">Claude 4.6</p>
          <p className="text-lg font-bold text-indigo-700">{newClusters.length} clusters</p>
          {selectedIds.length > 0 && (
            <p className="text-xs text-indigo-500 mt-1">{selectedIds.length} geselecteerd</p>
          )}
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Left: Old clusters */}
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase">Vorige versie</h4>
          <div className="space-y-2">
            {oldClusters.map((cluster, i) => (
              <div key={cluster.id} className="p-3 bg-white border rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-gray-400 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{cluster.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cluster.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{cluster.goals.length} respondent(en)</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: New clusters - with checkboxes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-indigo-600 uppercase">Claude 4.6</h4>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">Alles</button>
              <span className="text-xs text-gray-300">|</span>
              <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">Geen</button>
            </div>
          </div>
          <div className="space-y-2">
            {matchedPairs.map(({ newCluster, matchedOld }, i) => {
              const isSelected = selectedIds.includes(newCluster.id);
              return (
                <div
                  key={newCluster.id}
                  onClick={() => toggleSelect(newCluster.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50"
                      : matchedOld
                        ? matchedOld.description !== newCluster.description
                          ? "bg-amber-50 border-amber-200 hover:border-indigo-300"
                          : "bg-white hover:border-indigo-300"
                        : "bg-green-50 border-green-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300"
                    />
                    <span className="text-xs font-bold text-gray-400 mt-0.5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 text-sm">{newCluster.name}</p>
                        {matchedOld ? (
                          matchedOld.description !== newCluster.description && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">herschreven</span>
                          )
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 text-green-700">nieuw</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{newCluster.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{newCluster.goals.length} respondent(en)</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unmatched old clusters note */}
      {unmatchedOld.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 font-medium mb-1">
            {unmatchedOld.length} doel{unmatchedOld.length !== 1 ? "en" : ""} uit de vorige versie {unmatchedOld.length !== 1 ? "komen" : "komt"} niet terug in de nieuwe analyse.
            Bij &quot;Geselecteerde toevoegen&quot; blijven je huidige doelen behouden.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-xs text-gray-500">
          De oude versie wordt bewaard in de versiegeschiedenis.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          >
            Sluiten
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={() => onAcceptSelected(selectedIds)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {selectedIds.length} geselecteerde toevoegen
            </button>
          )}
          <button
            onClick={onAcceptAll}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Alles vervangen
          </button>
        </div>
      </div>
    </div>
  );
}

// === Async Dot Voting Section ===
function AsyncDotVotingSection({ sessionId }: { sessionId: string }) {
  const [votingUrl, setVotingUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Always show the URL since the stemmen page handles everything
    setVotingUrl(`${window.location.origin}/sessies/${sessionId}/stemmen`);
  }, [sessionId]);

  const handleCopy = () => {
    if (!votingUrl) return;
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
          <h3 className="font-semibold text-gray-900 mb-1">Async Dot Voting</h3>
          <p className="text-sm text-gray-600 mb-3">
            Laat MT-leden op hun eigen laptop stemmen. Deel de link en volg de voortgang live.
          </p>
          {votingUrl && (
            <div className="space-y-2">
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
              <a
                href={votingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:underline inline-flex items-center gap-1"
              >
                Open stempagina (facilitator dashboard)
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

