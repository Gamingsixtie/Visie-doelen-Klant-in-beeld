"use client";

import { useCallback, useState } from "react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  disabled?: boolean;
}

export function DropZone({
  onFilesSelected,
  acceptedTypes = [".docx"],
  maxFiles = 10,
  disabled = false
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = [];

      for (const file of files) {
        // Check file type
        const extension = "." + file.name.split(".").pop()?.toLowerCase();
        if (!acceptedTypes.includes(extension)) {
          setError(
            `Bestand "${file.name}" is geen geldig formaat. Alleen ${acceptedTypes.join(", ")} toegestaan.`
          );
          continue;
        }

        validFiles.push(file);
      }

      // Check max files
      if (validFiles.length > maxFiles) {
        setError(`Maximaal ${maxFiles} bestanden toegestaan.`);
        return validFiles.slice(0, maxFiles);
      }

      return validFiles;
    },
    [acceptedTypes, maxFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [disabled, validateFiles, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);

      const files = Array.from(e.target.files || []);
      const validFiles = validateFiles(files);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }

      // Reset input
      e.target.value = "";
    },
    [validateFiles, onFilesSelected]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${
            isDragging
              ? "border-cito-blue bg-cito-light-blue"
              : "border-gray-300 hover:border-cito-blue hover:bg-gray-50"
          }
        `}
      >
        <input
          type="file"
          id="file-input"
          accept={acceptedTypes.join(",")}
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <label
          htmlFor="file-input"
          className={`flex flex-col items-center ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isDragging ? "bg-cito-blue" : "bg-gray-100"
            }`}
          >
            <svg
              className={`w-8 h-8 ${isDragging ? "text-white" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <p className="text-lg font-medium text-gray-900 mb-1">
            {isDragging
              ? "Laat los om te uploaden"
              : "Sleep bestanden hierheen"}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            of klik om bestanden te selecteren
          </p>
          <p className="text-xs text-gray-400">
            Alleen .docx bestanden • Maximaal {maxFiles} bestanden
          </p>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
