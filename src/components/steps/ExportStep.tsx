"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/session-context";
import { isSessionComplete } from "@/lib/types";
import { FinalCelebration, triggerConfetti } from "@/components/celebration";

export function ExportStep() {
  const { flowState, getApprovedText, currentSession, documents } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const visieHuidige = getApprovedText("current_situation");
  const visieGewenste = getApprovedText("desired_situation");
  const visieBeweging = getApprovedText("change_direction");
  const visieStakeholders = getApprovedText("stakeholders");
  const doel1 = getApprovedText("goal_1");
  const doel2 = getApprovedText("goal_2");
  const doel3 = getApprovedText("goal_3");
  const scope = getApprovedText("out_of_scope");

  const isComplete = isSessionComplete(flowState);

  // Check completion on mount
  useEffect(() => {
    if (isComplete && !showCelebration && !downloadComplete) {
      // Small delay before showing celebration
      const timer = setTimeout(() => {
        setShowCelebration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, showCelebration, downloadComplete]);

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
  if (doel1 && doel2 && doel3) {
    achievements.push({
      id: "goals",
      label: "Doelen bepaald",
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
          goals: [
            { rank: 1, text: doel1?.text || "" },
            { rank: 2, text: doel2?.text || "" },
            { rank: 3, text: doel3?.text || "" }
          ],
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

  // Calculate completion percentage
  const totalSteps = 7; // 3 visie + doelen + scope
  let completedSteps = 0;
  if (visieHuidige) completedSteps++;
  if (visieGewenste) completedSteps++;
  if (visieBeweging) completedSteps++;
  if (visieStakeholders) completedSteps++;
  if (doel1 && doel2 && doel3) completedSteps++;
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
                  doel1 && doel2 && doel3 ? "bg-green-100" : "bg-cito-light-green"
                }`}
              >
                {doel1 && doel2 && doel3 ? (
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
              Doelen
            </h2>

            <div className="space-y-3">
              {doel1 ? (
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </span>
                  <p className="text-gray-800">{doel1.text}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic">Doel 1: Nog niet ingevuld</p>
              )}
              {doel2 ? (
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </span>
                  <p className="text-gray-800">{doel2.text}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic">Doel 2: Nog niet ingevuld</p>
              )}
              {doel3 ? (
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </span>
                  <p className="text-gray-800">{doel3.text}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic">Doel 3: Nog niet ingevuld</p>
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
          </div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && isComplete && (
          <FinalCelebration
            achievements={achievements}
            teamMembers={teamMembers}
            sessionName={currentSession?.name}
            onClose={handleCloseCelebration}
          />
        )}
      </div>
    </div>
  );
}
