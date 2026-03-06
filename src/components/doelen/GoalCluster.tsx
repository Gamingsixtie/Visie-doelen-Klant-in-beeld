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

interface SubGoal {
  id: string;
  name: string;
  description: string;
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
  // Sub-goals for this cluster
  subGoals?: SubGoal[];
  // Track merged clusters for undo functionality
  mergedFrom?: GoalClusterType[];
}

interface GoalClusterProps {
  cluster: GoalClusterType;
  isSelected?: boolean;
  onSelect?: () => void;
  onEditName?: (newName: string) => void;
  onEditDescription?: (newDescription: string) => void;
  selectionNumber?: number; // 1, 2, 3 for top 3 selection
  editable?: boolean;
  // Sub-goals
  onAddSubGoal?: (subGoal: SubGoal) => void;
  onRemoveSubGoal?: (subGoalId: string) => void;
  onEditSubGoal?: (subGoalId: string, name: string, description: string) => void;
  // Merge undo
  onUndoMerge?: () => void;
  // Merge mode selection
  isMergeMode?: boolean;
  isSelectedForMerge?: boolean;
  onToggleMergeSelect?: () => void;
  // Merge into dropdown
  otherClusters?: GoalClusterType[];
  onMergeInto?: (targetClusterId: string) => Promise<void>;
}

