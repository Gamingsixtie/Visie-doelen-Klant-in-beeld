"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { MemberSelector } from "@/components/feedback";
import { DotVoting, DotVotingResults } from "@/components/doelen";
import type { GoalClusterType } from "@/components/doelen";
import { MT_MEMBERS, FACILITATOR_NAME } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import * as dotVotingService from "@/lib/dot-voting-service";

const TOTAL_DOTS = 5;

export default function StemmenPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [currentMember, setCurrentMember] = useState<string | null>(null);
  const [clusters, setClusters] = useState<GoalClusterType[]>([]);
  const [sessionName, setSessionName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-member votes (local + server)
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  // All votes for facilitator view
  const [allVotes, setAllVotes] = useState<Record<string, Record<string, number>>>({});
  // Ready members
  const [readyMembers, setReadyMembers] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isFacilitator = currentMember === FACILITATOR_NAME;

  // Load session data
  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      if (!supabase) {
        setError("Database niet geconfigureerd");
        return;
      }

      // Get session
      const { data: session } = await supabase
        .from("sessions")
        .select("name, flow_state")
        .eq("id", sessionId)
        .single();

      if (!session) {
        setError("Sessie niet gevonden");
        return;
      }

      setSessionName(session.name);

      // Extract goal clusters from flow_state
      const flowState = session.flow_state as Record<string, unknown>;
      const doelenState = (flowState?.doelen || {}) as Record<string, unknown>;
      const goalClusters = (doelenState?.goalClusters || []) as GoalClusterType[];

      if (goalClusters.length === 0) {
        setError("Geen doelen gevonden. Genereer eerst doelen in de doelen-stap.");
        return;
      }

      setClusters(goalClusters);

      // Load all votes and ready status
      const [votes, ready] = await Promise.all([
        dotVotingService.getAllVotesMap(sessionId),
        dotVotingService.getReadyMembers(sessionId)
      ]);

      setAllVotes(votes);
      setReadyMembers(ready);

      // Load current member's votes if selected
      if (currentMember && !isFacilitator) {
        setMyVotes(votes[currentMember] || {});
        setIsReady(ready.includes(currentMember));
      }
    } catch (err) {
      console.error("Error loading stemmen data:", err);
      setError("Fout bij laden");
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, [sessionId, currentMember, isFacilitator]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSelectMember = (name: string) => {
    setCurrentMember(name);
  };

  // Handle vote change (called by DotVoting component)
  const handleVotesChange = async (newVotes: Record<string, number>) => {
    if (!currentMember || isFacilitator) return;

    setMyVotes(newVotes);

    // Sync each changed cluster to Supabase
    const allClusterIds = clusters.map(c => c.id);
    for (const clusterId of allClusterIds) {
      const newDots = newVotes[clusterId] || 0;
      const oldDots = myVotes[clusterId] || 0;
      if (newDots !== oldDots) {
        await dotVotingService.upsertDotVote(sessionId, currentMember, clusterId, newDots);
      }
    }

    // Update allVotes locally
    setAllVotes(prev => ({
      ...prev,
      [currentMember]: newVotes
    }));

    // Unmark ready if they change votes after marking ready
    if (isReady) {
      await dotVotingService.unmarkVotingReady(sessionId, currentMember);
      setIsReady(false);
      setReadyMembers(prev => prev.filter(m => m !== currentMember));
    }
  };

  const handleToggleReady = async () => {
    if (!currentMember || isFacilitator) return;

    if (isReady) {
      await dotVotingService.unmarkVotingReady(sessionId, currentMember);
      setIsReady(false);
      setReadyMembers(prev => prev.filter(m => m !== currentMember));
    } else {
      await dotVotingService.markVotingReady(sessionId, currentMember);
      setIsReady(true);
      setReadyMembers(prev => [...prev, currentMember]);
    }
  };

  // Facilitator: close voting and import to session
  const handleCloseVoting = async () => {
    if (!isFacilitator || !supabase) return;

    // Get fresh votes
    const freshVotes = await dotVotingService.getAllVotesMap(sessionId);

    // Update session flow_state with allVotes
    const { data: session } = await supabase
      .from("sessions")
      .select("flow_state")
      .eq("id", sessionId)
      .single();

    if (!session) return;

    const flowState = session.flow_state as Record<string, unknown>;
    const doelenState = (flowState?.doelen || {}) as Record<string, unknown>;
    const goalClusters = (doelenState?.goalClusters || []) as GoalClusterType[];

    // Aggregate votes into cluster.votes totals
    const voteTotals: Record<string, number> = {};
    Object.values(freshVotes).forEach(memberVotes => {
      Object.entries(memberVotes).forEach(([clusterId, dots]) => {
        voteTotals[clusterId] = (voteTotals[clusterId] || 0) + dots;
      });
    });

    const updatedClusters = goalClusters.map(c => ({
      ...c,
      votes: voteTotals[c.id] || 0
    }));

    await supabase
      .from("sessions")
      .update({
        flow_state: {
          ...flowState,
          doelen: {
            ...doelenState,
            goalClusters: updatedClusters,
            allVotes: freshVotes,
            phase: "voting" // Keep in voting phase so DoelenStep can proceed to ranking
          }
        }
      })
      .eq("id", sessionId);

    router.push(`/sessies/${sessionId}`);
  };

  // Facilitator: reset all votes
  const handleResetVoting = async () => {
    if (!isFacilitator) return;
    const success = await dotVotingService.resetDotVoting(sessionId);
    if (success) {
      setAllVotes({});
      setReadyMembers([]);
      setMyVotes({});
      setIsReady(false);
    }
  };

  // Member selector
  if (!currentMember) {
    return <MemberSelector onSelect={handleSelectMember} sessionName={sessionName || "Dot Voting"} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-3" />
          <p className="text-gray-600">Stemronde laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Fout</h2>
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

  // Count stats
  const membersWhoVoted = Object.keys(allVotes).filter(m => {
    const v = allVotes[m];
    return v && Object.values(v).reduce((s, d) => s + d, 0) > 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Dot Voting</h1>
              {sessionName && <p className="text-sm text-gray-500">{sessionName}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                Stemronde
              </span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>{lastRefresh.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <button
                onClick={() => setCurrentMember(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200"
              >
                <div className="w-6 h-6 rounded-full bg-cito-blue text-white font-bold flex items-center justify-center text-xs">
                  {currentMember.charAt(0)}
                </div>
                {currentMember}
                {isFacilitator && <span className="text-xs text-cito-blue font-medium">(facilitator)</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Facilitator view */}
        {isFacilitator ? (
          <>
            {/* Progress dashboard */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Voortgang</h2>
                <span className="text-sm text-gray-600">
                  {membersWhoVoted.length}/{MT_MEMBERS.length} leden gestemd
                </span>
              </div>
              <div className="space-y-2">
                {MT_MEMBERS.map(name => {
                  const memberVotes = allVotes[name] || {};
                  const totalUsed = Object.values(memberVotes).reduce((s, d) => s + d, 0);
                  const memberIsReady = readyMembers.includes(name);
                  return (
                    <div key={name} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {memberIsReady ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        ) : totalUsed > 0 ? (
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-cito-blue" />
                          </div>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className={`text-sm ${memberIsReady ? "text-green-700 font-medium" : "text-gray-700"}`}>
                          {name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalUsed > 0 && (
                          <span className="text-sm text-gray-500">{totalUsed}/{TOTAL_DOTS} punten</span>
                        )}
                        {memberIsReady && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">klaar</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live results */}
            {membersWhoVoted.length > 0 && (
              <div className="card p-4">
                <h2 className="font-semibold text-gray-800 mb-3">Tussenstand</h2>
                <DotVotingResults clusters={clusters} allVotes={allVotes} />
              </div>
            )}

            {/* Facilitator actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseVoting}
                disabled={membersWhoVoted.length === 0}
                className="px-4 py-2.5 bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Stemronde afsluiten en overnemen
              </button>
              <button
                onClick={handleResetVoting}
                className="px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Reset alle stemmen
              </button>
            </div>
          </>
        ) : (
          /* MT member view */
          <>
            <DotVoting
              clusters={clusters}
              totalDots={TOTAL_DOTS}
              onVotesChange={handleVotesChange}
              currentVotes={myVotes}
              voterName={currentMember}
            />
          </>
        )}
      </div>

      {/* Sticky footer for MT members - Klaar button */}
      {!isFacilitator && currentMember && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isReady
                ? "Je hebt aangegeven dat je klaar bent met stemmen."
                : "Klaar met het verdelen van je punten?"
              }
            </div>
            <button
              onClick={handleToggleReady}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                isReady
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-cito-blue text-white hover:bg-blue-800"
              }`}
            >
              {isReady ? (
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
                  Klaar met stemmen
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
