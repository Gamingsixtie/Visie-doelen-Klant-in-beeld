"use client";

import { useState } from "react";
import type { ThemeCluster as ThemeClusterType } from "@/lib/types";

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
  const [isExpanded, setIsExpanded] = useState(false);

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
                onClick={() => onDelete(theme.id)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Verwijderen"
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

        {/* Mentioned by */}
        {theme.mentionedBy && theme.mentionedBy.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              Genoemd door: {theme.mentionedBy.length} respondent
              {theme.mentionedBy.length > 1 ? "en" : ""}
            </span>
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
              {theme.exampleQuotes.length} citaat
              {theme.exampleQuotes.length > 1 ? "en" : ""}
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
    </div>
  );
}

// Component for displaying multiple theme clusters
interface ThemeClusterListProps {
  themes: ThemeClusterType[];
  onUpdateTheme?: (theme: ThemeClusterType) => void;
  onDeleteTheme?: (themeId: string) => void;
  editable?: boolean;
  showQuickWins?: boolean;
}

export function ThemeClusterList({
  themes,
  onUpdateTheme,
  onDeleteTheme,
  editable = false,
  showQuickWins = true
}: ThemeClusterListProps) {
  const quickWins = themes.filter((t) => t.consensusLevel === "high");
  const discussionPoints = themes.filter((t) => t.consensusLevel !== "high");

  return (
    <div className="space-y-6">
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
    </div>
  );
}
