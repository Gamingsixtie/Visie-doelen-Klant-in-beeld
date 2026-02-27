"use client";

import type { Vote, VoteValue } from "@/lib/types";

interface ConsentStatusProps {
  votes: Vote[];
  totalVoters: number;
  showNames?: boolean;
  showDetails?: boolean;
}

export function ConsentStatus({
  votes,
  totalVoters,
  showNames = true,
  showDetails = true
}: ConsentStatusProps) {
  const agreeVotes = votes.filter((v) => v.value === "agree");
  const disagreeVotes = votes.filter((v) => v.value === "disagree");
  const abstainVotes = votes.filter((v) => v.value === "abstain");

  const votedCount = votes.length;
  const pendingCount = totalVoters - votedCount;

  // Consent-based: approved if no disagrees
  const isApproved = votedCount > 0 && disagreeVotes.length === 0 && pendingCount === 0;
  const hasObjections = disagreeVotes.length > 0;
  const allVoted = pendingCount === 0;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`p-4 rounded-lg border-2 ${
          isApproved
            ? "bg-green-50 border-green-400"
            : hasObjections
            ? "bg-red-50 border-red-400"
            : allVoted
            ? "bg-green-50 border-green-300"
            : "bg-gray-50 border-gray-300"
        }`}
      >
        <div className="flex items-center gap-3">
          {isApproved ? (
            <>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
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
              <div>
                <p className="font-semibold text-green-800">Consent bereikt!</p>
                <p className="text-sm text-green-700">
                  Alle stemmen zijn binnen, geen bezwaren.
                </p>
              </div>
            </>
          ) : hasObjections ? (
            <>
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-red-800">
                  {disagreeVotes.length} bezwaar{disagreeVotes.length > 1 ? "en" : ""}
                </p>
                <p className="text-sm text-red-700">
                  Bezwaren moeten worden opgelost voordat consent kan worden bereikt.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Wachten op stemmen</p>
                <p className="text-sm text-gray-600">
                  {votedCount} van {totalVoters} stemmen ontvangen
                  {pendingCount > 0 && ` (${pendingCount} wachtend)`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Vote breakdown */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-3">
          {/* Agree */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">Akkoord</span>
              <span className="text-lg font-bold text-green-700">
                {agreeVotes.length}
              </span>
            </div>
            {showNames && agreeVotes.length > 0 && (
              <div className="text-xs text-green-600 space-y-1">
                {agreeVotes.map((vote) => (
                  <div key={vote.id}>{vote.respondentId}</div>
                ))}
              </div>
            )}
          </div>

          {/* Disagree */}
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-800">Bezwaar</span>
              <span className="text-lg font-bold text-red-700">
                {disagreeVotes.length}
              </span>
            </div>
            {showNames && disagreeVotes.length > 0 && (
              <div className="text-xs text-red-600 space-y-1">
                {disagreeVotes.map((vote) => (
                  <div key={vote.id}>
                    <span className="font-medium">{vote.respondentId}</span>
                    {vote.comment && (
                      <p className="text-red-500 italic mt-0.5">"{vote.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Abstain */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Onthouding</span>
              <span className="text-lg font-bold text-gray-600">
                {abstainVotes.length}
              </span>
            </div>
            {showNames && abstainVotes.length > 0 && (
              <div className="text-xs text-gray-500 space-y-1">
                {abstainVotes.map((vote) => (
                  <div key={vote.id}>{vote.respondentId}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Voortgang</span>
          <span>
            {votedCount}/{totalVoters} stemmen
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 transition-all"
              style={{
                width: `${(agreeVotes.length / totalVoters) * 100}%`
              }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{
                width: `${(disagreeVotes.length / totalVoters) * 100}%`
              }}
            />
            <div
              className="bg-gray-400 transition-all"
              style={{
                width: `${(abstainVotes.length / totalVoters) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline version
interface ConsentBadgeProps {
  votes: Vote[];
  totalVoters: number;
}

export function ConsentBadge({ votes, totalVoters }: ConsentBadgeProps) {
  const disagreeVotes = votes.filter((v) => v.value === "disagree");
  const votedCount = votes.length;
  const pendingCount = totalVoters - votedCount;
  const isApproved = votedCount > 0 && disagreeVotes.length === 0 && pendingCount === 0;

  if (isApproved) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Consent
      </span>
    );
  }

  if (disagreeVotes.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
        <svg
          className="w-3 h-3"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        {disagreeVotes.length} bezwaar
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
      {votedCount}/{totalVoters} stemmen
    </span>
  );
}
