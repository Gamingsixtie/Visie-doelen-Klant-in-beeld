"use client";

import { useState } from "react";
import type { FeedbackSuggestion, SuggestionVote, SuggestionType, FeedbackPhase } from "@/lib/feedback-service";

interface ClusterData {
  id: string;
  name: string;
  description: string;
  goals: Array<{ id: string; respondentName: string; text: string; rank: number }>;
}

interface ClusterFeedbackCardProps {
  cluster: ClusterData;
  allClusters: ClusterData[];
  suggestions: FeedbackSuggestion[];
  votes: SuggestionVote[];
  currentMember: string;
  onAddSuggestion: (clusterId: string, type: SuggestionType, content: Record<string, unknown>) => void;
  onVoteSuggestion: (suggestionId: string, value: "accept" | "reject") => void;
  onDeleteSuggestion: (suggestionId: string) => void;
  onEditSuggestion?: (suggestionId: string, content: Record<string, unknown>) => void;
  isFacilitator?: boolean;
  isRoundClosed?: boolean;
  phase?: FeedbackPhase;
}

export function ClusterFeedbackCard({
  cluster,
  allClusters,
  suggestions,
  votes,
  currentMember,
  onAddSuggestion,
  onVoteSuggestion,
  onDeleteSuggestion,
  onEditSuggestion,
  isFacilitator = false,
  isRoundClosed,
  phase
}: ClusterFeedbackCardProps) {
  // Use phase if provided, otherwise fall back to isRoundClosed
  const isCollecting = phase ? phase === "collecting" : !isRoundClosed;
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [showMergeInput, setShowMergeInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editName, setEditName] = useState(cluster.name);
  const [editDescription, setEditDescription] = useState(cluster.description);
  const [editReason, setEditReason] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeReason, setMergeReason] = useState("");

  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editSuggestionContent, setEditSuggestionContent] = useState<Record<string, unknown>>({});

  const clusterSuggestions = suggestions.filter(s => s.cluster_id === cluster.id);

  const startEditSuggestion = (suggestion: FeedbackSuggestion) => {
    setEditingSuggestionId(suggestion.id);
    setEditSuggestionContent({ ...(suggestion.content as Record<string, unknown>) });
  };

  const cancelEditSuggestion = () => {
    setEditingSuggestionId(null);
    setEditSuggestionContent({});
  };

  const saveEditSuggestion = (suggestionId: string) => {
    if (onEditSuggestion) onEditSuggestion(suggestionId, editSuggestionContent);
    setEditingSuggestionId(null);
    setEditSuggestionContent({});
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddSuggestion(cluster.id, "comment", { text: commentText });
    setCommentText("");
    setShowCommentInput(false);
  };

  const handleAddEdit = () => {
    if (!editReason.trim()) return;
    onAddSuggestion(cluster.id, "text_edit", {
      original_name: cluster.name,
      original_description: cluster.description,
      suggested_name: editName,
      suggested_description: editDescription,
      reason: editReason
    });
    setShowEditInput(false);
    setEditReason("");
  };

  const handleAddMerge = () => {
    if (!mergeTargetId || !mergeReason.trim()) return;
    const targetCluster = allClusters.find(c => c.id === mergeTargetId);
    if (!targetCluster) return;
    onAddSuggestion(cluster.id, "merge", {
      merge_with_cluster_id: mergeTargetId,
      merge_with_cluster_name: targetCluster.name,
      reason: mergeReason
    });
    setShowMergeInput(false);
    setMergeTargetId("");
    setMergeReason("");
  };

  const getVoteCounts = (suggestionId: string) => {
    const svotes = votes.filter(v => v.suggestion_id === suggestionId);
    return {
      accept: svotes.filter(v => v.value === "accept").length,
      reject: svotes.filter(v => v.value === "reject").length,
      myVote: svotes.find(v => v.member_name === currentMember)?.value || null
    };
  };

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Cluster header */}
      <div className="px-5 py-4 bg-gray-50 border-b">
        <h3 className="font-semibold text-gray-900 text-lg">{cluster.name}</h3>
        <p className="text-gray-600 mt-1">{cluster.description}</p>
      </div>

      {/* Original goals */}
      {cluster.goals.length > 0 && (
        <div className="px-5 py-3 border-b bg-blue-50/50">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Oorspronkelijke doelen</p>
          <ul className="space-y-1">
            {cluster.goals.map((goal) => (
              <li key={goal.id} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-cito-blue font-medium text-xs mt-0.5">#{goal.rank}</span>
                <span>{goal.text}</span>
                <span className="text-gray-400 text-xs ml-auto whitespace-nowrap">- {goal.respondentName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {clusterSuggestions.length > 0 && (
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
            Suggesties ({clusterSuggestions.length})
          </p>
          <div className="space-y-3">
            {clusterSuggestions.map((suggestion) => {
              const vc = getVoteCounts(suggestion.id);
              const isOwn = suggestion.member_name === currentMember;
              const content = suggestion.content as Record<string, unknown>;

              const isEditingThis = editingSuggestionId === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className={`p-3 rounded-lg border ${isOwn ? "border-cito-blue/30 bg-cito-light-blue/30" : "border-gray-200 bg-gray-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800">{suggestion.member_name}</span>
                        <SuggestionTypeBadge type={suggestion.suggestion_type as SuggestionType} />
                      </div>
                      {isEditingThis ? (
                        <InlineSuggestionEdit
                          type={suggestion.suggestion_type as SuggestionType}
                          content={editSuggestionContent}
                          onChange={setEditSuggestionContent}
                          onSave={() => saveEditSuggestion(suggestion.id)}
                          onCancel={cancelEditSuggestion}
                        />
                      ) : (
                        <SuggestionContent
                          type={suggestion.suggestion_type as SuggestionType}
                          content={content}
                          clusterName={cluster.name}
                          clusterDescription={cluster.description}
                        />
                      )}
                    </div>

                    {/* Action buttons */}
                    {isCollecting && !isEditingThis && (
                      <div className="flex items-center gap-1">
                        {/* Facilitator edit button */}
                        {isFacilitator && onEditSuggestion && (
                          <button
                            onClick={() => startEditSuggestion(suggestion)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-cito-blue bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            title="Tekst aanpassen"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Aanpassen
                          </button>
                        )}
                        {/* Delete button (own or facilitator) */}
                        {(isOwn || isFacilitator) && (
                          <button
                            onClick={() => onDeleteSuggestion(suggestion.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Verwijderen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote buttons */}
                  {!isOwn && isCollecting && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => onVoteSuggestion(suggestion.id, "accept")}
                        className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${
                          vc.myVote === "accept"
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Akkoord {vc.accept > 0 && `(${vc.accept})`}
                      </button>
                      <button
                        onClick={() => onVoteSuggestion(suggestion.id, "reject")}
                        className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors ${
                          vc.myVote === "reject"
                            ? "bg-red-100 text-red-700 border border-red-300"
                            : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Afwijzen {vc.reject > 0 && `(${vc.reject})`}
                      </button>
                    </div>
                  )}

                  {/* Vote summary for own suggestions */}
                  {isOwn && (vc.accept > 0 || vc.reject > 0) && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                      {vc.accept > 0 && <span className="text-green-600">{vc.accept}x akkoord</span>}
                      {vc.reject > 0 && <span className="text-red-600">{vc.reject}x afwijzen</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isCollecting && (
        <div className="px-5 py-3">
          {!showCommentInput && !showEditInput && !showMergeInput && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCommentInput(true)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Opmerking
              </button>
              <button
                onClick={() => {
                  setEditName(cluster.name);
                  setEditDescription(cluster.description);
                  setShowEditInput(true);
                }}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Tekst aanpassen
              </button>
              <button
                onClick={() => setShowMergeInput(true)}
                className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                </svg>
                Samenvoegen met...
              </button>
            </div>
          )}

          {/* Comment input */}
          {showCommentInput && (
            <div className="space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Typ je opmerking..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="px-3 py-1.5 text-sm bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  Plaatsen
                </button>
                <button
                  onClick={() => { setShowCommentInput(false); setCommentText(""); }}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {/* Edit input */}
          {showEditInput && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500">Naam</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none"
                autoFocus
              />
              <label className="block text-xs font-medium text-gray-500">Beschrijving</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none"
                rows={3}
              />
              <label className="block text-xs font-medium text-gray-500">Reden voor aanpassing</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Waarom deze wijziging?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddEdit}
                  disabled={!editReason.trim()}
                  className="px-3 py-1.5 text-sm bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  Suggestie indienen
                </button>
                <button
                  onClick={() => { setShowEditInput(false); setEditReason(""); }}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {/* Merge input */}
          {showMergeInput && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-500">Samenvoegen met</label>
              <select
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none"
              >
                <option value="">Kies een doel...</option>
                {allClusters
                  .filter(c => c.id !== cluster.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                }
              </select>
              <label className="block text-xs font-medium text-gray-500">Reden</label>
              <input
                type="text"
                value={mergeReason}
                onChange={(e) => setMergeReason(e.target.value)}
                placeholder="Waarom samenvoegen?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddMerge}
                  disabled={!mergeTargetId || !mergeReason.trim()}
                  className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Suggestie indienen
                </button>
                <button
                  onClick={() => { setShowMergeInput(false); setMergeTargetId(""); setMergeReason(""); }}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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

// Helper components
function SuggestionTypeBadge({ type }: { type: SuggestionType }) {
  const config: Record<SuggestionType, { label: string; className: string }> = {
    comment: { label: "Opmerking", className: "bg-gray-100 text-gray-600" },
    text_edit: { label: "Tekstwijziging", className: "bg-blue-100 text-blue-700" },
    merge: { label: "Samenvoegen", className: "bg-purple-100 text-purple-700" },
    priority: { label: "Prioriteit", className: "bg-amber-100 text-amber-700" }
  };

  const c = config[type] || config.comment;
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${c.className}`}>
      {c.label}
    </span>
  );
}

function InlineSuggestionEdit({ type, content, onChange, onSave, onCancel }: {
  type: SuggestionType;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateField = (field: string, value: string) => onChange({ ...content, [field]: value });

  return (
    <div className="space-y-2">
      {type === "comment" && (
        <textarea
          value={(content.text as string) || ""}
          onChange={(e) => updateField("text", e.target.value)}
          className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white"
          rows={2}
          autoFocus
        />
      )}
      {type === "text_edit" && (
        <>
          <div>
            <label className="text-xs text-gray-500 font-medium">Voorgestelde naam</label>
            <input
              type="text"
              value={(content.suggested_name as string) || ""}
              onChange={(e) => updateField("suggested_name", e.target.value)}
              className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Voorgestelde beschrijving</label>
            <textarea
              value={(content.suggested_description as string) || ""}
              onChange={(e) => updateField("suggested_description", e.target.value)}
              className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white"
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Reden</label>
            <input
              type="text"
              value={(content.reason as string) || ""}
              onChange={(e) => updateField("reason", e.target.value)}
              className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white"
            />
          </div>
        </>
      )}
      {type === "merge" && (
        <div>
          <label className="text-xs text-gray-500 font-medium">Reden</label>
          <input
            type="text"
            value={(content.reason as string) || ""}
            onChange={(e) => updateField("reason", e.target.value)}
            className="w-full px-3 py-2 border border-cito-blue/30 rounded-lg text-sm focus:ring-2 focus:ring-cito-blue focus:outline-none bg-white"
            autoFocus
          />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1.5 text-xs bg-cito-blue text-white rounded-lg hover:bg-blue-800">Opslaan</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Annuleren</button>
      </div>
    </div>
  );
}

function SuggestionContent({ type, content, clusterName, clusterDescription }: { type: SuggestionType; content: Record<string, unknown>; clusterName?: string; clusterDescription?: string }) {
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
            <p><span className="text-gray-500">Naam:</span> <span className="font-medium">{content.suggested_name as string}</span></p>
          )}
          {content.suggested_description !== content.original_description && (
            <p className="text-gray-700 italic">&ldquo;{(content.suggested_description as string).substring(0, 150)}...&rdquo;</p>
          )}
          <p className="text-gray-500">Reden: {content.reason as string}</p>
        </div>
      );

    case "merge":
      return (
        <div className="text-sm">
          <p className="text-gray-700">
            Samenvoegen met <span className="font-medium">{content.merge_with_cluster_name as string}</span>
          </p>
          <p className="text-gray-500">Reden: {content.reason as string}</p>
        </div>
      );

    case "priority":
      return <p className="text-sm text-gray-700">Prioriteitswijziging voorgesteld</p>;

    default:
      return <p className="text-sm text-gray-500">Onbekend type suggestie</p>;
  }
}
