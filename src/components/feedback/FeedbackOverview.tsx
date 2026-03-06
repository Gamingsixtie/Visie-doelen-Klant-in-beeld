"use client";

import type { FeedbackSuggestion, SuggestionVote, FeedbackPhase } from "@/lib/feedback-service";
import { MT_MEMBERS } from "@/lib/types";

interface ClusterData {
  id: string;
  name: string;
  description: string;
  goals: Array<{ id: string; respondentName: string; text: string; rank: number }>;
}

interface FeedbackOverviewProps {
  clusters: ClusterData[];
  suggestions: FeedbackSuggestion[];
  votes: SuggestionVote[];
  isRoundClosed?: boolean;
  phase?: FeedbackPhase;
  facilitatorName?: string | null;
  memberReady?: string[];
}

export function FeedbackOverview({ clusters, suggestions, votes, isRoundClosed, phase, facilitatorName, memberReady = [] }: FeedbackOverviewProps) {
  const effectiveIsRoundClosed = phase ? phase === "approved" : !!isRoundClosed;
  // Participation stats
  const membersWithFeedback = new Set(suggestions.map(s => s.member_name));
  const totalMembers = MT_MEMBERS.length;

  // Per-cluster stats
  const clusterStats = clusters.map(cluster => {
    const clusterSuggestions = suggestions.filter(s => s.cluster_id === cluster.id);
    const commentCount = clusterSuggestions.filter(s => s.suggestion_type === "comment").length;
    const editCount = clusterSuggestions.filter(s => s.suggestion_type === "text_edit").length;
    const mergeCount = clusterSuggestions.filter(s => s.suggestion_type === "merge").length;

    // Calculate consensus: ratio of accepts vs rejects
    const suggestionIds = clusterSuggestions.map(s => s.id);
    const clusterVotes = votes.filter(v => suggestionIds.includes(v.suggestion_id));
    const accepts = clusterVotes.filter(v => v.value === "accept").length;
    const rejects = clusterVotes.filter(v => v.value === "reject").length;

    return {
      cluster,
      totalSuggestions: clusterSuggestions.length,
      commentCount,
      editCount,
      mergeCount,
      accepts,
      rejects,
      contributors: new Set(clusterSuggestions.map(s => s.member_name)).size
    };
  });

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`p-4 rounded-xl border ${effectiveIsRoundClosed ? "bg-gray-50 border-gray-300" : "bg-green-50 border-green-200"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${effectiveIsRoundClosed ? "bg-gray-400" : "bg-green-500 animate-pulse"}`} />
            <span className="font-medium text-gray-800">
              {phase === "collecting" && "Feedback verzamelen"}
              {phase === "consolidating" && "AI consolideert feedback..."}
              {phase === "voting" && "Stemronde actief"}
              {phase === "approved" && "Feedbackronde afgerond"}
              {!phase && (effectiveIsRoundClosed ? "Feedbackronde gesloten" : "Feedbackronde actief")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {facilitatorName && <span>Facilitator: {facilitatorName}</span>}
            <span>{membersWithFeedback.size} van {totalMembers} leden hebben feedback gegeven</span>
          </div>
        </div>
      </div>

      {/* Participation */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Deelname</h3>
          {memberReady.length > 0 && (
            <span className="text-sm text-green-700 font-medium">
              {memberReady.length}/{totalMembers} klaar
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {MT_MEMBERS.map(name => {
            const hasFeedback = membersWithFeedback.has(name);
            const isReady = memberReady.includes(name);
            return (
              <div
                key={name}
                className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${
                  isReady
                    ? "bg-green-100 text-green-700 border-2 border-green-400"
                    : hasFeedback
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}
              >
                {isReady ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                ) : hasFeedback ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {name}
                {isReady && <span className="text-xs font-medium">klaar</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cluster overview */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Doelen overzicht</h3>
        <div className="space-y-3">
          {clusterStats.map(({ cluster, totalSuggestions, commentCount, editCount, mergeCount, accepts, rejects, contributors }) => (
            <div key={cluster.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{cluster.name}</h4>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{cluster.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {totalSuggestions > 0 ? (
                    <span className="px-2 py-0.5 bg-cito-light-blue text-cito-blue text-xs rounded-full font-medium">
                      {totalSuggestions} suggestie{totalSuggestions !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                      Geen feedback
                    </span>
                  )}
                </div>
              </div>

              {totalSuggestions > 0 && (
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  {commentCount > 0 && <span>{commentCount} opmerking{commentCount !== 1 ? "en" : ""}</span>}
                  {editCount > 0 && <span>{editCount} tekstwijziging{editCount !== 1 ? "en" : ""}</span>}
                  {mergeCount > 0 && <span>{mergeCount} samenvoeg-suggestie{mergeCount !== 1 ? "s" : ""}</span>}
                  <span className="text-gray-400">|</span>
                  <span>{contributors} bijdrager{contributors !== 1 ? "s" : ""}</span>
                  {(accepts > 0 || rejects > 0) && (
                    <>
                      <span className="text-gray-400">|</span>
                      {accepts > 0 && <span className="text-green-600">{accepts}x akkoord</span>}
                      {rejects > 0 && <span className="text-red-600">{rejects}x afwijzen</span>}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-cito-blue">{suggestions.length}</div>
          <div className="text-sm text-gray-500">Suggesties totaal</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{votes.filter(v => v.value === "accept").length}</div>
          <div className="text-sm text-gray-500">Akkoord stemmen</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{votes.filter(v => v.value === "reject").length}</div>
          <div className="text-sm text-gray-500">Afwijzen stemmen</div>
        </div>
      </div>
    </div>
  );
}
