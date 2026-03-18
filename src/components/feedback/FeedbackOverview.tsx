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
  // Suggestion edit/delete for facilitator
  onEditSuggestion?: (suggestionId: string, content: Record<string, unknown>) => void;
  onDeleteSuggestion?: (suggestionId: string) => void;
  // Per-suggestion selection
  selectedSuggestionIds?: string[];
  onToggleSuggestion?: (suggestionId: string) => void;
  onSelectAllSuggestions?: () => void;
  onDeselectAllSuggestions?: () => void;
  // AI instructions per suggestion (for comments)
  suggestionInstructions?: Record<string, string>;
  onUpdateInstruction?: (suggestionId: string, instruction: string) => void;
}

const TYPE_CONFIG: { type: SuggestionType; label: string; icon: string; color: string; bgColor: string; badgeClass: string }[] = [
  { type: "text_edit", label: "Tekstwijzigingen", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", badgeClass: "bg-blue-100 text-blue-700" },
  { type: "merge", label: "Samenvoegen", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", badgeClass: "bg-purple-100 text-purple-700" },
  { type: "comment", label: "Opmerkingen", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", badgeClass: "bg-amber-100 text-amber-700" },
];

function getTypeConfig(type: string) {
  return TYPE_CONFIG.find(t => t.type === type) || TYPE_CONFIG[2];
}

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
  onEditSuggestion,
  onDeleteSuggestion,
  selectedSuggestionIds = [],
  onToggleSuggestion,
  onSelectAllSuggestions,
  onDeselectAllSuggestions,
  suggestionInstructions = {},
  onUpdateInstruction,
}: FeedbackOverviewProps) {
  const [showDismissed, setShowDismissed] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, unknown>>({});

  const effectiveIsRoundClosed = phase ? phase === "approved" : !!isRoundClosed;
  const membersWithFeedback = new Set(suggestions.map(s => s.member_name));
  const totalMembers = MT_MEMBERS.length;

  const toggleExpanded = (clusterId: string) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  // Per-cluster stats
  const clusterStats = clusters.map(cluster => {
    const clusterSuggestions = suggestions.filter(s => s.cluster_id === cluster.id);
    const commentCount = clusterSuggestions.filter(s => s.suggestion_type === "comment").length;
    const editCount = clusterSuggestions.filter(s => s.suggestion_type === "text_edit").length;
    const mergeCount = clusterSuggestions.filter(s => s.suggestion_type === "merge").length;

    const filteredSuggestions = clusterSuggestions.filter(s =>
      activeTypeFilters.includes(s.suggestion_type as SuggestionType)
    );

    const suggestionIds = clusterSuggestions.map(s => s.id);
    const clusterVotes = votes.filter(v => suggestionIds.includes(v.suggestion_id));
    const accepts = clusterVotes.filter(v => v.value === "accept").length;
    const rejects = clusterVotes.filter(v => v.value === "reject").length;

    const isDismissed = dismissedClusterIds.includes(cluster.id);
    const isSelected = selectedClusterIds.includes(cluster.id);
    const selectedInCluster = filteredSuggestions.filter(s => selectedSuggestionIds.includes(s.id)).length;

    return {
      cluster,
      totalSuggestions: clusterSuggestions.length,
      filteredSuggestions,
      filteredCount: filteredSuggestions.length,
      selectedInCluster,
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
  const totalSelectedSuggestions = selectedSuggestionIds.length;

  // Start/save/cancel editing
  const startEdit = (suggestion: FeedbackSuggestion) => {
    setEditingSuggestionId(suggestion.id);
    setEditContent({ ...(suggestion.content as Record<string, unknown>) });
  };
  const cancelEdit = () => { setEditingSuggestionId(null); setEditContent({}); };
  const saveEdit = (suggestionId: string) => {
    if (onEditSuggestion) onEditSuggestion(suggestionId, editContent);
    setEditingSuggestionId(null);
    setEditContent({});
  };

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
            <span className="text-sm text-green-700 font-medium">{memberReady.length}/{totalMembers} klaar</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {MT_MEMBERS.map(name => {
            const hasFeedback = membersWithFeedback.has(name);
            const isReady = memberReady.includes(name);
            return (
              <div key={name} className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${
                isReady ? "bg-green-100 text-green-700 border-2 border-green-400"
                  : hasFeedback ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}>
                {isReady ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                ) : hasFeedback ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                    isActive ? `${bgColor} ${color} ring-2 ring-offset-1 ring-current` : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                  {label}
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? "bg-white/60" : "bg-gray-100"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">
            Selecteer welke types feedback je wilt consolideren. Klik om aan/uit te zetten.
          </p>
        </div>
      )}

      {/* Cluster overview with expandable suggestions */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Doelen overzicht</h3>
          <div className="flex items-center gap-2">
            {isFacilitator && phase === "collecting" && onSelectAll && onDeselectAll && (
              <>
                <span className="text-sm text-gray-500">{selectedCount}/{visibleStats.length} doelen</span>
                <button onClick={onSelectAll} className="text-xs text-cito-blue hover:underline">Alle doelen</button>
                <span className="text-gray-300">|</span>
              </>
            )}
            {isFacilitator && phase === "collecting" && onSelectAllSuggestions && onDeselectAllSuggestions && (
              <>
                <span className="text-sm text-gray-500">{totalSelectedSuggestions} suggesties</span>
                <button onClick={onSelectAllSuggestions} className="text-xs text-cito-blue hover:underline">Alle suggesties</button>
                <button onClick={onDeselectAllSuggestions} className="text-xs text-gray-500 hover:underline ml-1">Geen</button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {visibleStats.map(({ cluster, totalSuggestions, filteredSuggestions, filteredCount, selectedInCluster, commentCount, editCount, mergeCount, contributors, isSelected }) => {
            const isSelectable = isFacilitator && phase === "collecting" && onToggleCluster;
            const isExpanded = expandedClusters.has(cluster.id);

            return (
              <div
                key={cluster.id}
                className={`border rounded-lg transition-all overflow-hidden ${
                  isSelectable
                    ? isSelected ? "border-cito-blue bg-blue-50/30 ring-1 ring-cito-blue/30" : "border-gray-200"
                    : "border-gray-200"
                }`}
              >
                {/* Cluster header */}
                <div
                  className={`p-3 flex items-start justify-between ${isSelectable ? "cursor-pointer hover:bg-gray-50/50" : ""} ${isExpanded ? "border-b border-gray-100" : ""}`}
                  onClick={() => isSelectable && onToggleCluster(cluster.id)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {isSelectable && (
                      <div className="pt-0.5">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "bg-cito-blue border-cito-blue" : "bg-white border-gray-300"
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
                    {totalSuggestions > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(cluster.id); }}
                        className={`px-2 py-0.5 text-xs rounded-full font-medium flex items-center gap-1 transition-colors ${
                          selectedInCluster > 0 ? "bg-cito-light-blue text-cito-blue hover:bg-blue-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {isFacilitator ? `${selectedInCluster}/${filteredCount}` : filteredCount} suggestie{filteredCount !== 1 ? "s" : ""}
                        <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                    {totalSuggestions === 0 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Geen feedback</span>
                    )}
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

                {/* Type breakdown (collapsed) */}
                {!isExpanded && totalSuggestions > 0 && (
                  <div className={`px-3 pb-2 flex flex-wrap gap-3 text-xs text-gray-500 ${isSelectable ? "ml-8" : ""}`}>
                    {commentCount > 0 && <span className={activeTypeFilters.includes("comment") ? "text-amber-600 font-medium" : "text-gray-400"}>{commentCount} opmerking{commentCount !== 1 ? "en" : ""}</span>}
                    {editCount > 0 && <span className={activeTypeFilters.includes("text_edit") ? "text-blue-600 font-medium" : "text-gray-400"}>{editCount} tekstwijziging{editCount !== 1 ? "en" : ""}</span>}
                    {mergeCount > 0 && <span className={activeTypeFilters.includes("merge") ? "text-purple-600 font-medium" : "text-gray-400"}>{mergeCount} samenvoeg-suggestie{mergeCount !== 1 ? "s" : ""}</span>}
                    <span className="text-gray-400">|</span>
                    <span>{contributors} bijdrager{contributors !== 1 ? "s" : ""}</span>
                  </div>
                )}

                {/* Expanded: individual suggestions with selection */}
                {isExpanded && filteredSuggestions.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {filteredSuggestions.map(suggestion => {
                      const content = suggestion.content as Record<string, unknown>;
                      const typeConf = getTypeConfig(suggestion.suggestion_type);
                      const isEditing = editingSuggestionId === suggestion.id;
                      const isSuggestionSelected = selectedSuggestionIds.includes(suggestion.id);
                      const isComment = suggestion.suggestion_type === "comment";
                      const instruction = suggestionInstructions[suggestion.id] || "";

                      return (
                        <div
                          key={suggestion.id}
                          className={`px-4 py-3 transition-colors ${
                            isSuggestionSelected ? "bg-blue-50/40" : "hover:bg-gray-50/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Per-suggestion checkbox */}
                            {isFacilitator && phase === "collecting" && onToggleSuggestion && (
                              <div className="pt-0.5 flex-shrink-0">
                                <button
                                  onClick={() => onToggleSuggestion(suggestion.id)}
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isSuggestionSelected ? "bg-cito-blue border-cito-blue" : "bg-white border-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  {isSuggestionSelected && (
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-medium text-sm text-gray-700">{suggestion.member_name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${typeConf.badgeClass}`}>
                                  {typeConf.type === "text_edit" ? "Tekstwijziging" : typeConf.type === "merge" ? "Samenvoegen" : "Opmerking"}
                                </span>
                              </div>

                              {/* Content: view or edit */}
                              {isEditing ? (
                                <SuggestionEditForm
                                  type={suggestion.suggestion_type as SuggestionType}
                                  content={editContent}
                                  onChange={setEditContent}
                                  onSave={() => saveEdit(suggestion.id)}
                                  onCancel={cancelEdit}
                                />
                              ) : (
                                <SuggestionContentDisplay
                                  type={suggestion.suggestion_type as SuggestionType}
                                  content={content}
                                  clusterName={cluster.name}
                                  clusterDescription={cluster.description}
                                />
                              )}

                              {/* AI instruction field for comments */}
                              {isComment && isSuggestionSelected && isFacilitator && phase === "collecting" && onUpdateInstruction && !isEditing && (
                                <div className="mt-2 pl-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <svg className="w-3.5 h-3.5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <span className="text-xs font-medium text-cito-blue">Hoe moet de AI deze opmerking verwerken?</span>
                                  </div>
                                  <input
                                    type="text"
                                    value={instruction}
                                    onChange={(e) => onUpdateInstruction(suggestion.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Bijv. &quot;Voeg toe als nuancering bij de beschrijving&quot; of &quot;Verwerk in de doelformulering&quot;"
                                    className="w-full px-3 py-1.5 text-sm border border-cito-blue/20 rounded-lg bg-white focus:ring-2 focus:ring-cito-blue/30 focus:outline-none focus:border-cito-blue/40 placeholder:text-gray-400"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            {isFacilitator && phase === "collecting" && !isEditing && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {onEditSuggestion && (
                                  <button
                                    onClick={() => startEdit(suggestion)}
                                    className="p-1.5 rounded text-gray-400 hover:text-cito-blue hover:bg-blue-50 transition-colors"
                                    title="Suggestie bewerken"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                )}
                                {onDeleteSuggestion && (
                                  <button
                                    onClick={() => onDeleteSuggestion(suggestion.id)}
                                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Suggestie verwijderen"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded && filteredSuggestions.length === 0 && totalSuggestions > 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">
                    Geen suggesties van het geselecteerde type voor dit doel.
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
                      {totalSuggestions > 0 && <span className="ml-2 text-xs text-gray-300">({totalSuggestions})</span>}
                    </div>
                    {onRestoreCluster && (
                      <button onClick={() => onRestoreCluster(cluster.id)} className="text-xs text-cito-blue hover:underline">Terugzetten</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection summary */}
      {isFacilitator && phase === "collecting" && totalSelectedSuggestions > 0 && (
        <div className="card p-4 bg-cito-light-blue/30 border-cito-blue/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cito-blue/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-800">{totalSelectedSuggestions} suggestie{totalSelectedSuggestions !== 1 ? "s" : ""} geselecteerd</p>
              <p className="text-sm text-gray-500">uit {selectedCount} doel{selectedCount !== 1 ? "en" : ""}</p>
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

// Read-only suggestion content
function SuggestionContentDisplay({ type, content, clusterName, clusterDescription }: { type: SuggestionType; content: Record<string, unknown>; clusterName?: string; clusterDescription?: string }) {
  switch (type) {
    case "comment":
      return (
        <div className="space-y-1.5">
          {clusterName && (
            <div className="text-xs px-2.5 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500">
              <span className="font-medium text-gray-700">{clusterName}</span>
              {clusterDescription && (
                <span className="text-gray-400"> — {clusterDescription.length > 120 ? clusterDescription.substring(0, 120) + "..." : clusterDescription}</span>
              )}
            </div>
          )}
          <p className="text-sm text-gray-700">{content.text as string}</p>
        </div>
      );
    case "text_edit":
      return (
        <div className="text-sm space-y-1">
          {content.suggested_name !== content.original_name && (
            <p><span className="text-gray-400 line-through mr-1">{content.original_name as string}</span><span className="font-medium text-blue-700">{content.suggested_name as string}</span></p>
          )}
          {content.suggested_description !== content.original_description && (
            <p className="text-gray-600 italic text-xs line-clamp-2">&ldquo;{(content.suggested_description as string).substring(0, 200)}&rdquo;</p>
          )}
          <p className="text-gray-500 text-xs">Reden: {content.reason as string}</p>
        </div>
      );
    case "merge":
      return (
        <div className="text-sm">
          <p className="text-gray-700">Samenvoegen met <span className="font-medium text-purple-700">{content.merge_with_cluster_name as string}</span></p>
          <p className="text-gray-500 text-xs">Reden: {content.reason as string}</p>
        </div>
      );
    default:
      return <p className="text-sm text-gray-500">Onbekend type suggestie</p>;
  }
}

// Edit form
function SuggestionEditForm({ type, content, onChange, onSave, onCancel }: {
  type: SuggestionType; content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void; onSave: () => void; onCancel: () => void;
}) {
  const updateField = (field: string, value: string) => onChange({ ...content, [field]: value });
  return (
    <div className="space-y-2">
      {type === "comment" && (
        <textarea value={(content.text as string) || ""} onChange={(e) => updateField("text", e.target.value)}
          className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white" rows={2} autoFocus />
      )}
      {type === "text_edit" && (
        <>
          <div>
            <label className="text-xs text-gray-500 font-medium">Voorgestelde beschrijving</label>
            <textarea value={(content.suggested_description as string) || ""} onChange={(e) => updateField("suggested_description", e.target.value)}
              className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white" rows={3} autoFocus />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Reden</label>
            <input type="text" value={(content.reason as string) || ""} onChange={(e) => updateField("reason", e.target.value)}
              className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white" />
          </div>
        </>
      )}
      {type === "merge" && (
        <div>
          <label className="text-xs text-gray-500 font-medium">Reden</label>
          <input type="text" value={(content.reason as string) || ""} onChange={(e) => updateField("reason", e.target.value)}
            className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white" autoFocus />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1.5 text-xs bg-cito-blue text-white rounded-lg hover:bg-blue-800">Opslaan</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Annuleren</button>
      </div>
    </div>
  );
}
