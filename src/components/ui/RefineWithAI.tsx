"use client";

import { useState, useCallback } from "react";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

interface RefineWithAIProps {
  currentText: string;
  context?: string; // e.g., theme name, question type
  onRefined: (newText: string) => void;
  label?: string;
}

export function RefineWithAI({
  currentText,
  context,
  onRefined,
  label = "Verfijn met AI"
}: RefineWithAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSpeechResult = useCallback((text: string) => {
    setFeedback((prev) => (prev ? prev + " " + text : text));
  }, []);

  const { isListening, isSupported: speechSupported, toggleListening } =
    useSpeechRecognition(handleSpeechResult);

  const handleRefine = async () => {
    if (!feedback.trim()) return;
    if (isListening) toggleListening();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/refine-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText,
          context: context || "",
          feedback
        })
      });

      if (!response.ok) throw new Error("Verfijning mislukt");
      const result = await response.json();

      if (result.refinedText) {
        onRefined(result.refinedText);
        setFeedback("");
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setIsOpen(false);
        }, 1500);
      }
    } catch (err) {
      setError("Er ging iets mis bij het verfijnen. Probeer opnieuw.");
      console.error("Refine error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isListening) toggleListening();
    setIsOpen(false);
    setFeedback("");
    setError(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className="text-sm text-cito-blue hover:text-blue-800 flex items-center gap-1.5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {label}
      </button>
    );
  }

  return (
    <div className="p-3 bg-white/80 rounded-lg border border-cito-blue/30 mt-2" onClick={(e) => e.stopPropagation()}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Feedback voor AI-verfijning
      </label>
      <div className="relative">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); handleClose(); }
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && feedback.trim() && !isLoading) { e.preventDefault(); handleRefine(); }
          }}
          placeholder={isListening ? "Luisteren... spreek je feedback in" : "Typ of spreek je feedback in..."}
          rows={2}
          className={`w-full px-3 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue text-sm resize-none ${
            isListening ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
          disabled={isLoading}
          autoFocus
        />
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            className={`absolute right-2 top-2 p-1.5 rounded-full transition-colors ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-100 text-gray-500 hover:bg-cito-blue hover:text-white"
            }`}
            title={isListening ? "Stop opname" : "Spreek feedback in"}
            aria-label={isListening ? "Stop opname" : "Spreek feedback in"}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              {isListening ? (
                <path d="M6 6h12v12H6z" />
              ) : (
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              )}
            </svg>
          </button>
        )}
      </div>
      {isListening && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Luisteren... klik op het stopicoon om te stoppen
        </p>
      )}
      {error && (
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={handleRefine}
            className="text-xs text-cito-blue hover:underline"
          >
            Opnieuw proberen
          </button>
        </div>
      )}
      {saved && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Verfijnd en opgeslagen
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={handleRefine}
          disabled={!feedback.trim() || isLoading}
          className="px-3 py-1.5 bg-cito-blue text-white text-sm rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verfijnen...
            </>
          ) : (
            "Verfijn met AI"
          )}
        </button>
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
        >
          Annuleren
        </button>
        <span className="text-xs text-gray-400 ml-auto">Ctrl+Enter = verstuur, Esc = sluiten</span>
      </div>
    </div>
  );
}
