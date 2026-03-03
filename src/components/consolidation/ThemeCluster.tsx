"use client";

import { useState, useCallback } from "react";
import type { ThemeCluster as ThemeClusterType } from "@/lib/types";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { ConfirmDialog } from "@/components/ui";

interface ThemeClusterProps {
  theme: ThemeClusterType;
  onUpdate?: (theme: ThemeClusterType) => void;
  onDelete?: (themeId: string) => void;
  editable?: boolean;
}

export function ThemeCluster({
  theme,
  onUpdate,
  onDelete,
  editable = false
}: ThemeClusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(theme.name);
  const [editedDescription, setEditedDescription] = useState(theme.description);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefineLoading, setIsRefineLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSpeechResult = useCallback((text: string) => {
    setRefineFeedback((prev) => (prev ? prev + " " + text : text));
  }, []);

  const { isListening, isSupported: speechSupported, toggleListening } =
    useSpeechRecognition(handleSpeechResult);

  const handleRefine = async () => {
    if (!refineFeedback.trim() || !onUpdate) return;
    if (isListening) toggleListening();
    setIsRefineLoading(true);
    try {
      const response = await fetch("/api/refine-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, feedback: refineFeedback })
      });
      if (!response.ok) throw new Error("Verfijning mislukt");
      const result = await response.json();
      if (result.refined) {
        onUpdate({
          ...theme,
          name: result.refined.name || theme.name,
          description: result.refined.description || theme.description,
          exampleQuotes: result.refined.exampleQuotes || theme.exampleQuotes
        });
      }
      setRefineFeedback("");
      setIsRefining(false);
    } catch (error) {
      console.error("Refine error:", error);
    } finally {
      setIsRefineLoading(false);
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...theme,
        name: editedName,
        description: editedDescription
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(theme.name);
    setEditedDescription(theme.description);
    setIsEditing(false);
  };

  const consensusColor =
    theme.consensusLevel === "high"
      ? "border-green-400 bg-green-50"
      : theme.consensusLevel === "medium"
      ? "border-orange-400 bg-orange-50"
      : "border-red-400 bg-red-50";

  const consensusBadgeColor =
    theme.consensusLevel === "high"
      ? "bg-green-100 text-green-800"
      : theme.consensusLevel === "medium"
      ? "bg-orange-100 text-orange-800"
      : "bg-red-100 text-red-800";

  const consensusLabel =
    theme.consensusLevel === "high"
      ? "Hoge consensus"
      : theme.consensusLevel === "medium"
      ? "Gemiddelde consensus"
      : "Lage consensus";

  const consensusIcon =
    theme.consensusLevel === "high" ? "●●●" : theme.consensusLevel === "medium" ? "●●○" : "●○○";

  return (
    <div className={`rounded-lg border-2 ${consensusColor} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cito-blue text-lg font-semibold"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-900 text-lg">{theme.name}</h3>
          )}

          <div className="flex items-center gap-2">
            <span className={`consensus-badge ${consensusBadgeColor} text-xs px-2 py-1 rounded-full`}>
              {consensusIcon} {consensusLabel}
            </span>

            {editable && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-400 hover:text-cito-blue rounded"
                title="Bewerken"
                aria-label="Thema bewerken"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            )}

            {editable && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Verwijderen"
                aria-label="Thema verwijderen"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mt-2">
          {isEditing ? (
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cito-blue text-sm"
              rows={3}
            />
          ) : (
            <p className="text-gray-700">{theme.description}</p>
          )}
        </div>

        {/* Edit actions */}
        {isEditing && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800"
            >
              Opslaan
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Annuleren
            </button>
          </div>
        )}

        {/* Mentioned by - show names */}
        {theme.mentionedBy && theme.mentionedBy.length > 0 && (
          <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              Genoemd door: {theme.mentionedBy.join(", ")}
            </span>
          </div>
        )}

        {/* Refine with AI */}
        {editable && onUpdate && !isEditing && (
          <div className="mt-3">
            {isRefining ? (
              <div className="p-3 bg-white/80 rounded-lg border border-cito-blue/30">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback voor AI-verfijning
                </label>
                <div className="relative">
                  <textarea
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder={isListening ? "Luisteren... spreek je feedback in" : "Typ of spreek je feedback in..."}
                    rows={2}
                    className={`w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue text-sm resize-none ${
                      isListening ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    disabled={isRefineLoading}
                    autoFocus
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isRefineLoading}
                      className={`absolute right-2 top-2 p-1.5 rounded-full transition-colors ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-gray-100 text-gray-500 hover:bg-cito-blue hover:text-white"
                      }`}
                      title={isListening ? "Stop opname" : "Spreek feedback in"}
                      aria-label={isListening ? "Stop opname" : "Spreek feedback in"}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        {isListening ? (
                          <path d="M6 6h12v12H6z" />
                        ) : (
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        )}
                      </svg>
                    </button>
                  )}
                </div>
                {isListening && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Luisteren... klik op het stopicoon om te stoppen
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleRefine}
                    disabled={!refineFeedback.trim() || isRefineLoading}
                    className="px-3 py-1.5 bg-cito-blue text-white text-sm rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isRefineLoading ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Verfijnen...
                      </>
                    ) : (
                      "Verfijn met AI"
                    )}
                  </button>
                  <button
                    onClick={() => { if (isListening) toggleListening(); setIsRefining(false); setRefineFeedback(""); }}
                    disabled={isRefineLoading}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsRefining(true)}
                className="text-sm text-cito-blue hover:text-blue-800 flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Verfijn met AI
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quotes section (expandable) */}
      {theme.exampleQuotes && theme.exampleQuotes.length > 0 && (
        <div className="border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-white/50"
          >
            <span className="font-medium">
              Onderbouwing: {theme.exampleQuotes.length} citaat{theme.exampleQuotes.length > 1 ? "en" : ""} uit de antwoorden
            </span>
            <svg
              className={`w-4 h-4 transform transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {theme.exampleQuotes.map((quote, index) => (
                <div
                  key={index}
                  className="p-3 bg-white/70 rounded border-l-4 border-gray-300"
                >
                  <p className="text-sm text-gray-700 italic">"{quote}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confidence indicator */}
      {theme.aiConfidence !== undefined && (
        <div className="px-4 py-2 bg-white/30 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>AI vertrouwen:</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-cito-blue rounded-full"
                style={{ width: `${theme.aiConfidence * 100}%` }}
              />
            </div>
            <span>{Math.round(theme.aiConfidence * 100)}%</span>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Thema verwijderen"
        message={`Weet je zeker dat je het thema "${theme.name}" wilt verwijderen?`}
        confirmLabel="Verwijderen"
        variant="danger"
        onConfirm={() => {
          if (onDelete) onDelete(theme.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

// Component for displaying multiple theme clusters
interface ThemeClusterListProps {
  themes: ThemeClusterType[];
  onUpdateTheme?: (theme: ThemeClusterType) => void;
  onDeleteTheme?: (themeId: string) => void;
  onAddTheme?: (theme: ThemeClusterType) => void;
  editable?: boolean;
  showQuickWins?: boolean;
}

export function ThemeClusterList({
  themes,
  onUpdateTheme,
  onDeleteTheme,
  onAddTheme,
  editable = false,
  showQuickWins = true
}: ThemeClusterListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDescription, setNewThemeDescription] = useState("");

  const quickWins = themes.filter((t) => t.consensusLevel === "high");
  const discussionPoints = themes.filter((t) => t.consensusLevel !== "high");

  const handleAddTheme = () => {
    if (!newThemeName.trim() || !onAddTheme) return;

    const newTheme: ThemeClusterType = {
      id: `manual-${Date.now()}`,
      name: newThemeName.trim(),
      description: newThemeDescription.trim() || newThemeName.trim(),
      questionType: themes[0]?.questionType || "current_situation",
      relatedResponses: [],
      mentionedBy: ["Handmatig toegevoegd"],
      consensusLevel: "medium",
      aiConfidence: 1.0,
      exampleQuotes: []
    };

    onAddTheme(newTheme);
    setNewThemeName("");
    setNewThemeDescription("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Toelichting thema's */}
      {themes.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-cito-blue mb-1">Wat zijn thema&apos;s?</h4>
          <p className="text-sm text-gray-700">
            De AI heeft alle antwoorden van de MT-leden geanalyseerd en terugkerende onderwerpen gegroepeerd tot thema&apos;s.
            Elk thema laat zien <strong>wie</strong> het heeft benoemd en <strong>welke citaten</strong> uit de antwoorden eraan ten grondslag liggen.
            Zo kunt u tijdens de sessie gericht terugkomen op specifieke inbreng.
          </p>
          <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc space-y-0.5">
            <li><span className="text-green-700 font-medium">Hoge consensus</span> = meer dan 66% van de respondenten benoemt dit</li>
            <li><span className="text-orange-700 font-medium">Gemiddelde consensus</span> = 33-66% benoemt dit</li>
            <li><span className="text-red-700 font-medium">Lage consensus</span> = minder dan 33% benoemt dit</li>
          </ul>
        </div>
      )}

      {/* Quick Wins */}
      {showQuickWins && quickWins.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Quick Wins - Hoge consensus
          </h3>
          <div className="space-y-3">
            {quickWins.map((theme) => (
              <ThemeCluster
                key={theme.id}
                theme={theme}
                onUpdate={onUpdateTheme}
                onDelete={onDeleteTheme}
                editable={editable}
              />
            ))}
          </div>
        </div>
      )}

      {/* Discussion Points */}
      {discussionPoints.length > 0 && (
        <div>
          {showQuickWins && (
            <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Discussiepunten - Te bespreken
            </h3>
          )}
          <div className="space-y-3">
            {discussionPoints.map((theme) => (
              <ThemeCluster
                key={theme.id}
                theme={theme}
                onUpdate={onUpdateTheme}
                onDelete={onDeleteTheme}
                editable={editable}
              />
            ))}
          </div>
        </div>
      )}

      {themes.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Geen thema's gevonden. Start de analyse om thema's te identificeren.
        </p>
      )}

      {/* Add Theme Button/Form */}
      {editable && onAddTheme && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {showAddForm ? (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <h4 className="font-medium text-gray-900 mb-3">Nieuw thema toevoegen</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Naam van het thema *
                  </label>
                  <input
                    type="text"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="Bijv. Klantgerichtheid, Innovatie, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschrijving (optioneel)
                  </label>
                  <textarea
                    value={newThemeDescription}
                    onChange={(e) => setNewThemeDescription(e.target.value)}
                    placeholder="Korte toelichting van dit thema..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTheme}
                    disabled={!newThemeName.trim()}
                    className="px-4 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Toevoegen
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewThemeName("");
                      setNewThemeDescription("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-cito-blue hover:text-cito-blue transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thema handmatig toevoegen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
