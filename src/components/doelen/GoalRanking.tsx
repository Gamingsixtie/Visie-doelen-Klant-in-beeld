"use client";

import { useState } from "react";
import type { GoalClusterType } from "./GoalCluster";

interface GoalRankingProps {
  clusters: GoalClusterType[];
  initialRanking?: string[]; // Array of cluster IDs in rank order
  onRankingChange: (ranking: string[]) => void;
  maxRanks?: number;
}

export function GoalRanking({
  clusters,
  initialRanking = [],
  onRankingChange,
  maxRanks = 3
}: GoalRankingProps) {
  const [ranking, setRanking] = useState<string[]>(initialRanking);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const rankedClusters = ranking
    .map((id) => clusters.find((c) => c.id === id))
    .filter(Boolean) as GoalClusterType[];

  const unrankedClusters = clusters.filter((c) => !ranking.includes(c.id));

  const handleAddToRanking = (clusterId: string) => {
    if (ranking.length >= maxRanks) return;

    const newRanking = [...ranking, clusterId];
    setRanking(newRanking);
    onRankingChange(newRanking);
  };

  const handleRemoveFromRanking = (clusterId: string) => {
    const newRanking = ranking.filter((id) => id !== clusterId);
    setRanking(newRanking);
    onRankingChange(newRanking);
  };

  const handleDragStart = (clusterId: string) => {
    setDraggedId(clusterId);
  };

  const handleDragOver = (e: React.DragEvent, clusterId: string) => {
    e.preventDefault();
    setDragOverId(clusterId);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = ranking.indexOf(draggedId);
    const targetIndex = ranking.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newRanking = [...ranking];
    newRanking.splice(draggedIndex, 1);
    newRanking.splice(targetIndex, 0, draggedId);

    setRanking(newRanking);
    onRankingChange(newRanking);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newRanking = [...ranking];
    [newRanking[index - 1], newRanking[index]] = [
      newRanking[index],
      newRanking[index - 1]
    ];

    setRanking(newRanking);
    onRankingChange(newRanking);
  };

  const handleMoveDown = (index: number) => {
    if (index === ranking.length - 1) return;

    const newRanking = [...ranking];
    [newRanking[index], newRanking[index + 1]] = [
      newRanking[index + 1],
      newRanking[index]
    ];

    setRanking(newRanking);
    onRankingChange(newRanking);
  };

  return (
    <div className="space-y-6">
      {/* Ranked goals */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-cito-blue text-white rounded-full flex items-center justify-center text-sm">
            {ranking.length}
          </span>
          Top {maxRanks} Doelen
        </h3>

        {ranking.length === 0 ? (
          <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <p className="text-gray-500">
              Sleep of klik op doelen hieronder om je top {maxRanks} samen te
              stellen
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankedClusters.map((cluster, index) => (
              <div
                key={cluster.id}
                draggable
                onDragStart={() => handleDragStart(cluster.id)}
                onDragOver={(e) => handleDragOver(e, cluster.id)}
                onDrop={() => handleDrop(cluster.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing ${
                  draggedId === cluster.id
                    ? "opacity-50 border-cito-blue"
                    : dragOverId === cluster.id
                    ? "border-cito-blue bg-cito-light-blue"
                    : "border-cito-blue bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                        ? "bg-gray-400"
                        : index === 2
                        ? "bg-orange-600"
                        : "bg-cito-blue"
                    }`}
                  >
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {cluster.name}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {cluster.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Move up */}
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={`p-2 rounded transition-colors ${
                        index === 0
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      title="Omhoog"
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
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>

                    {/* Move down */}
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === ranking.length - 1}
                      className={`p-2 rounded transition-colors ${
                        index === ranking.length - 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      title="Omlaag"
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
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Drag handle */}
                    <div className="p-2 text-gray-400 cursor-grab">
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
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemoveFromRanking(cluster.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {ranking.length > 0 && ranking.length < maxRanks && (
          <p className="text-sm text-gray-500 text-center">
            Nog {maxRanks - ranking.length} doel
            {maxRanks - ranking.length > 1 ? "en" : ""} kiezen
          </p>
        )}
      </div>

      {/* Available goals */}
      {unrankedClusters.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Beschikbare doelen</h3>

          <div className="grid gap-2">
            {unrankedClusters.map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => handleAddToRanking(cluster.id)}
                disabled={ranking.length >= maxRanks}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  ranking.length >= maxRanks
                    ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 bg-white hover:border-cito-blue hover:bg-cito-light-blue cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400">
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {cluster.name}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {cluster.description}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full">
                    {cluster.goals.length} respondent
                    {cluster.goals.length > 1 ? "en" : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Summary card for final ranking
interface RankingSummaryProps {
  clusters: GoalClusterType[];
  ranking: string[];
}

export function RankingSummary({ clusters, ranking }: RankingSummaryProps) {
  const rankedClusters = ranking
    .map((id) => clusters.find((c) => c.id === id))
    .filter(Boolean) as GoalClusterType[];

  if (rankedClusters.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
        Geen doelen gerangschikt
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Gekozen Top {ranking.length}</h3>

      <div className="space-y-3">
        {rankedClusters.map((cluster, index) => (
          <div
            key={cluster.id}
            className="p-4 bg-cito-light-blue rounded-lg border-l-4 border-cito-blue"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                  index === 0
                    ? "bg-yellow-500"
                    : index === 1
                    ? "bg-gray-400"
                    : index === 2
                    ? "bg-orange-600"
                    : "bg-cito-blue"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{cluster.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {cluster.description}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {cluster.goals.length} MT-lid
                  {cluster.goals.length > 1 ? "en" : ""} ondersteunen dit doel
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
