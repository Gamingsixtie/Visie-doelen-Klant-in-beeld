"use client";

import { useState } from "react";
import type { StoredDocument, QuestionType } from "@/lib/types";

interface ParsedPreviewProps {
  documents: StoredDocument[];
  onEditResponse: (docId: string, questionType: QuestionType, newText: string) => void;
}

const QUESTION_LABELS: Record<QuestionType, string> = {
  current_situation: "Visie A: Huidige situatie",
  desired_situation: "Visie B: Gewenste situatie",
  change_direction: "Visie C: Beweging",
  stakeholders: "Visie D: Belanghebbenden",
  goal_1: "Doel 1",
  goal_2: "Doel 2",
  goal_3: "Doel 3",
  out_of_scope: "Buiten scope"
};

const QUESTION_ORDER: QuestionType[] = [
  "current_situation",
  "desired_situation",
  "change_direction",
  "stakeholders",
  "goal_1",
  "goal_2",
  "goal_3",
  "out_of_scope"
];

export function ParsedPreview({ documents, onEditResponse }: ParsedPreviewProps) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(
    new Set(documents.map((d) => d.id))
  );
  const [editingField, setEditingField] = useState<{
    docId: string;
    questionType: QuestionType;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleExpand = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  const startEditing = (
    docId: string,
    questionType: QuestionType,
    currentValue: string
  ) => {
    setEditingField({ docId, questionType });
    setEditValue(currentValue || "");
  };

  const saveEdit = () => {
    if (editingField) {
      onEditResponse(editingField.docId, editingField.questionType, editValue);
      setEditingField(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  // Calculate completeness
  const calculateCompleteness = (doc: StoredDocument) => {
    let filled = 0;
    QUESTION_ORDER.forEach((qt) => {
      if (doc.parsedResponses[qt]) filled++;
    });
    return Math.round((filled / QUESTION_ORDER.length) * 100);
  };

  // Total stats
  const totalQuestions = documents.length * QUESTION_ORDER.length;
  const filledQuestions = documents.reduce((sum, doc) => {
    return (
      sum + QUESTION_ORDER.filter((qt) => doc.parsedResponses[qt]).length
    );
  }, 0);
  const overallCompleteness = Math.round((filledQuestions / totalQuestions) * 100);

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall stats */}
      <div className="p-4 bg-cito-light-blue rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-cito-blue">
              Geextraheerde data preview
            </h3>
            <p className="text-sm text-gray-600">
              {documents.length} document{documents.length !== 1 ? "en" : ""} verwerkt
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-cito-blue">
              {overallCompleteness}%
            </div>
            <p className="text-xs text-gray-500">completeness</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              overallCompleteness === 100 ? "bg-green-500" : "bg-cito-blue"
            }`}
            style={{ width: `${overallCompleteness}%` }}
          />
        </div>
      </div>

      {/* Document previews */}
      <div className="space-y-4">
        {documents.map((doc) => {
          const isExpanded = expandedDocs.has(doc.id);
          const completeness = calculateCompleteness(doc);

          return (
            <div key={doc.id} className="card">
              {/* Document header */}
              <button
                onClick={() => toggleExpand(doc.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      completeness === 100
                        ? "bg-green-100 text-green-600"
                        : completeness >= 50
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {completeness === 100 ? (
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
                    ) : (
                      <span className="text-sm font-bold">{completeness}%</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {doc.filename.replace(".docx", "")}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {QUESTION_ORDER.filter((qt) => doc.parsedResponses[qt]).length} van{" "}
                      {QUESTION_ORDER.length} velden ingevuld
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
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

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  {QUESTION_ORDER.map((questionType) => {
                    const value = doc.parsedResponses[questionType];
                    const isEditing =
                      editingField?.docId === doc.id &&
                      editingField?.questionType === questionType;
                    const isEmpty = !value;

                    return (
                      <div
                        key={questionType}
                        className={`p-3 rounded-lg ${
                          isEmpty
                            ? "bg-red-50 border border-red-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-sm font-medium ${
                              isEmpty ? "text-red-700" : "text-gray-700"
                            }`}
                          >
                            {QUESTION_LABELS[questionType]}
                          </span>
                          {!isEditing && (
                            <button
                              onClick={() =>
                                startEditing(doc.id, questionType, value || "")
                              }
                              className="text-xs text-cito-blue hover:underline"
                            >
                              Bewerken
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cito-blue focus:border-cito-blue text-sm resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                className="px-3 py-1 bg-cito-blue text-white text-sm rounded hover:bg-blue-800"
                              >
                                Opslaan
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                              >
                                Annuleren
                              </button>
                            </div>
                          </div>
                        ) : isEmpty ? (
                          <p className="text-sm text-red-600 italic">
                            Niet gevonden - klik op "Bewerken" om toe te voegen
                          </p>
                        ) : (
                          <p className="text-sm text-gray-800 line-clamp-3">
                            {value}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation summary */}
      {documents.some((doc) =>
        QUESTION_ORDER.some((qt) => !doc.parsedResponses[qt])
      ) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
            <div>
              <h4 className="font-medium text-yellow-800">
                Sommige velden ontbreken
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Niet alle velden konden automatisch worden geextraheerd. Je kunt
                ontbrekende velden handmatig invullen door op "Bewerken" te
                klikken, of doorgaan zonder deze data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for document list
interface ParsedPreviewCompactProps {
  document: StoredDocument;
}

export function ParsedPreviewCompact({ document }: ParsedPreviewCompactProps) {
  const filledCount = QUESTION_ORDER.filter(
    (qt) => document.parsedResponses[qt]
  ).length;
  const completeness = Math.round((filledCount / QUESTION_ORDER.length) * 100);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          completeness === 100
            ? "bg-green-100 text-green-700"
            : completeness >= 50
            ? "bg-yellow-100 text-yellow-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {completeness === 100 ? (
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
        ) : (
          `${completeness}%`
        )}
      </div>
      <span className="text-xs text-gray-500">
        {filledCount}/{QUESTION_ORDER.length} velden
      </span>
    </div>
  );
}