export function GoalCluster({
  cluster,
  isSelected = false,
  onSelect,
  onEditName,
  onEditDescription,
  selectionNumber,
  editable = false,
  onAddSubGoal,
  onRemoveSubGoal,
  onEditSubGoal,
  onUndoMerge,
  isMergeMode = false,
  isSelectedForMerge = false,
  onToggleMergeSelect,
  otherClusters = [],
  onMergeInto
}: GoalClusterProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedName, setEditedName] = useState(cluster.name);
  const [editedDescription, setEditedDescription] = useState(cluster.description);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubGoalsExpanded, setIsSubGoalsExpanded] = useState(false);
  const [isAddingSubGoal, setIsAddingSubGoal] = useState(false);
  const [newSubGoalName, setNewSubGoalName] = useState("");
  const [newSubGoalDescription, setNewSubGoalDescription] = useState("");
  const [editingSubGoalId, setEditingSubGoalId] = useState<string | null>(null);
  const [editedSubGoalName, setEditedSubGoalName] = useState("");
  const [editedSubGoalDescription, setEditedSubGoalDescription] = useState("");
  const [showMergeDropdown, setShowMergeDropdown] = useState(false);
  const [isMergingLocal, setIsMergingLocal] = useState(false);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState("");

  const handleSaveName = () => {
    if (onEditName) {
      onEditName(editedName);
    }
    setIsEditingName(false);
  };

  const handleSaveDescription = () => {
    if (onEditDescription) {
      onEditDescription(editedDescription);
    }
    setIsEditingDescription(false);
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
      onClick={() => !isEditingName && !isEditingDescription && onSelect?.()}
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

            {/* Name and Description */}
            <div className="flex-1">
              {/* Name - editable */}
              {isEditingName ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cito-blue text-lg font-semibold"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveName}
                      className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => {
                        setEditedName(cluster.name);
                        setIsEditingName(false);
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {cluster.name}
                  </h3>
                  {editable && onEditName && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }}
                      className="p-1 text-gray-400 hover:text-cito-blue rounded"
                      title="Titel bewerken"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Description - editable */}
              {isEditingDescription ? (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cito-blue text-sm"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => {
                        setEditedDescription(cluster.description);
                        setIsEditingDescription(false);
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 mt-1">
                  <p className="text-gray-600 text-sm flex-1">{cluster.description}</p>
                  {editable && onEditDescription && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }}
                      className="p-1 text-gray-400 hover:text-cito-blue rounded flex-shrink-0"
                      title="Beschrijving bewerken"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {editable && onEditName && !isEditingName && !isEditingDescription && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <RefineWithAI
                    currentText={cluster.name}
                    context={`Doelcluster beschrijving: ${cluster.description}. Gebaseerd op ${cluster.goals.length} samengevoegde doelen van MT-leden.`}
                    onRefined={(newName) => onEditName(newName)}
                    label="Verfijn met AI"
                    undoKey={`cluster-name-${cluster.id}`}
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

      {/* Sub-goals section */}
      {editable && onAddSubGoal && (
        <div className="border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSubGoalsExpanded(!isSubGoalsExpanded);
            }}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
          >
            <span className="font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
              Subdoelen ({cluster.subGoals?.length || 0})
            </span>
            <svg
              className={`w-4 h-4 transform transition-transform ${isSubGoalsExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isSubGoalsExpanded && (
            <div className="px-4 pb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              {/* Existing sub-goals */}
              {cluster.subGoals && cluster.subGoals.length > 0 && (
                <div className="space-y-2">
                  {cluster.subGoals.map((subGoal, index) => (
                    <div key={subGoal.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {editingSubGoalId === subGoal.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editedSubGoalName}
                            onChange={(e) => setEditedSubGoalName(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-cito-blue"
                            placeholder="Subdoel naam..."
                          />
                          <textarea
                            value={editedSubGoalDescription}
                            onChange={(e) => setEditedSubGoalDescription(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-cito-blue"
                            placeholder="Beschrijving..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (onEditSubGoal && editedSubGoalName.trim()) {
                                  onEditSubGoal(subGoal.id, editedSubGoalName.trim(), editedSubGoalDescription.trim());
                                }
                                setEditingSubGoalId(null);
                              }}
                              className="px-2 py-1 bg-cito-blue text-white text-xs rounded hover:bg-blue-800"
                            >
                              Opslaan
                            </button>
                            <button
                              onClick={() => setEditingSubGoalId(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                            >
                              Annuleren
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{subGoal.name}</p>
                              {subGoal.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{subGoal.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingSubGoalId(subGoal.id);
                                setEditedSubGoalName(subGoal.name);
                                setEditedSubGoalDescription(subGoal.description);
                              }}
                              className="p-1 text-gray-400 hover:text-cito-blue"
                              title="Bewerken"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {onRemoveSubGoal && (
                              <button
                                onClick={() => onRemoveSubGoal(subGoal.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="Verwijderen"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new sub-goal form */}
              {isAddingSubGoal ? (
                <div className="p-3 bg-cito-light-blue rounded-lg border border-cito-blue/30 space-y-2">
                  <input
                    type="text"
                    value={newSubGoalName}
                    onChange={(e) => setNewSubGoalName(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-cito-blue"
                    placeholder="Subdoel naam..."
                    autoFocus
                  />
                  <textarea
                    value={newSubGoalDescription}
                    onChange={(e) => setNewSubGoalDescription(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-cito-blue"
                    placeholder="Beschrijving (optioneel)..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (newSubGoalName.trim()) {
                          onAddSubGoal({
                            id: `subgoal-${Date.now()}`,
                            name: newSubGoalName.trim(),
                            description: newSubGoalDescription.trim()
                          });
                          setNewSubGoalName("");
                          setNewSubGoalDescription("");
                          setIsAddingSubGoal(false);
                        }
                      }}
                      disabled={!newSubGoalName.trim()}
                      className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800 disabled:opacity-50"
                    >
                      Toevoegen
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingSubGoal(false);
                        setNewSubGoalName("");
                        setNewSubGoalDescription("");
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingSubGoal(true)}
                  className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-cito-blue hover:text-cito-blue flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Subdoel toevoegen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Undo merge option */}
      {cluster.mergedFrom && cluster.mergedFrom.length > 0 && onUndoMerge && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-yellow-700 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Samengevoegd uit {cluster.mergedFrom.length} doelen
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUndoMerge();
              }}
              className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded hover:bg-yellow-200 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Ongedaan maken
            </button>
          </div>
        </div>
      )}

      {/* Merge selection checkbox */}
      {isMergeMode && onToggleMergeSelect && (
        <div className="px-4 py-2 bg-purple-50 border-t border-purple-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelectedForMerge}
              onChange={(e) => {
                e.stopPropagation();
                onToggleMergeSelect();
              }}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-purple-700">Selecteer voor samenvoegen</span>
          </label>
        </div>
      )}

      {/* Quick merge dropdown - merge this goal into another */}
      {editable && onMergeInto && otherClusters.length > 0 && !isMergeMode && (
        <div className="px-4 py-2 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
          {isMergingLocal ? (
            <div className="flex items-center gap-2 text-purple-600 p-2 bg-purple-50 rounded">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium">Bezig met samenvoegen...</span>
            </div>
          ) : showMergeDropdown ? (
            <div className="space-y-2 p-2 bg-purple-50 rounded">
              <p className="text-xs text-gray-600 font-medium">Voeg dit doel samen met:</p>
              <select
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                value={selectedMergeTarget}
                onChange={(e) => setSelectedMergeTarget(e.target.value)}
              >
                <option value="">-- Kies een doel --</option>
                {otherClusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (selectedMergeTarget && onMergeInto) {
                      setIsMergingLocal(true);
                      try {
                        await onMergeInto(selectedMergeTarget);
                      } catch (err) {
                        console.error("Merge error:", err);
                      } finally {
                        setIsMergingLocal(false);
                        setShowMergeDropdown(false);
                        setSelectedMergeTarget("");
                      }
                    }
                  }}
                  disabled={!selectedMergeTarget}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Samenvoegen
                </button>
                <button
                  onClick={() => {
                    setShowMergeDropdown(false);
                    setSelectedMergeTarget("");
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowMergeDropdown(true)}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
              </svg>
              Samenvoegen met ander doel...
            </button>
          )}
        </div>
      )}

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
  onEditClusterDescription?: (clusterId: string, newDescription: string) => void;
  editable?: boolean;
  // Sub-goals
  onAddSubGoal?: (clusterId: string, subGoal: SubGoal) => void;
  onRemoveSubGoal?: (clusterId: string, subGoalId: string) => void;
  onEditSubGoal?: (clusterId: string, subGoalId: string, name: string, description: string) => void;
  // Merge functionality
  isMergeMode?: boolean;
  mergeSelectedIds?: string[];
  onToggleMergeSelect?: (clusterId: string) => void;
  onUndoMerge?: (clusterId: string) => void;
  // Quick merge into another cluster
  onMergeInto?: (sourceClusterId: string, targetClusterId: string) => Promise<void>;
  // Delete cluster
  onDeleteCluster?: (clusterId: string) => void;
}

export function GoalClusterList({
  clusters,
  selectedIds,
  maxSelections = 3,
  onToggleSelect,
  onEditClusterName,
  onEditClusterDescription,
  editable = false,
  onAddSubGoal,
  onRemoveSubGoal,
  onEditSubGoal,
  isMergeMode = false,
  mergeSelectedIds = [],
  onToggleMergeSelect,
  onUndoMerge,
  onMergeInto,
  onDeleteCluster
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
            <div key={cluster.id}>
              <GoalCluster
                cluster={cluster}
                isSelected={isSelected}
                selectionNumber={isSelected ? selectionIndex + 1 : undefined}
                onSelect={canSelect ? () => onToggleSelect(cluster.id) : undefined}
                onEditName={
                  onEditClusterName
                    ? (name) => onEditClusterName(cluster.id, name)
                    : undefined
                }
                onEditDescription={
                  onEditClusterDescription
                    ? (description) => onEditClusterDescription(cluster.id, description)
                    : undefined
                }
                editable={editable}
                onAddSubGoal={
                  onAddSubGoal
                    ? (subGoal) => onAddSubGoal(cluster.id, subGoal)
                    : undefined
                }
                onRemoveSubGoal={
                  onRemoveSubGoal
                    ? (subGoalId) => onRemoveSubGoal(cluster.id, subGoalId)
                    : undefined
                }
                onEditSubGoal={
                  onEditSubGoal
                    ? (subGoalId, name, description) => onEditSubGoal(cluster.id, subGoalId, name, description)
                    : undefined
                }
                isMergeMode={isMergeMode}
                isSelectedForMerge={mergeSelectedIds.includes(cluster.id)}
                onToggleMergeSelect={
                  onToggleMergeSelect
                    ? () => onToggleMergeSelect(cluster.id)
                    : undefined
                }
                onUndoMerge={
                  onUndoMerge && cluster.mergedFrom && cluster.mergedFrom.length > 0
                    ? () => onUndoMerge(cluster.id)
                    : undefined
                }
                otherClusters={sortedClusters.filter((c) => c.id !== cluster.id)}
                onMergeInto={
                  onMergeInto
                    ? async (targetId) => await onMergeInto(cluster.id, targetId)
                    : undefined
                }
              />
              {onDeleteCluster && editable && !isMergeMode && (
                <div className="flex justify-end -mt-2 mb-1 pr-2">
                  <button
                    onClick={() => {
                      if (confirm(`Weet je zeker dat je "${cluster.name}" wilt verwijderen?`)) {
                        onDeleteCluster(cluster.id);
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Verwijderen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { GoalClusterType, Goal, SubGoal };
