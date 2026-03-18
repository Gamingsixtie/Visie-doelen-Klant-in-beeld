"use client";

import { useState } from "react";
import type { FeedbackSuggestion, SuggestionVote, FeedbackPhase, SuggestionType } from "@/lib/feedback-service";
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
  // Facilitator selection props
  isFacilitator?: boolean;
  selectedClusterIds?: string[];
  onToggleCluster?: (clusterId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  dismissedClusterIds?: string[];
  onDismissCluster?: (clusterId: string) => void;
  onRestoreCluster?: (clusterId: string) => void;
  activeTypeFilters?: SuggestionType[];
  onToggleTypeFilter?: (type: SuggestionType) => void;
}

const TYPE_CONFIG: { type: SuggestionType; label: string; icon: string; color: string; bgColor: string }[] = [
  { type: "text_edit", label: "Tekstwijzigingen", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  { type: "merge", label: "Samenvoegen", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  { type: "comment", label: "Opmerkingen", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
];

export function FeedbackOverview({
  clusters,
  suggestions,
  votes,
  isRoundClosed,
  phase,
  facilitatorName,
  memberReady = [],
  isFacilitator = false,
  selectedClusterIds = [],
  onToggleCluster,
  onSelectAll,
  onDeselectAll,
  dismissedClusterIds = [],
  onDismissCluster,
  onRestoreCluster,
  activeTypeFilters = ["text_edit", "merge", "comment"],
  onToggleTypeFilter,
}: FeedbackOverviewProps) {
  const [showDismissed, setShowDismissed] = useState(false);
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

    // Filtered count based on active type filters
    const filteredCount = clusterSuggestions.filter(s =>
      activeTypeFilters.includes(s.suggestion_type as SuggestionType)
    ).length;

    // Calculate consensus
    const suggestionIds = clusterSuggestions.map(s => s.id);
    const clusterVotes = votes.filter(v => suggestionIds.includes(v.suggestion_id));
    const accepts = clusterVotes.filter(v => v.value === "accept").length;
    const rejects = clusterVotes.filter(v => v.value === "reject").length;

    const isDismissed = dismissedClusterIds.includes(cluster.id);
    const isSelected = selectedClusterIds.includes(cluster.id);

    return {
      cluster,
      totalSuggestions: clusterSuggestions.length,
      filteredCount,
      commentCount,
      editCount,
      mergeCount,
      accepts,
      rejects,
      contributors: new Set(clusterSuggestions.map(s => s.member_name)).size,
      isDismissed,
      isSelected,
    };
  });

  const visibleStats = clusterStats.filter(s => !s.isDismissed);
  const dismissedStats = clusterStats.filter(s => s.isDismissed);
  const selectedCount = visibleStats.filter(s => s.isSelected).length;

  // Count suggestions matching current filters across selected clusters
  const selectedFilteredSuggestionCount = suggestions.filter(s => {
    const isInSelectedCluster = selectedClusterIds.includes(s.cluster_id);
    const matchesTypeFilter = activeTypeFilters.includes(s.suggestion_type as SuggestionType);
    const isNotDismissed = !dismissedClusterIds.includes(s.cluster_id);
    return isInSelectedCluster && matchesTypeFilter && isNotDismissed;
  }).length;

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

      {/* Type filters - facilitator only */}
      {isFacilitator && phase === "collecting" && onToggleTypeFilter && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Filter op type feedback</h3>
          <div className="flex flex-wrap gap-2">
            {TYPE_CONFIG.map(({ type, label, icon, color, bgColor }) => {
              const isActive = activeTypeFilters.includes(type);
              const count = suggestions.filter(s => s.suggestion_type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => onToggleTypeFilter(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive
                      ? `${bgColor} ${color} ring-2 ring-offset-1 ring-current`
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                  {label}
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? "bg-white/60" : "bg-gray-100"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">
            Selecteer welke types feedback je wilt consolideren. Klik om aan/uit te zetten.
          </p>
        </div>
      )}

      {/* Cluster selection overview - facilitator only */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Doelen overzicht</h3>
          {isFacilitator && phase === "collecting" && onSelectAll && onDeselectAll && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {selectedCount} van {visibleStats.length} geselecteerd
              </span>
              <button
                onClick={onSelectAll}
                className="text-xs text-cito-blue hover:underline"
              >
                Alles selecteren
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={onDeselectAll}
                className="text-xs text-gray-500 hover:underline"
              >
                Niets selecteren
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {visibleStats.map(({ cluster, totalSuggestions, filteredCount, commentCount, editCount, mergeCount, accepts, rejects, contributors, isSelected }) => {
            const hasMatchingSuggestions = filteredCount > 0;
            const isSelectable = isFacilitator && phase === "collecting" && onToggleCluster;

            return (
              <div
                key={cluster.id}
                className={`p-3 border rounded-lg transition-all ${
                  isSelectable
                    ? isSelected
                      ? "border-cito-blue bg-blue-50/50 ring-1 ring-cito-blue/30 cursor-pointer hover:bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => isSelectable && onToggleCluster(cluster.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox for facilitator */}
                    {isSelectable && (
                      <div className="pt-0.5">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-cito-blue border-cito-blue"
                            : "bg-white border-gray-300"
                        }`}>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800">{cluster.name}</h4>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{cluster.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {totalSuggestions > 0 ? (
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        hasMatchingSuggestions
                          ? "bg-cito-light-blue text-cito-blue"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {isFacilitator && activeTypeFilters.length < 3
                          ? `${filteredCount}/${totalSuggestions}`
                          : totalSuggestions
                        } suggestie{(isFacilitator && activeTypeFilters.length < 3 ? filteredCount : totalSuggestions) !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                        Geen feedback
                      </span>
                    )}

                    {/* Dismiss button for facilitator */}
                    {isFacilitator && phase === "collecting" && onDismissCluster && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDismissCluster(cluster.id); }}
                        className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Verberg dit doel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {totalSuggestions > 0 && (
                  <div className={`flex flex-wrap gap-3 mt-2 text-xs text-gray-500 ${isSelectable ? "ml-8" : ""}`}>
                    {commentCount > 0 && (
                      <span className={activeTypeFilters.includes("comment") ? "text-amber-600 font-medium" : "text-gray-400"}>
                        {commentCount} opmerking{commentCount !== 1 ? "en" : ""}
                      </span>
                    )}
                    {editCount > 0 && (
                      <span className={activeTypeFilters.includes("text_edit") ? "text-blue-600 font-medium" : "text-gray-400"}>
                        {editCount} tekstwijziging{editCount !== 1 ? "en" : ""}
                      </span>
                    )}
                    {mergeCount > 0 && (
                      <span className={activeTypeFilters.includes("merge") ? "text-purple-600 font-medium" : "text-gray-400"}>
                        {mergeCount} samenvoeg-suggestie{mergeCount !== 1 ? "s" : ""}
                      </span>
                    )}
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
            );
          })}
        </div>

        {/* Dismissed clusters */}
        {dismissedStats.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${showDismissed ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {dismissedStats.length} verborgen doel{dismissedStats.length !== 1 ? "en" : ""}
            </button>

            {showDismissed && (
              <div className="mt-2 space-y-2">
                {dismissedStats.map(({ cluster, totalSuggestions }) => (
                  <div key={cluster.id} className="p-2 border border-dashed border-gray-200 rounded-lg bg-gray-50/50 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-400">{cluster.name}</span>
                      {totalSuggestions > 0 && (
                        <span className="ml-2 text-xs text-gray-300">({totalSuggestions} suggestie{totalSuggestions !== 1 ? "s" : ""})</span>
                      )}
                    </div>
                    {onRestoreCluster && (
                      <button
                        onClick={() => onRestoreCluster(cluster.id)}
                        className="text-xs text-cito-blue hover:underline flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Terugzetten
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection summary for facilitator */}
      {isFacilitator && phase === "collecting" && selectedCount > 0 && (
        <div className="card p-4 bg-cito-light-blue/30 border-cito-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cito-blue/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  {selectedCount} doel{selectedCount !== 1 ? "en" : ""} geselecteerd
                </p>
                <p className="text-sm text-gray-500">
                  {selectedFilteredSuggestionCount} suggestie{selectedFilteredSuggestionCount !== 1 ? "s" : ""} van de geselecteerde types
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
