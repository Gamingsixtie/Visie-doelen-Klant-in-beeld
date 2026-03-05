"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { MemberSelector, ClusterFeedbackCard, FeedbackOverview } from "@/components/feedback";
import { MT_MEMBERS } from "@/lib/types";
import * as feedbackService from "@/lib/feedback-service";
import type { FeedbackRound, FeedbackSuggestion, SuggestionVote, SuggestionType } from "@/lib/feedback-service";
import { supabase } from "@/lib/supabase";

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

  const [currentMember, setCurrentMember] = useState<string | null>(memberParam);
  const [round, setRound] = useState<FeedbackRound | null>(null);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [suggestions, setSuggestions] = useState<FeedbackSuggestion[]>([]);
  const [votes, setVotes] = useState<SuggestionVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | string>("overview");
  const [sessionName, setSessionName] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load session name
  useEffect(() => {
    if (!supabase || !sessionId) return;
    supabase
      .from("sessions")
      .select("name")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        if (data) setSessionName(data.name);
      });
  }, [sessionId]);

  // Load feedback round data
  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const latestRound = await feedbackService.getLatestOpenRound(sessionId);

      // Also check closed rounds if no open round
      if (!latestRound) {
        const allRounds = await feedbackService.getFeedbackRounds(sessionId);
        if (allRounds.length > 0) {
          const mostRecent = allRounds[0]; // Already sorted by created_at desc
          setRound(mostRecent);
          setClusters((mostRecent.source_clusters || []) as ClusterData[]);

          const fullData = await feedbackService.getFullRoundData(mostRecent.id);
          if (fullData) {
            setSuggestions(fullData.suggestions);
            setVotes(fullData.votes);
          }
        } else {
          setError("Geen feedbackronde gevonden voor deze sessie. Start eerst een feedbackronde vanuit de doelen-stap.");
        }
      } else {
        setRound(latestRound);
        setClusters((latestRound.source_clusters || []) as ClusterData[]);

        const fullData = await feedbackService.getFullRoundData(latestRound.id);
        if (fullData) {
          setSuggestions(fullData.suggestions);
          setVotes(fullData.votes);
        }
      }
    } catch (err) {
      console.error("Error loading feedback data:", err);
      setError("Fout bij laden van feedback data");
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, [sessionId]);

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
    // Update URL without full navigation
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
        // Remove existing vote from this member on this suggestion
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
      // Also remove related votes
      setVotes(prev => prev.filter(v => v.suggestion_id !== suggestionId));
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

  const isRoundClosed = round?.status === "closed";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Doelen Feedback</h1>
              {sessionName && <p className="text-sm text-gray-500">{sessionName}</p>}
            </div>
            <div className="flex items-center gap-3">
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
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "overview" ? (
          <FeedbackOverview
            clusters={clusters}
            suggestions={suggestions}
            votes={votes}
            isRoundClosed={isRoundClosed}
          />
        ) : (
          <div className="space-y-4">
            {/* Member header */}
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

            {/* Cluster cards */}
            {clusters.map(cluster => (
              <ClusterFeedbackCard
                key={cluster.id}
                cluster={cluster}
                allClusters={clusters}
                suggestions={suggestions.filter(
                  s => activeTab === currentMember
                    ? true // Show all suggestions when viewing own tab
                    : s.member_name === activeTab || s.cluster_id === cluster.id
                )}
                votes={votes}
                currentMember={currentMember}
                onAddSuggestion={handleAddSuggestion}
                onVoteSuggestion={handleVoteSuggestion}
                onDeleteSuggestion={handleDeleteSuggestion}
                isRoundClosed={isRoundClosed}
              />
            ))}
          </div>
        )}
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
