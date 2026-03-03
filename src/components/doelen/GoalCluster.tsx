"use client";

import { useState } from "react";
import { RefineWithAI } from "@/components/ui/RefineWithAI";

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
  aiAveragePriority?: number;
  priorityBreakdown?: {
    prio1: number;
    prio2: number;
    prio3: number;
  };
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

  // Calculate average rank from original priorities, or use AI-provided
  const avgRank = cluster.aiAveragePriority ||
    (cluster.goals.length > 0
      ? cluster.goals.reduce((sum, g) => sum + g.rank, 0) / cluster.goals.length
      : 2.0);

  // Count priorities for breakdown display
  const prioCount = cluster.priorityBreakdown || {
    prio1: cluster.goals.filter(g => g.rank === 1).length,
    prio2: cluster.goals.filter(g => g.rank === 2).length,
    prio3: cluster.goals.filter(g => g.rank === 3).length
  };

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
              {editable && onEditName && !isEditing && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <RefineWithAI
                    currentText={cluster.name}
                    context={`Doelcluster beschrijving: ${cluster.description}. Gebaseerd op ${cluster.goals.length} samengevoegde doelen van MT-leden.`}
                    onRefined={(newName) => onEditName(newName)}
                    label="Verfijn formulering"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Respondent count badge */}
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              {cluster.goals.length} respondent{cluster.goals.length > 1 ? "en" : ""}
            </span>

            {/* Priority breakdown badges */}
            <div className="flex items-center gap-1">
              {prioCount.prio1 > 0 && (
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium" title="Aantal keer als #1 prioriteit genoemd">
                  {prioCount.prio1}× #1
                </span>
              )}
              {prioCount.prio2 > 0 && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium" title="Aantal keer als #2 prioriteit genoemd">
                  {prioCount.prio2}× #2
                </span>
              )}
              {prioCount.prio3 > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium" title="Aantal keer als #3 prioriteit genoemd">
                  {prioCount.prio3}× #3
                </span>
              )}
            </div>

            {/* Average priority indicator */}
            <div
              className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                avgRank <= 1.3
                  ? "bg-green-500 text-white"
                  : avgRank <= 1.8
                  ? "bg-blue-500 text-white"
                  : avgRank <= 2.3
                  ? "bg-yellow-500 text-white"
                  : "bg-orange-500 text-white"
              }`}
              title={`Gemiddelde prioriteit: ${avgRank.toFixed(1)} (1=hoogst, 3=laagst)`}
            >
              <span className="font-medium">
                Gem: {avgRank.toFixed(1)}
              </span>
            </div>

            {/* Edit button */}
            {editable && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 text-gray-400 hover:text-cito-blue rounded"
                title="Naam bewerken"
                aria-label="Doelnaam bewerken"
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

      {/* Original goals (expandable) - shows how this cluster was formed */}
      <div className="border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
        >
          <span className="font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Bekijk samengevoegde doelen ({cluster.goals.length})
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
          <div className="px-4 pb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Explanation */}
            <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
              <strong>Dit cluster is samengesteld uit {cluster.goals.length} vergelijkbare doelen:</strong>
              <br />
              De AI heeft deze doelen gegroepeerd omdat ze over hetzelfde thema gaan.
            </div>

            {/* Goals grouped by priority */}
            {[1, 2, 3].map((prio) => {
              const goalsWithPrio = cluster.goals.filter(g => g.rank === prio);
              if (goalsWithPrio.length === 0) return null;

              return (
                <div key={prio} className="space-y-2">
                  <div className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
                    prio === 1 ? "bg-green-100 text-green-700" :
                    prio === 2 ? "bg-yellow-100 text-yellow-700" :
                    "bg-orange-100 text-orange-700"
                  }`}>
                    Prioriteit #{prio} ({goalsWithPrio.length}×)
                  </div>
                  {goalsWithPrio.map((goal) => (
                    <div
                      key={goal.id}
                      className={`p-3 bg-white rounded border-l-4 shadow-sm ${
                        prio === 1 ? "border-green-400" :
                        prio === 2 ? "border-yellow-400" :
                        "border-orange-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {goal.respondentName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{goal.text}</p>
                    </div>
                  ))}
                </div>
              );
            })}

            {cluster.goals.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                Geen specifieke doelen gekoppeld. Dit thema is geïdentificeerd door de AI op basis van patronen in de input.
              </p>
            )}
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
      {/* Legenda voor prioriteit badges */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Zo lees je de badges:</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium text-gray-600 mb-1">Prioriteit badges:</p>
            <div className="flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">2× #1</span>
              <span className="text-gray-500">= 2 MT-leden gaven dit prioriteit 1</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">1× #2</span>
              <span className="text-gray-500">= 1 MT-lid gaf dit prioriteit 2</span>
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-600 mb-1">Gemiddelde score:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-green-500 text-white rounded text-xs">Gem: 1.0</span>
                <span className="text-gray-500">= Iedereen gaf #1</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-orange-500 text-white rounded text-xs">Gem: 2.5</span>
                <span className="text-gray-500">= Mix van #2 en #3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
