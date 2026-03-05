"use client";

import { useState } from "react";
import type { ProposedChange, ChangeVote, ChangeVoteValue } from "@/lib/feedback-service";
import { MT_MEMBERS } from "@/lib/types";

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
}

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
  onDeleteChange
}: ConsolidatedChangesProps) {
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
          <div className="text-xl font-bold text-cito-blue">{changes.length}</div>
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

      {/* Change cards */}
      {changes.map((change) => (
        <ChangeCard
          key={change.change_id}
          change={change}
          votes={changeVotes.filter(v => v.change_id === change.change_id)}
          currentMember={currentMember}
          onVote={onVote}
          isVotingPhase={isVotingPhase}
          isFacilitator={isFacilitator}
          onEditChange={onEditChange}
          onRefineChange={onRefineChange}
          onDeleteChange={onDeleteChange}
        />
      ))}

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
  onDeleteChange
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
}) {
  const [showDisagreeComment, setShowDisagreeComment] = useState(false);
  const [disagreeComment, setDisagreeComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(change.proposed_name);
  const [editDescription, setEditDescription] = useState(change.proposed_description);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const myVote = votes.find(v => v.member_name === currentMember);
  const agreeCount = votes.filter(v => v.value === "agree").length;
  const disagreeCount = votes.filter(v => v.value === "disagree").length;
  const abstainCount = votes.filter(v => v.value === "abstain").length;
  const hasDisagree = disagreeCount > 0;

  const handleVote = (value: ChangeVoteValue) => {
    if (value === "disagree") {
      setShowDisagreeComment(true);
    } else {
      onVote(change.change_id, value);
      setShowDisagreeComment(false);
    }
  };

  const handleSubmitDisagree = () => {
    if (!disagreeComment.trim()) return;
    onVote(change.change_id, "disagree", disagreeComment);
    setShowDisagreeComment(false);
    setDisagreeComment("");
  };

  const handleSaveEdit = () => {
    if (!onEditChange) return;
    onEditChange(change.change_id, {
      proposed_name: editName,
      proposed_description: editDescription
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(change.proposed_name);
    setEditDescription(change.proposed_description);
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
          <div className="text-sm text-gray-500 italic">
            Geen tekstwijziging - alleen opmerkingen geregistreerd.
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

          {/* Disagree comments */}
          {votes.filter(v => v.value === "disagree" && v.comment).map(v => (
            <div key={v.id} className="mb-2 p-2 bg-red-50 border border-red-100 rounded-lg text-sm">
              <span className="font-medium text-red-700">{v.member_name}:</span>{" "}
              <span className="text-red-600">{v.comment}</span>
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

          {/* Disagree comment input */}
          {showDisagreeComment && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <label className="block text-sm font-medium text-red-800 mb-2">
                Toelichting bij bezwaar (verplicht)
              </label>
              <textarea
                value={disagreeComment}
                onChange={(e) => setDisagreeComment(e.target.value)}
                placeholder="Geef aan waarom je bezwaar hebt..."
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                rows={3}
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleSubmitDisagree}
                  disabled={!disagreeComment.trim()}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Bezwaar indienen
                </button>
                <button
                  onClick={() => { setShowDisagreeComment(false); setDisagreeComment(""); }}
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
