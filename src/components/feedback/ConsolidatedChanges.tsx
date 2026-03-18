"use client";

import { useState, useMemo } from "react";
import type { ProposedChange, ChangeVote, ChangeVoteValue, FeedbackSuggestion } from "@/lib/feedback-service";
import { MT_MEMBERS } from "@/lib/types";

type ChangeTypeFilter = "edit" | "merge" | "comment_only";
type VoteStatusFilter = "all" | "unvoted" | "disagree" | "agree";
type SortOrder = "default" | "disagree_first" | "unvoted_first";

interface ConsolidatedChangesProps {
  changes: ProposedChange[];
  unchangedClusterIds: string[];
  consolidationSummary: string;
  changeVotes: ChangeVote[];
  currentMember: string;
  onVote: (changeId: string, value: ChangeVoteValue, comment?: string) => void;
  isVotingPhase: boolean;
  isFacilitator?: boolean;
  onEditChange?: (changeId: string, updates: Partial<ProposedChange>) => void;
  onRefineChange?: (changeId: string, feedback: string) => Promise<void>;
  onDeleteChange?: (changeId: string) => void;
  onGenerateProposal?: (changeId: string) => Promise<void>;
  suggestions?: FeedbackSuggestion[];
}

const TYPE_FILTER_CONFIG: { type: ChangeTypeFilter; label: string; icon: string; activeClass: string; inactiveClass: string }[] = [
  { type: "edit", label: "Tekstwijziging", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", activeClass: "bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-offset-1 ring-blue-400", inactiveClass: "bg-gray-50 border-gray-200 text-gray-400" },
  { type: "merge", label: "Samenvoegen", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", activeClass: "bg-purple-50 border-purple-200 text-purple-700 ring-2 ring-offset-1 ring-purple-400", inactiveClass: "bg-gray-50 border-gray-200 text-gray-400" },
  { type: "comment_only", label: "Alleen opmerkingen", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z", activeClass: "bg-gray-100 border-gray-300 text-gray-700 ring-2 ring-offset-1 ring-gray-400", inactiveClass: "bg-gray-50 border-gray-200 text-gray-400" },
];

export function ConsolidatedChanges({
  changes,
  unchangedClusterIds,
  consolidationSummary,
  changeVotes,
  currentMember,
  onVote,
  isVotingPhase,
  isFacilitator,
  onEditChange,
  onRefineChange,
  onDeleteChange,
  onGenerateProposal,
  suggestions
}: ConsolidatedChangesProps) {
  // Filter & sort state
  const [activeTypes, setActiveTypes] = useState<Set<ChangeTypeFilter>>(new Set(["edit", "merge", "comment_only"]));
  const [voteStatusFilter, setVoteStatusFilter] = useState<VoteStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  const resetFilters = () => {
    setActiveTypes(new Set(["edit", "merge", "comment_only"]));
    setVoteStatusFilter("all");
    setSortOrder("default");
  };

  const toggleType = (type: ChangeTypeFilter) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // Classify each change
  const classifiedChanges = useMemo(() => {
    return changes.map(change => {
      const votes = changeVotes.filter(v => v.change_id === change.change_id);
      const myVote = votes.find(v => v.member_name === currentMember);
      const agreeCount = votes.filter(v => v.value === "agree").length;
      const disagreeCount = votes.filter(v => v.value === "disagree").length;
      const hasDisagree = disagreeCount > 0;
      const isUnvoted = !myVote;
      const isAllAgree = agreeCount > 0 && disagreeCount === 0 && votes.length === agreeCount;
      const needsAttention = isUnvoted || hasDisagree;

      return { change, votes, myVote, agreeCount, disagreeCount, hasDisagree, isUnvoted, isAllAgree, needsAttention };
    });
  }, [changes, changeVotes, currentMember]);

  // Type counts (unfiltered)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { edit: 0, merge: 0, comment_only: 0 };
    for (const c of changes) counts[c.change_type] = (counts[c.change_type] || 0) + 1;
    return counts;
  }, [changes]);

  // Vote status counts (after type filter)
  const statusCounts = useMemo(() => {
    const typeFiltered = classifiedChanges.filter(c => activeTypes.has(c.change.change_type as ChangeTypeFilter));
    return {
      all: typeFiltered.length,
      unvoted: typeFiltered.filter(c => c.isUnvoted).length,
      disagree: typeFiltered.filter(c => c.hasDisagree).length,
      agree: typeFiltered.filter(c => c.isAllAgree).length,
    };
  }, [classifiedChanges, activeTypes]);

  // Apply filters and sort
  const filteredAndSorted = useMemo(() => {
    let result = classifiedChanges.filter(c => activeTypes.has(c.change.change_type as ChangeTypeFilter));

    if (voteStatusFilter === "unvoted") result = result.filter(c => c.isUnvoted);
    else if (voteStatusFilter === "disagree") result = result.filter(c => c.hasDisagree);
    else if (voteStatusFilter === "agree") result = result.filter(c => c.isAllAgree);

    if (sortOrder === "disagree_first") {
      result = [...result].sort((a, b) => {
        if (a.hasDisagree && !b.hasDisagree) return -1;
        if (!a.hasDisagree && b.hasDisagree) return 1;
        if (a.isUnvoted && !b.isUnvoted) return -1;
        if (!a.isUnvoted && b.isUnvoted) return 1;
        return 0;
      });
    } else if (sortOrder === "unvoted_first") {
      result = [...result].sort((a, b) => {
        if (a.isUnvoted && !b.isUnvoted) return -1;
        if (!a.isUnvoted && b.isUnvoted) return 1;
        return 0;
      });
    }

    return result;
  }, [classifiedChanges, activeTypes, voteStatusFilter, sortOrder]);

  // Group into attention / resolved
  const attentionChanges = filteredAndSorted.filter(c => c.needsAttention);
  const resolvedChanges = filteredAndSorted.filter(c => !c.needsAttention);
  const showGroups = attentionChanges.length > 0 && resolvedChanges.length > 0;

  const isFiltered = activeTypes.size < 3 || voteStatusFilter !== "all" || sortOrder !== "default";
  const disagreeTotal = classifiedChanges.filter(c => c.hasDisagree).length;
  const unvotedTotal = classifiedChanges.filter(c => c.isUnvoted).length;

  const renderChangeCard = (item: typeof classifiedChanges[0]) => (
    <ChangeCard
      key={item.change.change_id}
      change={item.change}
      votes={item.votes}
      currentMember={currentMember}
      onVote={onVote}
      isVotingPhase={isVotingPhase}
      isFacilitator={isFacilitator}
      onEditChange={onEditChange}
      onRefineChange={onRefineChange}
      onDeleteChange={onDeleteChange}
      onGenerateProposal={onGenerateProposal}
      suggestions={suggestions}
    />
  );

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-800 mb-1">AI Consolidatie</h3>
            <p className="text-sm text-blue-700">{consolidationSummary}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-cito-blue">
            {filteredAndSorted.length}
            {isFiltered && filteredAndSorted.length !== changes.length && (
              <span className="text-sm font-normal text-gray-400">/{changes.length}</span>
            )}
          </div>
          <div className="text-xs text-gray-500">Wijzigingsvoorstellen</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{unchangedClusterIds.length}</div>
          <div className="text-xs text-gray-500">Ongewijzigd</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-gray-600">
            {getVotingProgress(changes, changeVotes)}%
          </div>
          <div className="text-xs text-gray-500">Gestemd</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 space-y-3">
        {/* Type filters */}
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase mb-2">Filter op type</div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTER_CONFIG.map(({ type, label, icon, activeClass, inactiveClass }) => {
              const isActive = activeTypes.has(type);
              const count = typeCounts[type] || 0;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive ? activeClass : inactiveClass
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
        </div>

        {/* Vote status + Sort */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* Vote status filter */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Stemstatus</div>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              {([
                { value: "all" as VoteStatusFilter, label: "Alles" },
                { value: "unvoted" as VoteStatusFilter, label: "Ongestemd" },
                { value: "disagree" as VoteStatusFilter, label: "Bezwaar" },
                { value: "agree" as VoteStatusFilter, label: "Akkoord" },
              ]).map(({ value, label }) => {
                const isActive = voteStatusFilter === value;
                const count = statusCounts[value];
                return (
                  <button
                    key={value}
                    onClick={() => setVoteStatusFilter(value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-gray-200 ${
                      isActive
                        ? "bg-cito-blue text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                    {value !== "all" && count > 0 && (
                      <span className={`ml-1 px-1 py-0.5 text-xs rounded-full ${isActive ? "bg-white/30" : "bg-gray-100"}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Sorteren</div>
            <div className="flex gap-1">
              {([
                { value: "default" as SortOrder, label: "Standaard" },
                { value: "disagree_first" as SortOrder, label: "Bezwaren eerst" },
                { value: "unvoted_first" as SortOrder, label: "Ongestemd eerst" },
              ]).map(({ value, label }) => {
                const isActive = sortOrder === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSortOrder(value)}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                      isActive
                        ? "bg-cito-blue/10 text-cito-blue border-cito-blue/30 font-medium"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Attention banner */}
      {(disagreeTotal > 0 || unvotedTotal > 0) && voteStatusFilter === "all" && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="text-sm">
            <span className="font-medium text-amber-800">
              {disagreeTotal > 0 && `${disagreeTotal} voorstel${disagreeTotal !== 1 ? "len" : ""} met bezwaar`}
              {disagreeTotal > 0 && unvotedTotal > 0 && " · "}
              {unvotedTotal > 0 && `${unvotedTotal} nog niet bestemd`}
            </span>
            <span className="text-amber-600 ml-1">van {changes.length} totaal</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredAndSorted.length === 0 && changes.length > 0 && (
        <div className="p-8 text-center text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <p className="text-sm mb-1">Geen voorstellen gevonden met de huidige filters.</p>
          <button onClick={resetFilters} className="text-xs text-cito-blue hover:underline">
            Filters wissen
          </button>
        </div>
      )}

      {/* Change cards with grouping */}
      {showGroups ? (
        <>
          {/* Needs attention group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-semibold text-amber-800">Actie vereist ({attentionChanges.length})</h3>
              <div className="flex-1 h-px bg-amber-200" />
            </div>
            {attentionChanges.map(renderChangeCard)}
          </div>

          {/* Resolved group */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-green-800">Afgerond ({resolvedChanges.length})</h3>
              <div className="flex-1 h-px bg-green-200" />
            </div>
            {resolvedChanges.map(renderChangeCard)}
          </div>
        </>
      ) : (
        filteredAndSorted.map(renderChangeCard)
      )}

      {/* Unchanged clusters note */}
      {unchangedClusterIds.length > 0 && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
          {unchangedClusterIds.length} doel{unchangedClusterIds.length !== 1 ? "en" : ""} ongewijzigd (geen feedback ontvangen)
        </div>
      )}
    </div>
  );
}

function getVotingProgress(changes: ProposedChange[], votes: ChangeVote[]): number {
  if (changes.length === 0) return 0;
  const totalExpected = changes.length * MT_MEMBERS.length;
  const totalVotes = votes.length;
  return Math.round((totalVotes / totalExpected) * 100);
}

// Individual change card
function ChangeCard({
  change,
  votes,
  currentMember,
  onVote,
  isVotingPhase,
  isFacilitator,
  onEditChange,
  onRefineChange,
  onDeleteChange,
  onGenerateProposal,
  suggestions
}: {
  change: ProposedChange;
  votes: ChangeVote[];
  currentMember: string;
  onVote: (changeId: string, value: ChangeVoteValue, comment?: string) => void;
  isVotingPhase: boolean;
  isFacilitator?: boolean;
  onEditChange?: (changeId: string, updates: Partial<ProposedChange>) => void;
  onRefineChange?: (changeId: string, feedback: string) => Promise<void>;
  onDeleteChange?: (changeId: string) => void;
  onGenerateProposal?: (changeId: string) => Promise<void>;
  suggestions?: FeedbackSuggestion[];
}) {
  const [showCommentFor, setShowCommentFor] = useState<"disagree" | "abstain" | null>(null);
  const [voteComment, setVoteComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editName, setEditName] = useState(change.proposed_name);
  const [editDescription, setEditDescription] = useState(change.proposed_description);
  const [editRationale, setEditRationale] = useState(change.rationale);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const myVote = votes.find(v => v.member_name === currentMember);
  const agreeCount = votes.filter(v => v.value === "agree").length;
  const disagreeCount = votes.filter(v => v.value === "disagree").length;
  const abstainCount = votes.filter(v => v.value === "abstain").length;
  const hasDisagree = disagreeCount > 0;

  const handleVote = (value: ChangeVoteValue) => {
    if (value === "disagree" || value === "abstain") {
      setShowCommentFor(value);
    } else {
      onVote(change.change_id, value);
      setShowCommentFor(null);
    }
  };

  const handleSubmitWithComment = () => {
    if (!showCommentFor) return;
    onVote(change.change_id, showCommentFor, voteComment.trim() || undefined);
    setShowCommentFor(null);
    setVoteComment("");
  };

  const handleSaveEdit = () => {
    if (!onEditChange) return;
    onEditChange(change.change_id, {
      proposed_name: editName,
      proposed_description: editDescription,
      rationale: editRationale
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(change.proposed_name);
    setEditDescription(change.proposed_description);
    setEditRationale(change.rationale);
    setIsEditing(false);
  };

  const handleRefine = async () => {
    if (!onRefineChange || !refineFeedback.trim()) return;
    setIsRefining(true);
    try {
      await onRefineChange(change.change_id, refineFeedback);
      setShowRefineDialog(false);
      setRefineFeedback("");
    } finally {
      setIsRefining(false);
    }
  };

  const nameChanged = change.original_name !== change.proposed_name;
  const descChanged = change.original_description !== change.proposed_description;

  return (
    <div className={`border rounded-xl bg-white shadow-sm overflow-hidden ${
      hasDisagree ? "border-red-200" : agreeCount === MT_MEMBERS.length ? "border-green-300" : ""
    }`}>
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChangeTypeBadge type={change.change_type} />
          <h3 className="font-semibold text-gray-900">{change.summary}</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Facilitator edit buttons */}
          {isFacilitator && onEditChange && !isEditing && !showRefineDialog && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs rounded-lg border border-cito-blue/30 text-cito-blue hover:bg-cito-blue/5 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Bewerk
              </button>
              {onRefineChange && (
                <button
                  onClick={() => setShowRefineDialog(true)}
                  className="px-2 py-1 text-xs rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Verfijn met AI
                </button>
              )}
              {onDeleteChange && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Verwijder
                </button>
              )}
            </>
          )}
          {/* Delete confirmation */}
          {confirmDelete && onDeleteChange && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDeleteChange(change.change_id); setConfirmDelete(false); }}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Bevestig
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300"
              >
                Nee
              </button>
            </div>
          )}
          <ConsentBadge agreeCount={agreeCount} disagreeCount={disagreeCount} totalMembers={MT_MEMBERS.length} totalVotes={agreeCount + disagreeCount + abstainCount} />
        </div>
      </div>

      {/* Inline edit form */}
      {isEditing && (
        <div className="px-5 py-4 bg-cito-blue/5 border-b space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rationale</label>
            <textarea
              value={editRationale}
              onChange={(e) => setEditRationale(e.target.value)}
              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm bg-amber-50/50"
              rows={3}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-0.5 italic">Pas de rationale aan om zinnen beter lopend te maken.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Naam</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beschrijving</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue text-sm"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-cito-blue text-white text-sm rounded-lg hover:bg-blue-800"
            >
              Opslaan
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* AI Refine dialog */}
      {showRefineDialog && (
        <div className="px-5 py-4 bg-purple-50 border-b space-y-3">
          <div>
            <label className="block text-sm font-medium text-purple-800 mb-2">
              Wat wil je aanpassen aan dit voorstel?
            </label>
            <textarea
              value={refineFeedback}
              onChange={(e) => setRefineFeedback(e.target.value)}
              placeholder="Bijv: Maak het concreter, ik zie het toch anders..."
              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              rows={3}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefine}
              disabled={!refineFeedback.trim() || isRefining}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isRefining ? (
                <>
                  <div className="spinner w-4 h-4" />
                  AI verfijnt...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Verfijn
                </>
              )}
            </button>
            <button
              onClick={() => { setShowRefineDialog(false); setRefineFeedback(""); }}
              disabled={isRefining}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Diff view */}
      <div className="px-5 py-4 space-y-3">
        {/* Rationale */}
        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
          <span className="font-medium text-amber-800">Rationale:</span> {change.rationale}
        </div>

        {/* Name diff */}
        {nameChanged && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase">Naam</p>
            <div className="flex flex-col gap-1">
              <div className="text-sm px-3 py-1.5 bg-red-50 rounded border-l-2 border-red-300 line-through text-red-700">
                {change.original_name}
              </div>
              <div className="text-sm px-3 py-1.5 bg-green-50 rounded border-l-2 border-green-300 text-green-700 font-medium">
                {change.proposed_name}
              </div>
            </div>
          </div>
        )}

        {/* Description diff */}
        {descChanged && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase">Beschrijving</p>
            <div className="flex flex-col gap-1">
              <div className="text-sm px-3 py-1.5 bg-red-50 rounded border-l-2 border-red-300 text-red-700">
                {change.original_description}
              </div>
              <div className="text-sm px-3 py-1.5 bg-green-50 rounded border-l-2 border-green-300 text-green-700">
                {change.proposed_description}
              </div>
            </div>
          </div>
        )}

        {!nameChanged && !descChanged && change.change_type === "comment_only" && (
          <div className="space-y-3">
            {/* Show source comments */}
            {(() => {
              const sourceComments = suggestions?.filter(s =>
                change.source_suggestions.includes(s.id) ||
                (s.cluster_id === change.cluster_id && s.suggestion_type === "comment")
              ) || [];
              if (sourceComments.length > 0) {
                return (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase">Opmerkingen</p>
                    {sourceComments.map(s => (
                      <div key={s.id} className="text-sm px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="font-medium text-gray-700">{s.member_name}:</span>{" "}
                        <span className="text-gray-600">{(s.content as Record<string, unknown>).text as string}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            {/* Generate text proposal button */}
            {onGenerateProposal && (
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    await onGenerateProposal(change.change_id);
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="spinner w-4 h-4" />
                    AI genereert tekstvoorstel...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Toon wat er verandert als we deze opmerking verwerken
                  </>
                )}
              </button>
            )}

            {!onGenerateProposal && (
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-dashed border-gray-200">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Geen tekstwijziging — alleen opmerkingen geregistreerd.</span>
              </div>
            )}
          </div>
        )}

        {/* Source members */}
        <div className="text-xs text-gray-500">
          Gebaseerd op feedback van: {change.member_sources.join(", ")}
        </div>
      </div>

      {/* Voting section */}
      {isVotingPhase && (
        <div className="px-5 py-3 border-t bg-gray-50">
          {/* Vote summary per member */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {MT_MEMBERS.map(name => {
              const vote = votes.find(v => v.member_name === name);
              return (
                <div
                  key={name}
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    !vote
                      ? "bg-gray-100 text-gray-400"
                      : vote.value === "agree"
                        ? "bg-green-100 text-green-700"
                        : vote.value === "disagree"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {name}{vote ? (vote.value === "agree" ? " \u2713" : vote.value === "disagree" ? " \u2717" : " -") : ""}
                </div>
              );
            })}
          </div>

          {/* Vote comments (disagree + abstain) */}
          {votes.filter(v => (v.value === "disagree" || v.value === "abstain") && v.comment).map(v => (
            <div key={v.id} className={`mb-2 p-2 border rounded-lg text-sm ${
              v.value === "disagree"
                ? "bg-red-50 border-red-100"
                : "bg-amber-50 border-amber-100"
            }`}>
              <span className={`font-medium ${v.value === "disagree" ? "text-red-700" : "text-amber-700"}`}>
                {v.member_name} ({v.value === "disagree" ? "bezwaar" : "onthouding"}):
              </span>{" "}
              <span className={v.value === "disagree" ? "text-red-600" : "text-amber-600"}>{v.comment}</span>
            </div>
          ))}

          {/* Vote buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleVote("agree")}
              className={`px-4 py-2 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                myVote?.value === "agree"
                  ? "bg-green-500 text-white"
                  : "bg-white border border-green-300 text-green-700 hover:bg-green-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Akkoord
            </button>
            <button
              onClick={() => handleVote("disagree")}
              className={`px-4 py-2 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                myVote?.value === "disagree"
                  ? "bg-red-500 text-white"
                  : "bg-white border border-red-300 text-red-700 hover:bg-red-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Bezwaar
            </button>
            <button
              onClick={() => handleVote("abstain")}
              className={`px-4 py-2 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                myVote?.value === "abstain"
                  ? "bg-gray-500 text-white"
                  : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Onthouding
            </button>
          </div>

          {/* Comment input for disagree/abstain */}
          {showCommentFor && (
            <div className={`mt-3 p-3 border rounded-lg ${
              showCommentFor === "disagree"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <label className={`block text-sm font-medium mb-2 ${
                showCommentFor === "disagree" ? "text-red-800" : "text-amber-800"
              }`}>
                {showCommentFor === "disagree"
                  ? "Toelichting bij bezwaar"
                  : "Toelichting bij onthouding"
                }
                <span className="font-normal text-gray-500 ml-1">(optioneel)</span>
              </label>
              <textarea
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                placeholder={showCommentFor === "disagree"
                  ? "Geef aan waarom je bezwaar hebt..."
                  : "Geef aan waarom je je onthoudt..."
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                  showCommentFor === "disagree"
                    ? "border-red-300 focus:ring-red-500"
                    : "border-amber-300 focus:ring-amber-500"
                }`}
                rows={2}
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleSubmitWithComment}
                  className={`px-4 py-2 text-white text-sm rounded-lg ${
                    showCommentFor === "disagree"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {showCommentFor === "disagree" ? "Bezwaar indienen" : "Onthouding indienen"}
                </button>
                <button
                  onClick={() => { setShowCommentFor(null); setVoteComment(""); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangeTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    edit: { label: "Tekstwijziging", className: "bg-blue-100 text-blue-700" },
    merge: { label: "Samenvoegen", className: "bg-purple-100 text-purple-700" },
    comment_only: { label: "Alleen opmerkingen", className: "bg-gray-100 text-gray-600" }
  };
  const c = config[type] || config.edit;
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.className}`}>{c.label}</span>;
}

function ConsentBadge({ agreeCount, disagreeCount, totalMembers, totalVotes }: { agreeCount: number; disagreeCount: number; totalMembers: number; totalVotes: number }) {
  if (totalVotes === 0) {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">In afwachting</span>;
  }
  const hasMajority = agreeCount > disagreeCount;
  if (totalVotes === totalMembers) {
    // All voted
    if (hasMajority) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">Meerderheid ({agreeCount}/{totalVotes})</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">Afgewezen ({disagreeCount}/{totalVotes} tegen)</span>;
  }
  // Not all voted yet
  if (hasMajority) {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">{agreeCount} voor, {disagreeCount} tegen ({totalVotes}/{totalMembers})</span>;
  }
  if (disagreeCount > agreeCount) {
    return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">{disagreeCount} tegen, {agreeCount} voor ({totalVotes}/{totalMembers})</span>;
  }
  return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">{totalVotes}/{totalMembers} gestemd</span>;
}
