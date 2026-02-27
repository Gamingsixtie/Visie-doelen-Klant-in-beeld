"use client";

import type { StoredDocument, QUESTION_LABELS } from "@/lib/types";

interface DocumentListProps {
  documents: StoredDocument[];
  onRemove?: (docId: string) => void;
  showPreview?: boolean;
}

export function DocumentList({
  documents,
  onRemove,
  showPreview = false
}: DocumentListProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">
        Geüploade documenten ({documents.length})
      </h3>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="card flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              {/* Document icon */}
              <div className="w-10 h-10 bg-cito-light-blue rounded flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-cito-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* Document info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {doc.filename}
                </h4>
                <p className="text-sm text-gray-500">
                  Geüpload:{" "}
                  {new Date(doc.uploadedAt).toLocaleTimeString("nl-NL", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>

                {/* Preview of parsed responses */}
                {showPreview && doc.parsedResponses && (
                  <div className="mt-2 text-xs text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(doc.parsedResponses).map(
                        ([key, value]) =>
                          value && (
                            <span
                              key={key}
                              className="px-2 py-0.5 bg-green-100 text-green-700 rounded"
                            >
                              {key.replace(/_/g, " ")}
                            </span>
                          )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {onRemove && (
              <button
                onClick={() => onRemove(doc.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Verwijderen"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}

            {/* Success indicator */}
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
