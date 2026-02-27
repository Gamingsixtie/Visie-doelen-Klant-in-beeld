"use client";

import { useState } from "react";
import type { GoalClusterType } from "./GoalCluster";

interface DotVotingProps {
  clusters: GoalClusterType[];
  totalDots: number; // Number of dots each voter gets
  onVotesChange: (votes: Record<string, number>) => void;
  currentVotes?: Record<string, number>;
  voterName?: string;
}

export function DotVoting({
  clusters,
  totalDots = 3,
  onVotesChange,
  currentVotes = {},
  voterName = "Jij"
}: DotVotingProps) {
  const [votes, setVotes] = useState<Record<string, number>>(currentVotes);

  const usedDots = Object.values(votes).reduce((sum, v) => sum + v, 0);
  const remainingDots = totalDots - usedDots;

  const handleAddDot = (clusterId: string) => {
    if (remainingDots <= 0) return;

    const newVotes = {
      ...votes,
      [clusterId]: (votes[clusterId] || 0) + 1
    };
    setVotes(newVotes);
    onVotesChange(newVotes);
  };

  const handleRemoveDot = (clusterId: string) => {
    if (!votes[clusterId] || votes[clusterId] <= 0) return;

    const newVotes = {
      ...votes,
      [clusterId]: votes[clusterId] - 1
    };
    if (newVotes[clusterId] === 0) {
      delete newVotes[clusterId];
    }
    setVotes(newVotes);
    onVotesChange(newVotes);
  };

  // Sort clusters by total votes
  const sortedClusters = [...clusters].sort(
    (a, b) => (votes[b.id] || 0) - (votes[a.id] || 0)
  );

  return (
    <div className="space-y-6">
      {/* Dots indicator */}
      <div className="p-4 bg-cito-light-blue rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-cito-blue">
            {voterName}: Jouw stemmen
          </span>
          <span className="text-sm text-gray-600">
            {remainingDots} van {totalDots} punten over
          </span>
        </div>

        {/* Dot visualization */}
        <div className="flex gap-2">
          {Array.from({ length: totalDots }).map((_, index) => (
            <div
              key={index}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                index < usedDots
                  ? "bg-cito-blue border-cito-blue"
                  : "bg-white border-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Voting cards */}
      <div className="space-y-3">
        {sortedClusters.map((cluster) => {
          const clusterVotes = votes[cluster.id] || 0;

          return (
            <div
              key={cluster.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                clusterVotes > 0
                  ? "border-cito-blue bg-cito-light-blue"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{cluster.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {cluster.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {cluster.goals.length} respondent
                    {cluster.goals.length > 1 ? "en" : ""} noemden dit
                  </p>
                </div>

                {/* Voting controls */}
                <div className="flex items-center gap-3">
                  {/* Current votes for this cluster */}
                  <div className="flex gap-1">
                    {Array.from({ length: clusterVotes }).map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 bg-cito-blue rounded-full"
                      />
                    ))}
                  </div>

                  {/* Vote buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleAddDot(cluster.id)}
                      disabled={remainingDots <= 0}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                        remainingDots > 0
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                      title="Stem toevoegen"
                    >
                      <svg
                        className="w-5 h-5"
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
                    </button>
                    <button
                      onClick={() => handleRemoveDot(cluster.id)}
                      disabled={clusterVotes <= 0}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                        clusterVotes > 0
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                      title="Stem verwijderen"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 12H4"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results summary */}
      {usedDots > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Jouw stemverdeling</h4>
          <div className="space-y-2">
            {Object.entries(votes)
              .filter(([_, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([clusterId, count]) => {
                const cluster = clusters.find((c) => c.id === clusterId);
                if (!cluster) return null;

                return (
                  <div
                    key={clusterId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700">{cluster.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: count }).map((_, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 bg-cito-blue rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {count} punt{count > 1 ? "en" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// Results view for dot voting
interface DotVotingResultsProps {
  clusters: GoalClusterType[];
  allVotes: Record<string, Record<string, number>>; // voterName -> clusterId -> votes
}

export function DotVotingResults({ clusters, allVotes }: DotVotingResultsProps) {
  // Calculate total votes per cluster
  const totals: Record<string, number> = {};
  clusters.forEach((c) => {
    totals[c.id] = 0;
  });

  Object.values(allVotes).forEach((voterVotes) => {
    Object.entries(voterVotes).forEach(([clusterId, count]) => {
      totals[clusterId] = (totals[clusterId] || 0) + count;
    });
  });

  const maxVotes = Math.max(...Object.values(totals), 1);
  const sortedClusters = [...clusters].sort(
    (a, b) => (totals[b.id] || 0) - (totals[a.id] || 0)
  );

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Stemresultaten</h3>

      <div className="space-y-3">
        {sortedClusters.map((cluster, index) => {
          const votes = totals[cluster.id] || 0;
          const percentage = (votes / maxVotes) * 100;
          const isTop3 = index < 3;

          return (
            <div
              key={cluster.id}
              className={`p-4 rounded-lg border-2 ${
                isTop3
                  ? "border-cito-blue bg-cito-light-blue"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isTop3 && (
                    <span className="w-6 h-6 bg-cito-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                  )}
                  <span className="font-medium text-gray-900">
                    {cluster.name}
                  </span>
                </div>
                <span className="font-bold text-cito-blue">
                  {votes} punt{votes !== 1 ? "en" : ""}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isTop3 ? "bg-cito-blue" : "bg-gray-400"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
