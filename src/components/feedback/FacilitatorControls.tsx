"use client";

import { useState } from "react";
import type { FeedbackPhase, ChangeVote, ProposedChange, ConsolidatedChangesVersion, SuggestionType } from "@/lib/feedback-service";
import { MT_MEMBERS } from "@/lib/types";

type ConsolidationMode = "all" | "one_by_one";

interface FacilitatorControlsProps {
  phase: FeedbackPhase;
  isFacilitator: boolean;
  suggestionsCount: number;
  suggestionsByType?: Record<string, number>;
  changes: ProposedChange[];
  changeVotes: ChangeVote[];
  onStartConsolidation: (selectedTypes: SuggestionType[]) => void;
  onApplyChanges: () => void;
  onResetRound?: () => void;
  isConsolidating: boolean;
  isApplying: boolean;
  versions?: ConsolidatedChangesVersion[];
  onRestoreVersion?: (versionId: string) => void;
  // New props for enhanced selection
  selectedClusterCount?: number;
  selectedSuggestionCount?: number;
  totalSuggestionCount?: number;
  activeTypeFilters?: SuggestionType[];
  onConsolidateSelected?: (mode: ConsolidationMode) => void;
  onQuickConsolidate?: (types: SuggestionType[]) => void;
}

export function FacilitatorControls({
  phase,
  isFacilitator,
  suggestionsCount,
  suggestionsByType,
  changes,
  changeVotes,
  onStartConsolidation,
  onApplyChanges,
  onResetRound,
  isConsolidating,
  isApplying,
  versions,
  onRestoreVersion,
  selectedClusterCount = 0,
  selectedSuggestionCount = 0,
  totalSuggestionCount = 0,
  activeTypeFilters = ["text_edit", "merge", "comment"],
  onConsolidateSelected,
  onQuickConsolidate,
}: FacilitatorControlsProps) {
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (!isFacilitator) return null;

  // Per change: check if majority voted agree (agree > disagree)
  const changeMajority = changes.map(change => {
    const votes = changeVotes.filter(v => v.change_id === change.change_id);
    const agreeVotes = votes.filter(v => v.value === "agree").length;
    const disagreeVotes = votes.filter(v => v.value === "disagree").length;
    return {
      change_id: change.change_id,
      hasMajority: agreeVotes > disagreeVotes && votes.length > 0,
      agreeCount: agreeVotes,
      disagreeCount: disagreeVotes,
      totalVotes: votes.length
    };
  });

  const approvedCount = changeMajority.filter(c => c.hasMajority).length;
  const rejectedCount = changeMajority.filter(c => !c.hasMajority && c.totalVotes > 0).length;
  const canApply = approvedCount > 0;

  const votingProgress = changes.length > 0
    ? Math.round((changeVotes.length / (changes.length * MT_MEMBERS.length)) * 100)
    : 0;

  return (
    <div className="bg-gradient-to-r from-cito-blue/5 to-blue-50 border border-cito-blue/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="font-semibold text-cito-blue">Facilitator beheer</h3>
      </div>

      {phase === "collecting" && (
        <div>
          {suggestionsCount === 0 ? (
            <p className="text-sm text-gray-600 mb-3">
              Wacht tot MT-leden feedback hebben gegeven, of sluit de ronde als er geen feedback nodig is.
            </p>
          ) : (
            <div>
              {/* Quick consolidation per type */}
              {onQuickConsolidate && suggestionsByType && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium text-gray-800">{suggestionsCount} suggesties</span> binnengekomen. Consolideer direct per type of selecteer handmatig hieronder.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(suggestionsByType.text_edit || 0) > 0 && (
                      <button
                        onClick={() => onQuickConsolidate(["text_edit"])}
                        disabled={isConsolidating}
                        className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="text-sm font-medium text-blue-700">Tekstwijzigingen</span>
                          <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">{suggestionsByType.text_edit}</span>
                        </div>
                        <p className="text-xs text-gray-500 group-hover:text-blue-600">Direct consolideren</p>
                      </button>
                    )}
                    {(suggestionsByType.merge || 0) > 0 && (
                      <button
                        onClick={() => onQuickConsolidate(["merge"])}
                        disabled={isConsolidating}
                        className="p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm font-medium text-purple-700">Samenvoegen</span>
                          <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">{suggestionsByType.merge}</span>
                        </div>
                        <p className="text-xs text-gray-500 group-hover:text-purple-600">Direct consolideren</p>
                      </button>
                    )}
                    {(suggestionsByType.comment || 0) > 0 && (
                      <button
                        onClick={() => onQuickConsolidate(["comment"])}
                        disabled={isConsolidating}
                        className="p-3 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="text-sm font-medium text-amber-700">Opmerkingen</span>
                          <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">{suggestionsByType.comment}</span>
                        </div>
                        <p className="text-xs text-gray-500 group-hover:text-amber-600">Direct consolideren</p>
                      </button>
                    )}
                  </div>
                  {/* Quick: consolidate all types at once */}
                  <button
                    onClick={() => {
                      const allTypes: SuggestionType[] = [];
                      if ((suggestionsByType.text_edit || 0) > 0) allTypes.push("text_edit");
                      if ((suggestionsByType.merge || 0) > 0) allTypes.push("merge");
                      if ((suggestionsByType.comment || 0) > 0) allTypes.push("comment");
                      onQuickConsolidate(allTypes);
                    }}
                    disabled={isConsolidating}
                    className="mt-2 w-full px-4 py-2.5 bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                  >
                    {isConsolidating ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        AI consolideert feedback...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Alles direct consolideren ({suggestionsCount})
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Advanced selection (collapsible) */}
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-cito-blue select-none flex items-center gap-1 mb-3">
                  <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Geavanceerde selectie (handmatig suggesties kiezen)
                </summary>

                {/* Selection summary */}
                {selectedClusterCount > 0 && selectedSuggestionCount > 0 && (
                  <div className="mb-3 p-3 bg-white/60 rounded-lg border border-cito-blue/10">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Klaar om te consolideren:
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedSuggestionCount} suggestie{selectedSuggestionCount !== 1 ? "s" : ""} uit {selectedClusterCount} doel{selectedClusterCount !== 1 ? "en" : ""}
                      {activeTypeFilters.length < 3 && (
                        <span className="text-gray-400">
                          {" "}(gefilterd op {activeTypeFilters.map(t =>
                            t === "text_edit" ? "tekstwijzigingen" :
                            t === "merge" ? "samenvoegen" : "opmerkingen"
                          ).join(", ")})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Consolidation action buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* All at once button */}
                  <button
                    onClick={() => {
                      if (onConsolidateSelected) {
                        onConsolidateSelected("all");
                      } else {
                        onStartConsolidation(activeTypeFilters);
                      }
                    }}
                    disabled={isConsolidating || selectedSuggestionCount === 0}
                    className="px-4 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isConsolidating ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        AI consolideert feedback...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        Geselecteerde consolideren ({selectedSuggestionCount})
                      </>
                    )}
                  </button>

                  {/* One by one button - only show if multiple clusters selected */}
                  {selectedClusterCount > 1 && onConsolidateSelected && (
                    <button
                      onClick={() => onConsolidateSelected("one_by_one")}
                      disabled={isConsolidating || selectedSuggestionCount === 0}
                      className="px-4 py-2 bg-white text-cito-blue border border-cito-blue/30 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      Eén voor één ({selectedClusterCount} rondes)
                    </button>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {phase === "consolidating" && (
        <div className="flex items-center gap-3">
          <div className="spinner w-5 h-5" />
          <p className="text-sm text-gray-600">AI is bezig met het consolideren van feedback...</p>
        </div>
      )}

      {phase === "voting" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              Stemronde: {votingProgress}% gestemd
            </p>
            <div className="flex items-center gap-2">
              {approvedCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                  {approvedCount} goedgekeurd
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                  {rejectedCount} afgewezen
                </span>
              )}
              {/* Version history button */}
              {versions && versions.length > 0 && onRestoreVersion && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-2 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Versiegeschiedenis ({versions.length})
                </button>
              )}
            </div>
          </div>

          {/* Version history panel */}
          {showHistory && versions && versions.length > 0 && onRestoreVersion && (
            <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Eerdere versies</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[...versions].reverse().map((version) => (
                  <div key={version.version_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{version.label}</p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(version.created_at)} — {version.changes.changes.length} wijzigingen
                      </p>
                    </div>
                    {confirmRestoreId === version.version_id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => { onRestoreVersion(version.version_id); setConfirmRestoreId(null); setShowHistory(false); }}
                          className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600"
                        >
                          Bevestig
                        </button>
                        <button
                          onClick={() => setConfirmRestoreId(null)}
                          className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300"
                        >
                          Nee
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRestoreId(version.version_id)}
                        className="px-2 py-1 text-xs rounded border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                      >
                        Herstellen
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${approvedCount === changes.length ? "bg-green-500" : "bg-cito-blue"}`}
              style={{ width: `${votingProgress}%` }}
            />
          </div>

          {!confirmApply ? (
            <button
              onClick={() => setConfirmApply(true)}
              disabled={!canApply || isApplying}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {approvedCount === changes.length
                ? "Alle wijzigingen doorvoeren"
                : `${approvedCount} van ${changes.length} wijzigingen doorvoeren`
              }
            </button>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-sm font-medium text-amber-800">
                {rejectedCount > 0
                  ? `${approvedCount} wijziging(en) met meerderheid worden doorgevoerd. ${rejectedCount} wijziging(en) zonder meerderheid worden overgeslagen.`
                  : "Alle wijzigingen worden doorgevoerd. De doelen worden bijgewerkt."
                }
              </p>

              {/* Preview of changes that will be applied */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {changes.filter(change => {
                  const cm = changeMajority.find(c => c.change_id === change.change_id);
                  return cm?.hasMajority;
                }).map(change => {
                  const nameChanged = change.original_name !== change.proposed_name;
                  const descChanged = change.original_description !== change.proposed_description;
                  if (!nameChanged && !descChanged) return null;
                  return (
                    <div key={change.change_id} className="p-2.5 bg-white rounded-lg border border-gray-200 text-sm space-y-1.5">
                      <p className="font-medium text-gray-800 text-xs">{change.summary}</p>
                      {nameChanged && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-400 uppercase">Naam</p>
                          <div className="px-2 py-1 bg-red-50 rounded border-l-2 border-red-300 line-through text-red-700 text-xs">{change.original_name}</div>
                          <div className="px-2 py-1 bg-green-50 rounded border-l-2 border-green-300 text-green-700 text-xs font-medium">{change.proposed_name}</div>
                        </div>
                      )}
                      {descChanged && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-400 uppercase">Beschrijving</p>
                          <div className="px-2 py-1 bg-red-50 rounded border-l-2 border-red-300 text-red-700 text-xs">{change.original_description}</div>
                          <div className="px-2 py-1 bg-green-50 rounded border-l-2 border-green-300 text-green-700 text-xs">{change.proposed_description}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { onApplyChanges(); setConfirmApply(false); }}
                  disabled={isApplying}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isApplying ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Doorvoeren...
                    </>
                  ) : (
                    "Ja, doorvoeren"
                  )}
                </button>
                <button
                  onClick={() => setConfirmApply(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "approved" && (
        <div className="flex items-center gap-3 text-green-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">Wijzigingen zijn doorgevoerd. De doelen zijn bijgewerkt.</p>
        </div>
      )}

      {/* Reset button - always visible for facilitator */}
      {onResetRound && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Feedback resetten
            </button>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">
                Alle feedback, stemmen en consolidatie worden gewist. De doelen blijven ongewijzigd. Weet je het zeker?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onResetRound(); setConfirmReset(false); }}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                >
                  Ja, reset feedback
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300"
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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Zojuist";
  if (diffMinutes < 60) return `${diffMinutes} min geleden`;
  if (diffHours < 24) return `${diffHours} uur geleden`;
  if (diffDays === 1) return "Gisteren";
  return `${diffDays} dagen geleden`;
}
