"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/lib/session-context";
import { DropZone, DocumentList, ParsedPreview } from "@/components/upload";
import type { QuestionType } from "@/lib/types";

interface UploadStepProps {
  onComplete: () => void;
}

interface UploadingFile {
  file: File;
  status: "uploading" | "parsing" | "done" | "error";
  progress: number;
  error?: string;
}

type ViewMode = "upload" | "preview";

export function UploadStep({ onComplete }: UploadStepProps) {
  const { documents, addDocument, removeDocument, updateDocumentResponse } =
    useSession();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setIsProcessing(true);

      // Initialize uploading state
      const newUploadingFiles: UploadingFile[] = files.map((file) => ({
        file,
        status: "uploading",
        progress: 0
      }));
      setUploadingFiles(newUploadingFiles);

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Update status to parsing
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "parsing", progress: 50 } : f
            )
          );

          // Parse the document
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/parse-document", {
            method: "POST",
            body: formData
          });

          if (!response.ok) {
            throw new Error("Fout bij het verwerken van het document");
          }

          const result = await response.json();

          // Add document to session
          addDocument({
            filename: file.name,
            respondentId: result.respondent?.id || `respondent-${Date.now()}`,
            uploadedAt: new Date(),
            rawText: result.rawText || "",
            parsedResponses: result.responses || {}
          });

          // Update status to done
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "done", progress: 100 } : f
            )
          );
        } catch (error) {
          // Update status to error
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? {
                    ...f,
                    status: "error",
                    error:
                      error instanceof Error
                        ? error.message
                        : "Onbekende fout"
                  }
                : f
            )
          );
        }
      }

      setIsProcessing(false);

      // Clear uploading files after a delay and show preview
      setTimeout(() => {
        setUploadingFiles([]);
        if (documents.length > 0 || files.length > 0) {
          setViewMode("preview");
        }
      }, 1500);
    },
    [addDocument, documents.length]
  );

  const handleEditResponse = (
    docId: string,
    questionType: QuestionType,
    newText: string
  ) => {
    updateDocumentResponse(docId, questionType, newText);
  };

  const canProceed = documents.length >= 1;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Stap 1: Documenten uploaden
          </h1>
          <p className="text-gray-600">
            Upload de ingevulde MT-canvassen (Word documenten). De app zal
            automatisch de antwoorden extraheren per vraag.
          </p>

          {/* View mode toggle */}
          {documents.length > 0 && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setViewMode("upload")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "upload"
                    ? "bg-cito-blue text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Documenten ({documents.length})
              </button>
              <button
                onClick={() => setViewMode("preview")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "preview"
                    ? "bg-cito-blue text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Preview & Bewerken
              </button>
            </div>
          )}
        </div>

        {viewMode === "upload" && (
          <>
            {/* Drop Zone */}
            <div className="mb-8">
              <DropZone
                onFilesSelected={handleFilesSelected}
                acceptedTypes={[".docx"]}
                maxFiles={10}
                disabled={isProcessing}
              />
            </div>

            {/* Uploading Progress */}
            {uploadingFiles.length > 0 && (
              <div className="mb-8 space-y-2">
                {uploadingFiles.map((uf, index) => (
                  <div
                    key={index}
                    className="card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {uf.status === "uploading" || uf.status === "parsing" ? (
                        <div className="spinner" />
                      ) : uf.status === "done" ? (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                      )}
                      <span className="text-sm text-gray-700">{uf.file.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {uf.status === "uploading"
                        ? "Uploaden..."
                        : uf.status === "parsing"
                        ? "AI verwerkt document..."
                        : uf.status === "done"
                        ? "Klaar"
                        : uf.error}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Uploaded Documents */}
            <DocumentList
              documents={documents}
              onRemove={removeDocument}
              showPreview
            />

            {/* Help text */}
            <div className="mt-8 p-4 bg-cito-light-blue rounded-lg">
              <h3 className="font-medium text-cito-blue mb-2">
                Verwacht formaat
              </h3>
              <p className="text-sm text-gray-700">
                Upload de ingevulde MT-canvassen als Word documenten (.docx). De
                app herkent automatisch:
              </p>
              <ul className="text-sm text-gray-700 mt-2 ml-4 list-disc space-y-1">
                <li>Visie vraag A: Huidige situatie</li>
                <li>Visie vraag B: Gewenste situatie</li>
                <li>Visie vraag C: Beweging/verandering</li>
                <li>Doelen 1, 2 en 3</li>
                <li>Wat buiten scope valt</li>
              </ul>
            </div>
          </>
        )}

        {viewMode === "preview" && (
          <>
            {/* Parsed Preview */}
            <ParsedPreview
              documents={documents}
              onEditResponse={handleEditResponse}
            />

            {/* Back to upload */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setViewMode("upload")}
                className="text-sm text-cito-blue hover:underline flex items-center gap-1"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Meer documenten toevoegen
              </button>
            </div>
          </>
        )}

        {/* Proceed Button */}
        {documents.length > 0 && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={onComplete}
              disabled={!canProceed}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Bevestigen & Doorgaan naar Visie
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
