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
  activeTypeFilters?: SuggestionType[];
  onConsolidateSelected?: (mode: ConsolidationMode) => void;
}

export function FacilitatorControls({
  phase,
  isFacilitator,
  suggestionsCount,
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
  activeTypeFilters = ["text_edit", "merge", "comment"],
  onConsolidateSelected,
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
              <p className="text-sm text-gray-600 mb-3">
                Er zijn {suggestionsCount} suggesties verzameld. Selecteer hierboven de doelen en feedbacktypes die je wilt consolideren.
              </p>

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
                      Alles tegelijk consolideren ({selectedSuggestionCount})
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

              {selectedClusterCount > 1 && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  &ldquo;Alles tegelijk&rdquo; consolideert alle geselecteerde doelen in één ronde.
                  &ldquo;Eén voor één&rdquo; start per doel een aparte consolidatie.
                </p>
              )}
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
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-2">
                {rejectedCount > 0
                  ? `${approvedCount} wijziging(en) met meerderheid worden doorgevoerd. ${rejectedCount} wijziging(en) zonder meerderheid worden overgeslagen.`
                  : "Alle wijzigingen worden doorgevoerd. De doelen worden bijgewerkt."
                }
              </p>
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
