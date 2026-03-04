"use client";

import { useState } from "react";
import type { ThemeCluster, ThemeWithVotes } from "@/lib/types";
import { MT_MEMBERS } from "@/lib/types";

// Re-export for backwards compatibility
export type { ThemeWithVotes };

interface ThemeVotingProps {
  themes: ThemeCluster[];
  maxVotesPerPerson?: number;
  onVotesComplete: (votedThemes: ThemeWithVotes[]) => void;
}

type VoterVotes = Record<string, Record<string, number>>; // voter -> themeId -> votes

export function ThemeVoting({
  themes,
  maxVotesPerPerson = 3,
  onVotesComplete
}: ThemeVotingProps) {
  const [currentVoter, setCurrentVoter] = useState<string>(MT_MEMBERS[0]);
  const [allVotes, setAllVotes] = useState<VoterVotes>({});
  const [completedVoters, setCompletedVoters] = useState<string[]>([]);

  const currentVoterVotes = allVotes[currentVoter] || {};
  const totalVotesUsed = Object.values(currentVoterVotes).reduce((sum, v) => sum + v, 0);
  const remainingVotes = maxVotesPerPerson - totalVotesUsed;

  const handleVote = (themeId: string, increment: boolean) => {
    setAllVotes((prev) => {
      const voterVotes = prev[currentVoter] || {};
      const current = voterVotes[themeId] || 0;

      if (increment && remainingVotes > 0) {
        return {
          ...prev,
          [currentVoter]: { ...voterVotes, [themeId]: current + 1 }
        };
      } else if (!increment && current > 0) {
        return {
          ...prev,
          [currentVoter]: { ...voterVotes, [themeId]: current - 1 }
        };
      }
      return prev;
    });
  };

  const handleVoterComplete = () => {
    if (!completedVoters.includes(currentVoter)) {
      setCompletedVoters((prev) => [...prev, currentVoter]);
    }

    // Find next voter who hasn't voted
    const nextVoter = MT_MEMBERS.find(
      (m) => m !== currentVoter && !completedVoters.includes(m)
    );

    if (nextVoter) {
      setCurrentVoter(nextVoter);
    }
  };

  const handleAllComplete = () => {
    // Calculate total votes per theme
    const votedThemes: ThemeWithVotes[] = themes.map((theme) => {
      let totalVotes = 0;
      const votedBy: string[] = [];
      const voteDetails: Record<string, number> = {};

      Object.entries(allVotes).forEach(([voter, votes]) => {
        const voterThemeVotes = votes[theme.id] || 0;
        if (voterThemeVotes > 0) {
          totalVotes += voterThemeVotes;
          votedBy.push(voter);
          voteDetails[voter] = voterThemeVotes;
        }
      });

      return {
        ...theme,
        votes: totalVotes,
        votedBy,
        voteDetails
      };
    });

    // Sort by votes (highest first)
    votedThemes.sort((a, b) => b.votes - a.votes);
    onVotesComplete(votedThemes);
  };

  const allVotersComplete = completedVoters.length === MT_MEMBERS.length;

  return (
    <div className="space-y-6">
      {/* Voter selector */}
      <div className="bg-cito-light-blue rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-cito-blue">Stemmen per MT-lid</h3>
            <p className="text-sm text-gray-600">
              Elk MT-lid verdeelt {maxVotesPerPerson} punten over de belangrijkste thema's
            </p>
          </div>
          <div className="text-center bg-white rounded-lg px-4 py-2 shadow-sm">
            <div className="text-2xl font-bold text-cito-blue">{remainingVotes}</div>
            <div className="text-xs text-gray-600">punten over</div>
          </div>
        </div>

        {/* MT member tabs */}
        <div className="flex flex-wrap gap-2">
          {MT_MEMBERS.map((member) => {
            const isComplete = completedVoters.includes(member);
            const isCurrent = currentVoter === member;
            const memberVoteCount = Object.values(allVotes[member] || {}).reduce((s, v) => s + v, 0);

            return (
              <button
                key={member}
                onClick={() => setCurrentVoter(member)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isCurrent
                    ? "bg-cito-blue text-white shadow-md"
                    : isComplete
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-white text-gray-700 border border-gray-300 hover:border-cito-blue"
                }`}
              >
                {member}
                {isComplete && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {!isComplete && memberVoteCount > 0 && (
                  <span className="bg-cito-blue/20 px-1.5 py-0.5 rounded text-xs">
                    {memberVoteCount}/{maxVotesPerPerson}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current voter info */}
      <div className="bg-white rounded-lg border-2 border-cito-blue p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cito-blue rounded-full flex items-center justify-center text-white font-bold text-lg">
            {currentVoter.charAt(0)}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{currentVoter} is aan het stemmen</h4>
            <p className="text-sm text-gray-600">
              {totalVotesUsed}/{maxVotesPerPerson} punten verdeeld
            </p>
          </div>
        </div>
      </div>

      {/* Themes list with voting */}
      <div className="space-y-3">
        {themes.map((theme) => {
          const themeVotes = currentVoterVotes[theme.id] || 0;
          const totalThemeVotes = Object.values(allVotes).reduce(
            (sum, voterVotes) => sum + (voterVotes[theme.id] || 0),
            0
          );
          const consensusColor =
            theme.consensusLevel === "high"
              ? "border-l-green-500"
              : theme.consensusLevel === "medium"
              ? "border-l-orange-500"
              : "border-l-red-500";

          return (
            <div
              key={theme.id}
              className={`bg-white rounded-lg border-2 border-gray-200 border-l-4 ${consensusColor} p-4 transition-all ${
                themeVotes > 0 ? "ring-2 ring-cito-blue ring-offset-2" : ""
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Vote controls */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => handleVote(theme.id, true)}
                    disabled={remainingVotes === 0}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-cito-light-blue text-gray-600 hover:text-cito-blue flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <span className={`text-2xl font-bold ${themeVotes > 0 ? "text-cito-blue" : "text-gray-400"}`}>
                    {themeVotes}
                  </span>
                  <button
                    onClick={() => handleVote(theme.id, false)}
                    disabled={themeVotes === 0}
                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Theme content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-gray-900">{theme.name}</h4>
                    {totalThemeVotes > 0 && (
                      <span className="bg-cito-light-blue text-cito-blue px-2 py-1 rounded-full text-xs font-medium">
                        Totaal: {totalThemeVotes} punten
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{theme.description}</p>

                  {/* Example quotes */}
                  {theme.exampleQuotes && theme.exampleQuotes.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {theme.exampleQuotes.slice(0, 2).map((quote, idx) => (
                        <p key={idx} className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
                          "{quote.length > 100 ? quote.substring(0, 100) + "..." : quote}"
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {completedVoters.length}/{MT_MEMBERS.length} MT-leden hebben gestemd
        </div>

        <div className="flex gap-3">
          {!completedVoters.includes(currentVoter) && totalVotesUsed > 0 && (
            <button
              onClick={handleVoterComplete}
              className="btn btn-secondary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {currentVoter} klaar
            </button>
          )}

          {(allVotersComplete || completedVoters.length >= 1) && (
            <button
              onClick={handleAllComplete}
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Stemmen afsluiten & genereren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Component to show voting results
interface ThemeVotingResultsProps {
  votedThemes: ThemeWithVotes[];
  onProceed: () => void;
  onRevote: () => void;
}

export function ThemeVotingResults({
  votedThemes,
  onProceed,
  onRevote
}: ThemeVotingResultsProps) {
  const maxVotes = Math.max(...votedThemes.map((t) => t.votes), 1);

  return (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="font-semibold text-green-800">Stemmen ontvangen</h3>
        <p className="text-sm text-green-700">
          Hieronder zie je de ranking op basis van de gegeven punten
        </p>
      </div>

      <div className="space-y-3">
        {votedThemes.map((theme, index) => (
          <div
            key={theme.id}
            className={`bg-white rounded-lg border p-4 ${
              index === 0 ? "border-2 border-cito-blue" : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                index === 0
                  ? "bg-cito-blue text-white"
                  : index === 1
                  ? "bg-gray-300 text-gray-700"
                  : index === 2
                  ? "bg-orange-200 text-orange-800"
                  : "bg-gray-100 text-gray-500"
              }`}>
                #{index + 1}
              </div>

              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{theme.name}</h4>
                <p className="text-sm text-gray-600">{theme.description}</p>
                {theme.votedBy.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Gestemd door: {theme.votedBy.join(", ")}
                  </p>
                )}
              </div>

              <div className="w-32">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cito-blue rounded-full transition-all"
                      style={{ width: `${(theme.votes / maxVotes) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-6">
                    {theme.votes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={onRevote} className="btn btn-secondary">
          Opnieuw stemmen
        </button>
        <button onClick={onProceed} className="btn btn-primary flex items-center gap-2">
          Genereer formuleringen
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
