"use client";

import { useState } from "react";
import type { VoteValue } from "@/lib/types";

interface VoteButtonsProps {
  onVote: (value: VoteValue, comment?: string) => void;
  currentVote?: VoteValue;
  disabled?: boolean;
  showCommentOnDisagree?: boolean;
}

export function VoteButtons({
  onVote,
  currentVote,
  disabled = false,
  showCommentOnDisagree = true
}: VoteButtonsProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const handleVote = (value: VoteValue) => {
    if (value === "disagree" && showCommentOnDisagree) {
      setShowComment(true);
    } else {
      onVote(value);
      setShowComment(false);
      setComment("");
    }
  };

  const handleSubmitDisagree = () => {
    if (!comment.trim()) return;
    onVote("disagree", comment);
    setShowComment(false);
    setComment("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* Agree button */}
        <button
          onClick={() => handleVote("agree")}
          disabled={disabled}
          className={`vote-btn vote-btn-agree flex items-center gap-2 ${
            currentVote === "agree" ? "selected" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
              d="M5 13l4 4L19 7"
            />
          </svg>
          Akkoord
        </button>

        {/* Disagree button */}
        <button
          onClick={() => handleVote("disagree")}
          disabled={disabled}
          className={`vote-btn vote-btn-disagree flex items-center gap-2 ${
            currentVote === "disagree" ? "selected" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Bezwaar
        </button>

        {/* Abstain button */}
        <button
          onClick={() => handleVote("abstain")}
          disabled={disabled}
          className={`vote-btn vote-btn-abstain flex items-center gap-2 ${
            currentVote === "abstain" ? "selected" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
          Onthouding
        </button>
      </div>

      {/* Comment field for disagree */}
      {showComment && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <label className="block text-sm font-medium text-red-800 mb-2">
            Toelichting bij bezwaar (verplicht)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Geef aan waarom je bezwaar hebt..."
            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            rows={3}
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSubmitDisagree}
              disabled={!comment.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bezwaar indienen
            </button>
            <button
              onClick={() => {
                setShowComment(false);
                setComment("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
interface VoteButtonsCompactProps {
  onVote: (value: VoteValue) => void;
  currentVote?: VoteValue;
  disabled?: boolean;
}

export function VoteButtonsCompact({
  onVote,
  currentVote,
  disabled = false
}: VoteButtonsCompactProps) {
  return (
    <div className="flex gap-1">
      <button
        onClick={() => onVote("agree")}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors ${
          currentVote === "agree"
            ? "bg-green-500 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Akkoord"
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
            d="M5 13l4 4L19 7"
          />
        </svg>
      </button>

      <button
        onClick={() => onVote("disagree")}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors ${
          currentVote === "disagree"
            ? "bg-red-500 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Bezwaar"
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

      <button
        onClick={() => onVote("abstain")}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors ${
          currentVote === "abstain"
            ? "bg-gray-500 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        title="Onthouding"
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
            d="M20 12H4"
          />
        </svg>
      </button>
    </div>
  );
}
