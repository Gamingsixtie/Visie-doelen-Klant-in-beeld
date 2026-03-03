"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { isSessionComplete } from "@/lib/types";
import { FinalCelebration, triggerConfetti } from "@/components/celebration";
import * as persistence from "@/lib/persistence";

export function ExportStep() {
  const { flowState, getApprovedText, currentSession, documents, completeSession, closeSession } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  const visieHuidige = getApprovedText("current_situation");
  const visieGewenste = getApprovedText("desired_situation");
  const visieBeweging = getApprovedText("change_direction");
  const visieStakeholders = getApprovedText("stakeholders");
  const goalKeys = ["goal_1", "goal_2", "goal_3", "goal_4", "goal_5"] as const;
  const doelen = goalKeys
    .map((key) => getApprovedText(key))
    .filter((d): d is NonNullable<typeof d> => d !== null);
  // Keep backward compat references
  const doel1 = doelen[0] || null;
  const doel2 = doelen[1] || null;
  const doel3 = doelen[2] || null;
  const scope = getApprovedText("out_of_scope");

  const isComplete = isSessionComplete(flowState);

  // Check completion on mount - show celebration only once per session
  useEffect(() => {
    if (isComplete && !showCelebration && !downloadComplete) {
      const alreadyShown = currentSession ? persistence.isCelebrationShown(currentSession.id) : false;
      if (alreadyShown) {
        setDownloadComplete(true); // Skip celebration, go straight to export view
        return;
      }
      // Small delay before showing celebration
      const timer = setTimeout(() => {
        setShowCelebration(true);
        if (currentSession) {
          persistence.setCelebrationShown(currentSession.id);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, showCelebration, downloadComplete, currentSession]);

  // Get team members from documents
  const teamMembers = documents
    .map((doc) => doc.filename.replace(".docx", ""))
    .filter((name) => name.length > 0);

  // Build achievements list
  const achievements = [];
  if (visieHuidige && visieGewenste && visieBeweging && visieStakeholders) {
    achievements.push({
      id: "vision",
      label: "Visie vastgesteld",
      icon: "vision" as const
    });
  }
  if (doelen.length >= 3) {
    achievements.push({
      id: "goals",
      label: `${doelen.length} Doelen bepaald`,
      icon: "goals" as const
    });
  }
  if (scope) {
    achievements.push({
      id: "scope",
      label: "Scope afgebakend",
      icon: "scope" as const
    });
  }
  if (teamMembers.length > 0) {
    achievements.push({
      id: "team",
      label: `${teamMembers.length} MT-leden bijgedragen`,
      icon: "team" as const
    });
  }

  const handleExport = async () => {
    setIsGenerating(true);

    try {
      // Get generated vision if available
      const generatedVision = currentSession
        ? persistence.getGeneratedVision(currentSession.id)
        : null;

      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession?.id,
          sessionName: currentSession?.name,
          vision: {
            currentSituation: visieHuidige?.text || "",
            desiredSituation: visieGewenste?.text || "",
            changeDirection: visieBeweging?.text || "",
            stakeholders: visieStakeholders?.text || ""
          },
          generatedVision: generatedVision
            ? { uitgebreid: generatedVision.uitgebreid, beknopt: generatedVision.beknopt }
            : null,
          goals: doelen.map((d, i) => ({ rank: i + 1, text: d.text })),
          scope: {
            outOfScope: scope?.text?.split("\n").filter(Boolean) || []
          },
          teamMembers
        })
      });

      if (!response.ok) {
        throw new Error("Export mislukt");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Klant-in-Beeld-${currentSession?.name || "export"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadComplete(true);

      // Trigger confetti on successful download
      triggerConfetti({
        particleCount: 100,
        spread: 70
      });
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
    setDownloadComplete(true);
  };

  const handleCompleteSession = () => {
    completeSession();
    setSessionFinished(true);
    setShowCompleteConfirm(false);

    // Trigger confetti for final completion
    triggerConfetti({
      particleCount: 200,
      spread: 100
    });
  };

  const handleStartNewSession = () => {
    closeSession();
    // This will trigger a redirect to the home page through the app's routing
    window.location.href = "/";
  };

  // Calculate completion percentage
  const totalSteps = 7; // 3 visie + doelen + scope
  let completedSteps = 0;
  if (visieHuidige) completedSteps++;
  if (visieGewenste) completedSteps++;
  if (visieBeweging) completedSteps++;
  if (visieStakeholders) completedSteps++;
  if (doelen.length >= 3) completedSteps++;
  if (scope) completedSteps++;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Export & Afronden
          </h1>
          <p className="text-gray-600">
            Bekijk het totaaloverzicht en exporteer het document.
          </p>

          {/* Completion indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Voortgang</span>
              <span
                className={`font-medium ${
                  isComplete ? "text-green-600" : "text-cito-blue"
                }`}
              >
                {completionPercent}% voltooid
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isComplete ? "bg-green-500" : "bg-cito-blue"
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="space-y-6">
          {/* Visie Section */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  visieHuidige && visieGewenste && visieBeweging && visieStakeholders ? "bg-green-100"
                    : "bg-cito-light-blue"
                }`}
              >
                {visieHuidige && visieGewenste && visieBeweging && visieStakeholders ? (
                  <svg
                    className="w-5 h-5 text-green-600"
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
                  <span className="text-cito-blue font-bold">1</span>
                )}
              </span>
              Visie
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Huidige situatie
                </h3>
                {visieHuidige ? (
                  <p className="text-gray-800">{visieHuidige.text}</p>
                ) : (
                  <p className="text-gray-400 italic">Nog niet ingevuld</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Gewenste situatie
                </h3>
                {visieGewenste ? (
                  <p className="text-gray-800">{visieGewenste.text}</p>
                ) : (
                  <p className="text-gray-400 italic">Nog niet ingevuld</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Beweging
                </h3>
                {visieBeweging ? (
                  <p className="text-gray-800">{visieBeweging.text}</p>
                ) : (
                  <p className="text-gray-400 italic">Nog niet ingevuld</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Belanghebbenden
                </h3>
                {visieStakeholders ? (
                  <p className="text-gray-800">{visieStakeholders.text}</p>
                ) : (
                  <p className="text-gray-400 italic">Nog niet ingevuld</p>
                )}
              </div>
            </div>
          </div>

          {/* Doelen Section */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  doelen.length >= 3 ? "bg-green-100" : "bg-cito-light-green"
                }`}
              >
                {doelen.length >= 3 ? (
                  <svg
                    className="w-5 h-5 text-green-600"
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
                  <span className="text-cito-green font-bold">2</span>
                )}
              </span>
              Doelen ({doelen.length})
            </h2>

            <div className="space-y-3">
              {doelen.length > 0 ? (
                doelen.map((doel, index) => {
                  const rankColors = [
                    "bg-yellow-500",
                    "bg-gray-400",
                    "bg-orange-600",
                    "bg-blue-500",
                    "bg-purple-500"
                  ];
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <span className={`w-6 h-6 ${rankColors[index] || "bg-gray-500"} text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                        {index + 1}
                      </span>
                      <p className="text-gray-800">{doel.text}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 italic">Nog geen doelen ingevuld</p>
              )}
            </div>
          </div>

          {/* Scope Section */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  scope ? "bg-green-100" : "bg-orange-100"
                }`}
              >
                {scope ? (
                  <svg
                    className="w-5 h-5 text-green-600"
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
                  <span className="text-orange-600 font-bold">3</span>
                )}
              </span>
              Scope
            </h2>

            {scope ? (
              <div className="text-gray-800 whitespace-pre-line">{scope.text}</div>
            ) : (
              <p className="text-gray-400 italic">Nog niet ingevuld</p>
            )}
          </div>

          {/* Team members */}
          {teamMembers.length > 0 && (
            <div className="card bg-cito-light-blue">
              <h2 className="text-lg font-semibold text-cito-blue mb-3">
                Bijgedragen door
              </h2>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map((member, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 shadow-sm"
                  >
                    {member}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              onClick={handleExport}
              disabled={isGenerating || !isComplete}
              className={`btn text-lg px-8 py-3 flex items-center gap-2 ${
                isComplete
                  ? "btn-primary"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="spinner" />
                  Genereren...
                </>
              ) : (
                <>
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Exporteer als Word document
                </>
              )}
            </button>

            {!isComplete && (
              <p className="text-sm text-gray-500">
                Rond eerst alle stappen af om te kunnen exporteren
              </p>
            )}

            {downloadComplete && (
              <p className="text-sm text-green-600 flex items-center gap-1">
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
                Document gedownload!
              </p>
            )}

            {/* Session complete button */}
            {isComplete && !sessionFinished && (
              <div className="pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  className="btn bg-green-600 text-white hover:bg-green-700 text-lg px-8 py-3 flex items-center gap-2"
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Sessie Afsluiten - Klaar!
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Sluit de sessie definitief af en markeer als voltooid
                </p>
              </div>
            )}

            {/* Session finished message */}
            {sessionFinished && (
              <div className="pt-6 border-t border-gray-200 mt-6">
                <div className="bg-green-50 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-green-600"
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
                  <h3 className="text-xl font-semibold text-green-800 mb-2">
                    Sessie Voltooid!
                  </h3>
                  <p className="text-green-700 mb-4">
                    De consolidatie sessie is succesvol afgerond. Alle afspraken zijn vastgelegd.
                  </p>
                  <button
                    onClick={handleStartNewSession}
                    className="btn btn-primary"
                  >
                    Nieuwe Sessie Starten
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && isComplete && (
          <FinalCelebration
            achievements={achievements}
            teamMembers={teamMembers}
            onClose={handleCloseCelebration}
          />
        )}

        {/* Confirmation Modal */}
        {showCompleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Sessie Afsluiten?
              </h2>
              <p className="text-gray-600 mb-6">
                Weet je zeker dat je de sessie wilt afsluiten? De sessie wordt gemarkeerd als voltooid en kan niet meer worden bewerkt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleCompleteSession}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
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
                  Ja, Afsluiten
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
