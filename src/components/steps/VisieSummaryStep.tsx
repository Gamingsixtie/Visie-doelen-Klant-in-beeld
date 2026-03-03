"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/components/ui";
import { RefineWithAI } from "@/components/ui/RefineWithAI";
import * as persistence from "@/lib/persistence";

interface VisieSummaryStepProps {
  onComplete: () => void;
  onNavigateToStep?: (step: "visie_huidige" | "visie_gewenste" | "visie_beweging" | "visie_stakeholders") => void;
}

export function VisieSummaryStep({ onComplete, onNavigateToStep }: VisieSummaryStepProps) {
  const { getApprovedText, currentSession, updateFlowState, flowState } = useSession();
  const { showToast } = useToast();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isGeneratingVision, setIsGeneratingVision] = useState(false);
  const [generatedVision, setGeneratedVision] = useState<{
    uitgebreid: string;
    beknopt: string;
  } | null>(null);
  const [showGeneratedVision, setShowGeneratedVision] = useState(false);
  const [activeVisionTab, setActiveVisionTab] = useState<"uitgebreid" | "beknopt">("uitgebreid");
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [editedVisionText, setEditedVisionText] = useState("");

  const huidige = getApprovedText("current_situation");
  const gewenste = getApprovedText("desired_situation");
  const beweging = getApprovedText("change_direction");
  const stakeholders = getApprovedText("stakeholders");

  const allPartsComplete = huidige && gewenste && beweging && stakeholders;

  // Load saved generated vision on mount and check if already confirmed
  useEffect(() => {
    if (!currentSession) return;

    // Check if visie_samenvatting is already completed
    if (flowState.steps.visie_samenvatting === "completed") {
      setIsConfirmed(true);
    }

    const savedVision = persistence.getGeneratedVision(currentSession.id);
    if (savedVision) {
      setGeneratedVision({
        uitgebreid: savedVision.uitgebreid,
        beknopt: savedVision.beknopt
      });
      setShowGeneratedVision(true);
    }
  }, [currentSession, flowState.steps.visie_samenvatting]);

  // Generate combined vision when all parts are complete
  const handleGenerateVision = async () => {
    if (!allPartsComplete || !currentSession) return;

    setIsGeneratingVision(true);
    try {
      // Collect themes from all analyses
      const questionTypes = ["current_situation", "desired_situation", "change_direction", "stakeholders"] as const;
      const allThemes: Array<{ name: string; votes?: number; questionType: string }> = [];

      questionTypes.forEach(qt => {
        const analysis = persistence.getAnalysis(currentSession.id, qt);
        if (analysis && analysis.themes) {
          analysis.themes.forEach(theme => {
            allThemes.push({
              name: theme.name,
              votes: (theme as { votes?: number }).votes,
              questionType: qt
            });
          });
        }
      });

      const response = await fetch("/api/generate-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSituation: huidige?.text,
          desiredSituation: gewenste?.text,
          changeDirection: beweging?.text,
          stakeholders: stakeholders?.text,
          themes: allThemes.length > 0 ? allThemes : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        const visionData = {
          uitgebreid: result.uitgebreid || result.vision || "",
          beknopt: result.beknopt || ""
        };
        setGeneratedVision(visionData);
        setShowGeneratedVision(true);

        // Save to persistence
        if (currentSession) {
          persistence.saveGeneratedVision(
            currentSession.id,
            visionData.uitgebreid,
            visionData.beknopt
          );
        }
      }
    } catch (error) {
      console.error("Failed to generate vision:", error);
    } finally {
      setIsGeneratingVision(false);
    }
  };

  // Save edited vision to persistence
  const handleSaveEditedVision = () => {
    if (generatedVision && currentSession) {
      const updatedVision = {
        ...generatedVision,
        [activeVisionTab]: editedVisionText
      };
      setGeneratedVision(updatedVision);

      // Save to persistence
      persistence.saveGeneratedVision(
        currentSession.id,
        updatedVision.uitgebreid,
        updatedVision.beknopt
      );
    }
    setIsEditingVision(false);
  };

  const handleConfirm = () => {
    // Update flow state to mark visie_samenvatting as approved
    updateFlowState({
      steps: {
        ...flowState.steps,
        visie_samenvatting: "completed"
      }
    });

    setIsConfirmed(true);
    showToast("Visie volledig vastgesteld!", "success");
    onComplete();
  };

  const visieItems: Array<{
    key: string;
    label: string;
    subtitle: string;
    text: string | undefined;
    color: string;
    icon: string;
    step: "visie_huidige" | "visie_gewenste" | "visie_beweging" | "visie_stakeholders";
  }> = [
    {
      key: "huidige",
      label: "A. Huidige Situatie",
      subtitle: "Waar staan we nu?",
      text: huidige?.text,
      color: "border-l-blue-500",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      step: "visie_huidige"
    },
    {
      key: "gewenste",
      label: "B. Gewenste Situatie",
      subtitle: "Waar willen we naartoe?",
      text: gewenste?.text,
      color: "border-l-green-500",
      icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
      step: "visie_gewenste"
    },
    {
      key: "beweging",
      label: "C. Beweging",
      subtitle: "Welke verandering is nodig?",
      text: beweging?.text,
      color: "border-l-orange-500",
      icon: "M13 7l5 5m0 0l-5 5m5-5H6",
      step: "visie_beweging"
    },
    {
      key: "stakeholders",
      label: "D. Belanghebbenden",
      subtitle: "Voor wie is dit relevant?",
      text: stakeholders?.text,
      color: "border-l-purple-500",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      step: "visie_stakeholders"
    }
  ];

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-cito-blue rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Visie Samenvatting
              </h1>
              <p className="text-gray-600">
                Overzicht van de complete visie op basis van alle antwoorden
              </p>
            </div>
          </div>
        </div>

        {/* Visie Overview Card */}
        <div className="card bg-gradient-to-br from-cito-light-blue to-white border-2 border-cito-blue mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-cito-blue mb-2">
              Vastgestelde Visie
            </h2>
            <p className="text-gray-600">
              De volgende onderdelen vormen samen de visie van het programma
            </p>
          </div>

          <div className="space-y-6">
            {visieItems.map((item, index) => (
              <div
                key={item.key}
                className={`bg-white rounded-lg border-l-4 ${item.color} p-5 shadow-sm animate-slide-in-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      {item.text && (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{item.subtitle}</p>
                    {item.text ? (
                      <div>
                        <p className="text-gray-800 leading-relaxed">{item.text}</p>
                        {onNavigateToStep && (
                          <button
                            onClick={() => onNavigateToStep(item.step)}
                            className="mt-2 text-sm text-cito-blue hover:underline flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Wijzigen
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-500 italic">Nog niet ingevuld</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Status */}
        {allPartsComplete ? (
          <div className="space-y-6">
            {/* Success message */}
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Alle onderdelen zijn ingevuld</h3>
                  <p className="text-green-700">
                    De visie is compleet. Genereer een samengestelde visietekst of ga direct door naar de doelen.
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Vision Button */}
            {!showGeneratedVision && (
              <div className="card bg-cito-light-blue border-cito-blue">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-cito-blue mb-1">Samengestelde Visie Genereren</h3>
                    <p className="text-gray-600 text-sm">
                      Laat AI een vloeiende visietekst genereren op basis van alle onderdelen.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateVision}
                    disabled={isGeneratingVision}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {isGeneratingVision ? (
                      <>
                        <div className="spinner w-5 h-5" />
                        Genereren...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Genereer Visie
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Generated Vision Display */}
            {showGeneratedVision && generatedVision && (
              <div className="card border-2 border-cito-blue animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cito-blue rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Programmavisie Klant in Beeld</h3>
                    <p className="text-sm text-gray-500">Volgens methodiek Prevaas & Van Loon</p>
                  </div>
                </div>

                {/* Methodiek info */}
                <div className="bg-cito-light-blue rounded-lg p-3 mb-4 text-sm">
                  <p className="text-cito-blue">
                    <strong>Methodiek:</strong> Een goede programmavisie is aansprekend, richtinggevend,
                    gedragen, concreet en verbindend (§7.3 Werken aan programma's).
                  </p>
                </div>

                {/* Radio buttons voor versie keuze */}
                <div className="space-y-3 mb-4">
                  <p className="text-sm font-medium text-gray-700">Kies een versie:</p>
                  <label
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      activeVisionTab === "uitgebreid"
                        ? "border-cito-blue bg-cito-light-blue/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visionType"
                      value="uitgebreid"
                      checked={activeVisionTab === "uitgebreid"}
                      onChange={() => setActiveVisionTab("uitgebreid")}
                      className="mt-1 w-4 h-4 text-cito-blue focus:ring-cito-blue"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium text-gray-900">Uitgebreide visie</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Voor programmaplan, businesscase, stuurgroepstukken (4-5 alinea's)
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      activeVisionTab === "beknopt"
                        ? "border-cito-blue bg-cito-light-blue/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visionType"
                      value="beknopt"
                      checked={activeVisionTab === "beknopt"}
                      onChange={() => setActiveVisionTab("beknopt")}
                      className="mt-1 w-4 h-4 text-cito-blue focus:ring-cito-blue"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span className="font-medium text-gray-900">Beknopte visie</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Voor presentaties, nieuwsbrieven, elevator pitch (2-3 zinnen)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Vision Content */}
                <div className="bg-gray-50 rounded-lg p-6">
                  {isEditingVision ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedVisionText}
                        onChange={(e) => setEditedVisionText(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cito-blue text-gray-800 leading-relaxed"
                        rows={activeVisionTab === "uitgebreid" ? 12 : 4}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEditedVision}
                          className="px-4 py-2 bg-cito-blue text-white rounded-lg hover:bg-blue-800"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingVision(false);
                            setEditedVisionText("");
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : activeVisionTab === "uitgebreid" ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Gebruik voor: programmaplan, businesscase, stuurgroepstukken
                        </div>
                        <button
                          onClick={() => {
                            setEditedVisionText(generatedVision.uitgebreid);
                            setIsEditingVision(true);
                          }}
                          className="text-xs text-cito-blue hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Bewerken
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed prose prose-sm max-w-none">
                        {generatedVision.uitgebreid}
                      </div>
                      <div className="mt-3">
                        <RefineWithAI
                          currentText={generatedVision.uitgebreid}
                          context="Uitgebreide programmavisie Klant in Beeld"
                          onRefined={(newText) => setGeneratedVision((prev) => prev ? { ...prev, uitgebreid: newText } : prev)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Gebruik voor: presentaties, nieuwsbrieven, elevator pitch
                        </div>
                        <button
                          onClick={() => {
                            setEditedVisionText(generatedVision.beknopt);
                            setIsEditingVision(true);
                          }}
                          className="text-xs text-cito-blue hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Bewerken
                        </button>
                      </div>
                      <div className="text-gray-800 text-lg leading-relaxed font-medium italic">
                        &ldquo;{generatedVision.beknopt}&rdquo;
                      </div>
                      <div className="mt-3">
                        <RefineWithAI
                          currentText={generatedVision.beknopt}
                          context="Beknopte programmavisie Klant in Beeld (elevator pitch)"
                          onRefined={(newText) => setGeneratedVision((prev) => prev ? { ...prev, beknopt: newText } : prev)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Copy & Regenerate actions */}
                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => {
                      const text = activeVisionTab === "uitgebreid"
                        ? generatedVision.uitgebreid
                        : generatedVision.beknopt;
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-sm text-gray-600 hover:text-cito-blue flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Kopieer naar klembord
                  </button>
                  <button
                    onClick={handleGenerateVision}
                    disabled={isGeneratingVision}
                    className="text-sm text-cito-blue hover:underline flex items-center gap-1"
                  >
                    {isGeneratingVision ? (
                      <>
                        <div className="spinner w-4 h-4" />
                        Opnieuw genereren...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Opnieuw genereren
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleConfirm}
                disabled={isConfirmed}
                className="btn btn-primary text-lg px-8 py-3 flex items-center gap-2"
              >
                {isConfirmed ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Visie Bevestigd
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Bevestig Visie & Ga door naar Doelen
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Nog niet alle onderdelen zijn ingevuld</h3>
                <p className="text-yellow-700">
                  Ga terug naar de vorige stappen om alle visie-onderdelen in te vullen.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
