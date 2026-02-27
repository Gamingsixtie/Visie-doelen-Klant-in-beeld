"use client";

import { useState } from "react";

interface Goal {
  id: string;
  respondentId: string;
  respondentName: string;
  text: string;
  rank: number; // Original rank from respondent (1, 2, or 3)
}

interface GoalClusterType {
  id: string;
  name: string;
  description: string;
  goals: Goal[];
  votes: number;
}

interface GoalClusterProps {
  cluster: GoalClusterType;
  isSelected?: boolean;
  onSelect?: () => void;
  onEditName?: (newName: string) => void;
  selectionNumber?: number; // 1, 2, 3 for top 3 selection
  editable?: boolean;
}

export function GoalCluster({
  cluster,
  isSelected = false,
  onSelect,
  onEditName,
  selectionNumber,
  editable = false
}: GoalClusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(cluster.name);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    if (onEditName) {
      onEditName(editedName);
    }
    setIsEditing(false);
  };

  // Calculate average rank from original priorities
  const avgRank =
    cluster.goals.reduce((sum, g) => sum + g.rank, 0) / cluster.goals.length;

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isSelected
          ? "border-cito-blue bg-cito-light-blue shadow-md"
          : "border-gray-200 hover:border-gray-300 bg-white"
      } ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => !isEditing && onSelect?.()}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Selection number badge */}
            {selectionNumber && (
              <div className="w-8 h-8 bg-cito-blue rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {selectionNumber}
              </div>
            )}

            {/* Name */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cito-blue text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <h3 className="font-semibold text-gray-900 text-lg">
                  {cluster.name}
                </h3>
              )}
              <p className="text-gray-600 text-sm mt-1">{cluster.description}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Respondent count badge */}
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {cluster.goals.length} respondent{cluster.goals.length > 1 ? "en" : ""}
            </span>

            {/* Average priority indicator */}
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                avgRank <= 1.5
                  ? "bg-green-100 text-green-700"
                  : avgRank <= 2.5
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              Gem. prioriteit: {avgRank.toFixed(1)}
            </span>

            {/* Edit button */}
            {editable && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 text-gray-400 hover:text-cito-blue rounded"
                title="Naam bewerken"
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

            {/* Selected indicator */}
            {isSelected && !selectionNumber && (
              <div className="w-6 h-6 bg-cito-blue rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Edit actions */}
        {isEditing && (
          <div
            className="mt-3 flex gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800"
            >
              Opslaan
            </button>
            <button
              onClick={() => {
                setEditedName(cluster.name);
                setIsEditing(false);
              }}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Annuleren
            </button>
          </div>
        )}
      </div>

      {/* Original goals (expandable) */}
      <div className="border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
        >
          <span className="font-medium">Originele doelen bekijken</span>
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
            {cluster.goals.map((goal) => (
              <div
                key={goal.id}
                className="p-3 bg-gray-50 rounded border-l-4 border-gray-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {goal.respondentName}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    Prioriteit {goal.rank}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{goal.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vote count (if voting enabled) */}
      {cluster.votes > 0 && (
        <div className="px-4 py-2 bg-cito-light-blue border-t border-cito-blue/20">
          <div className="flex items-center gap-2 text-cito-blue">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            <span className="font-medium">{cluster.votes} stem{cluster.votes > 1 ? "men" : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// List of goal clusters
interface GoalClusterListProps {
  clusters: GoalClusterType[];
  selectedIds: string[];
  maxSelections?: number;
  onToggleSelect: (clusterId: string) => void;
  onEditClusterName?: (clusterId: string, newName: string) => void;
  editable?: boolean;
}

export function GoalClusterList({
  clusters,
  selectedIds,
  maxSelections = 3,
  onToggleSelect,
  onEditClusterName,
  editable = false
}: GoalClusterListProps) {
  // Sort by votes (if any) or by average priority
  const sortedClusters = [...clusters].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    const avgA = a.goals.reduce((s, g) => s + g.rank, 0) / a.goals.length;
    const avgB = b.goals.reduce((s, g) => s + g.rank, 0) / b.goals.length;
    return avgA - avgB;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {selectedIds.length}/{maxSelections} doelen geselecteerd
        </span>
        {selectedIds.length >= maxSelections && (
          <span className="text-orange-600">Maximum bereikt</span>
        )}
      </div>

      <div className="space-y-3">
        {sortedClusters.map((cluster) => {
          const selectionIndex = selectedIds.indexOf(cluster.id);
          const isSelected = selectionIndex !== -1;
          const canSelect = isSelected || selectedIds.length < maxSelections;

          return (
            <GoalCluster
              key={cluster.id}
              cluster={cluster}
              isSelected={isSelected}
              selectionNumber={isSelected ? selectionIndex + 1 : undefined}
              onSelect={canSelect ? () => onToggleSelect(cluster.id) : undefined}
              onEditName={
                onEditClusterName
                  ? (name) => onEditClusterName(cluster.id, name)
                  : undefined
              }
              editable={editable}
            />
          );
        })}
      </div>
    </div>
  );
}

export type { GoalClusterType, Goal };
