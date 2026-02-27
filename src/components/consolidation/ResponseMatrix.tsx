"use client";

import { useState } from "react";
import type { StoredDocument, QuestionType, QUESTION_LABELS } from "@/lib/types";

interface ResponseMatrixProps {
  documents: StoredDocument[];
  questionTypes: QuestionType[];
  highlightConsensus?: boolean;
  onCellClick?: (docId: string, questionType: QuestionType) => void;
}

const QUESTION_DISPLAY_LABELS: Record<QuestionType, string> = {
  current_situation: "A: Huidige situatie",
  desired_situation: "B: Gewenste situatie",
  change_direction: "C: Beweging",
  stakeholders: "D: Belanghebbenden",
  goal_1: "Doel 1",
  goal_2: "Doel 2",
  goal_3: "Doel 3",
  out_of_scope: "Buiten scope"
};

const CATEGORY_COLORS: Record<string, string> = {
  visie: "bg-cito-light-blue",
  doelen: "bg-cito-light-green",
  scope: "bg-cito-light-orange"
};

export function ResponseMatrix({
  documents,
  questionTypes,
  highlightConsensus = true,
  onCellClick
}: ResponseMatrixProps) {
  const [expandedCell, setExpandedCell] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Get respondent names from filenames
  const respondents = documents.map((doc) => ({
    id: doc.id,
    name: doc.filename.replace(".docx", "").replace(/_/g, " ")
  }));

  // Calculate consensus for each question (simple text similarity check)
  const getConsensusLevel = (
    questionType: QuestionType
  ): Map<string, "consensus" | "unique" | "neutral"> => {
    const responses = documents.map((doc) => ({
      id: doc.id,
      text: doc.parsedResponses[questionType] || ""
    }));

    const cellLevels = new Map<string, "consensus" | "unique" | "neutral">();

    // Simple consensus detection based on keyword overlap
    const allKeywords = responses.map((r) =>
      r.text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );

    responses.forEach((response, index) => {
      if (!response.text) {
        cellLevels.set(response.id, "neutral");
        return;
      }

      const myKeywords = new Set(allKeywords[index]);
      let matchCount = 0;

      allKeywords.forEach((otherKeywords, otherIndex) => {
        if (otherIndex !== index) {
          const overlap = Array.from(myKeywords).filter((k) =>
            otherKeywords.includes(k)
          ).length;
          if (overlap >= 2) matchCount++;
        }
      });

      // If matches with more than half of others, it's consensus
      const threshold = Math.floor(responses.length / 2);
      if (matchCount >= threshold) {
        cellLevels.set(response.id, "consensus");
      } else if (matchCount === 0) {
        cellLevels.set(response.id, "unique");
      } else {
        cellLevels.set(response.id, "neutral");
      }
    });

    return cellLevels;
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getCellKey = (docId: string, questionType: QuestionType): string =>
    `${docId}-${questionType}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-3 text-left bg-gray-100 border-b-2 border-gray-300 font-semibold text-gray-700 sticky left-0 z-10 min-w-[150px]">
              Vraag
            </th>
            {respondents.map((respondent) => (
              <th
                key={respondent.id}
                className="p-3 text-left bg-gray-100 border-b-2 border-gray-300 font-semibold text-gray-700 min-w-[200px]"
              >
                {respondent.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questionTypes.map((questionType) => {
            const consensusLevels = highlightConsensus
              ? getConsensusLevel(questionType)
              : new Map();

            const category = questionType.startsWith("goal")
              ? "doelen"
              : questionType === "out_of_scope"
              ? "scope"
              : "visie";

            return (
              <tr key={questionType} className="hover:bg-gray-50">
                <td
                  className={`p-3 border-b border-r border-gray-200 font-medium text-gray-700 sticky left-0 z-10 ${CATEGORY_COLORS[category]}`}
                >
                  {QUESTION_DISPLAY_LABELS[questionType]}
                </td>
                {documents.map((doc) => {
                  const cellKey = getCellKey(doc.id, questionType);
                  const text = doc.parsedResponses[questionType] || "";
                  const consensusLevel = consensusLevels.get(doc.id) || "neutral";
                  const isExpanded = expandedCell === cellKey;
                  const isHovered = hoveredCell === cellKey;

                  let cellBgClass = "";
                  if (highlightConsensus && text) {
                    if (consensusLevel === "consensus") {
                      cellBgClass = "bg-consensus-high";
                    } else if (consensusLevel === "unique") {
                      cellBgClass = "bg-consensus-medium";
                    }
                  }

                  return (
                    <td
                      key={doc.id}
                      className={`matrix-cell ${cellBgClass} relative cursor-pointer transition-all`}
                      onClick={() => {
                        if (onCellClick) {
                          onCellClick(doc.id, questionType);
                        } else {
                          setExpandedCell(isExpanded ? null : cellKey);
                        }
                      }}
                      onMouseEnter={() => setHoveredCell(cellKey)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <div
                        className={`text-sm text-gray-700 ${
                          isExpanded ? "" : "line-clamp-3"
                        }`}
                      >
                        {text || (
                          <span className="text-gray-400 italic">
                            Niet ingevuld
                          </span>
                        )}
                      </div>

                      {/* Hover tooltip for long text */}
                      {isHovered && text && text.length > 100 && !isExpanded && (
                        <div className="absolute z-20 left-0 top-full mt-1 p-3 bg-white border border-gray-300 rounded-lg shadow-lg max-w-md">
                          <p className="text-sm text-gray-800">{text}</p>
                        </div>
                      )}

                      {/* Consensus indicator */}
                      {highlightConsensus && text && (
                        <div className="mt-1">
                          {consensusLevel === "consensus" && (
                            <span className="text-xs text-green-700 flex items-center gap-1">
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
                              Overeenkomst
                            </span>
                          )}
                          {consensusLevel === "unique" && (
                            <span className="text-xs text-orange-700 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Uniek perspectief
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      {highlightConsensus && (
        <div className="mt-4 flex gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-consensus-high" />
            <span>Overeenkomst (meerdere respondenten)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-consensus-medium" />
            <span>Uniek perspectief</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100" />
            <span>Neutraal</span>
          </div>
        </div>
      )}
    </div>
  );
}
