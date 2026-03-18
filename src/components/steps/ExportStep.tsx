"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/session-context";
import { isSessionComplete } from "@/lib/types";
import { FinalCelebration, triggerConfetti } from "@/components/celebration";
import * as persistence from "@/lib/persistence";

// --- Sub-components ---

function ProgressRing({ percent, isComplete }: { percent: number; isComplete: boolean }) {
  const radius = 15.915;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg className="w-11 h-11" viewBox="0 0 36 36">
      <circle
        cx="18" cy="18" r={radius}
        fill="none" stroke="#e5e7eb" strokeWidth="3"
      />
      <circle
        cx="18" cy="18" r={radius}
        fill="none"
        stroke={isComplete ? "#22c55e" : "#003366"}
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
        transform="rotate(-90 18 18)"
      />
      <text
        x="18" y="20.5"
        textAnchor="middle"
        className="text-[9px] font-bold"
        fill={isComplete ? "#16a34a" : "#374151"}
      >
        {percent}%
      </text>
    </svg>
  );
}

function StatusCard({
  label,
  isComplete,
  detail,
  delay,
}: {
  label: string;
  isComplete: boolean;
  detail: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
        isComplete
          ? "bg-green-50 border-green-200"
          : "bg-orange-50 border-orange-200"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isComplete ? "bg-green-100" : "bg-orange-100"
        }`}
      >
        {isComplete ? (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${isComplete ? "text-green-800" : "text-orange-800"}`}>
          {label}
        </p>
        <p className={`text-xs ${isComplete ? "text-green-600" : "text-orange-600"}`}>
          {detail}
        </p>
      </div>
    </motion.div>
  );
}

function CollapsibleSection({
  title,
  isComplete,
  defaultOpen,
  children,
  preview,
}: {
  title: string;
  isComplete: boolean;
  defaultOpen: boolean;
  children: React.ReactNode;
  preview?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              isComplete ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            {isComplete ? (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-2 h-2 rounded-full bg-gray-400" />
            )}
          </div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsed preview */}
      {!isOpen && preview && (
        <div className="px-5 pb-4 -mt-2">
          <p className="text-sm text-gray-500 line-clamp-1 pl-10">{preview}</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-[3.75rem]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VisionSubsection({
  label,
  text,
}: {
  label: string;
  text: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-2.5 border-b border-gray-50 last:border-b-0">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </h4>
      {text ? (
        <div>
          <p className={`text-sm text-gray-700 leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
            {text}
          </p>
          {text.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-cito-blue text-xs font-medium mt-1 hover:underline"
            >
              {expanded ? "Minder tonen" : "Meer lezen"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Nog niet ingevuld</p>
      )}
    </div>
  );
}

// --- Main Component ---

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

  // Get generated vision statement
  const generatedVision = currentSession
    ? persistence.getGeneratedVision(currentSession.id)
    : null;

  const isComplete = isSessionComplete(flowState);
  const visieComplete = !!(visieHuidige && visieGewenste && visieBeweging && visieStakeholders);
  const doelenComplete = doelen.length >= 3;
  const scopeComplete = !!scope;

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
  if (visieComplete) {
    achievements.push({
      id: "vision",
      label: "Visie vastgesteld",
      icon: "vision" as const
    });
  }
  if (generatedVision) {
    achievements.push({
      id: "consolidated",
      label: "Visie geconsolideerd",
      icon: "vision" as const
    });
  }
  if (doelenComplete) {
    achievements.push({
      id: "goals",
      label: `${doelen.length} Doelen bepaald`,
      icon: "goals" as const
    });
  }
  if (scopeComplete) {
    achievements.push({
      id: "scope",
      label: "Buiten scope afgebakend",
      icon: "scope" as const
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
  const totalSteps = 7;
  let completedSteps = 0;
  if (visieHuidige) completedSteps++;
  if (visieGewenste) completedSteps++;
  if (visieBeweging) completedSteps++;
  if (visieStakeholders) completedSteps++;
  if (doelenComplete) completedSteps++;
  if (scopeComplete) completedSteps++;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);

  // Build vision preview text for collapsed state
  const visiePreview = generatedVision?.beknopt
    || visieHuidige?.text
    || "Visie onderdelen nog niet volledig ingevuld";

  const rankColors = [
    "bg-yellow-500",
    "bg-gray-400",
    "bg-orange-600",
    "bg-blue-500",
    "bg-purple-500"
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Sticky Header with Export Action */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing percent={completionPercent} isComplete={isComplete} />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Export & Afronden</h1>
              <p className="text-xs text-gray-500">
                {isComplete ? "Klaar om te exporteren" : "Rond alle stappen af om te exporteren"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {downloadComplete && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Gedownload
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={isGenerating || !isComplete}
              className={`btn flex items-center gap-2 px-5 py-2.5 text-sm font-semibold ${
                isComplete
                  ? "btn-primary"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="spinner" />
                  Genereren...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Exporteer Word
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Completion Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatusCard
            label="Visie"
            isComplete={visieComplete}
            detail={visieComplete ? (generatedVision ? "Geconsolideerd" : "4/4 onderdelen") : "Nog niet compleet"}
            delay={0}
          />
          <StatusCard
            label="Doelen"
            isComplete={doelenComplete}
            detail={doelenComplete ? `${doelen.length} doelen vastgesteld` : "Minimaal 3 nodig"}
            delay={0.1}
          />
          <StatusCard
            label="Buiten Scope"
            isComplete={scopeComplete}
            detail={scopeComplete ? "Afgebakend" : "Nog niet ingevuld"}
            delay={0.2}
          />
        </div>

        {/* Document Preview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
        >
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-cito-blue via-cito-green to-cito-orange" />

          {/* Visie Section */}
          <CollapsibleSection
            title="Visie"
            isComplete={visieComplete}
            defaultOpen={true}
            preview={visiePreview}
          >
            {/* Generated Vision Statement - always prominent */}
            {generatedVision && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-cito-blue mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Geconsolideerde Visie
                </h3>
                <div className="bg-gradient-to-br from-cito-light-blue to-blue-50 rounded-lg p-4 border-l-4 border-cito-blue">
                  <p className="text-sm text-gray-800 leading-relaxed">{generatedVision.uitgebreid}</p>
                </div>
                {generatedVision.beknopt && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-0.5">Beknopte versie:</p>
                    <p className="text-xs text-gray-600 italic">{generatedVision.beknopt}</p>
                  </div>
                )}
              </div>
            )}

            {/* Vision subsections with progressive disclosure */}
            <div className="space-y-0">
              <VisionSubsection label="Huidige situatie" text={visieHuidige?.text || null} />
              <VisionSubsection label="Gewenste situatie" text={visieGewenste?.text || null} />
              <VisionSubsection label="Beweging" text={visieBeweging?.text || null} />
              <VisionSubsection label="Belanghebbenden" text={visieStakeholders?.text || null} />
            </div>
          </CollapsibleSection>

          {/* Doelen Section */}
          <CollapsibleSection
            title={`Doelen (${doelen.length})`}
            isComplete={doelenComplete}
            defaultOpen={true}
            preview={doelen[0]?.text || "Nog geen doelen ingevuld"}
          >
            {doelen.length > 0 ? (
              <div className="space-y-2.5">
                {doelen.map((doel, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 ${rankColors[index] || "bg-gray-500"} text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}
                    >
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{doel.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nog geen doelen ingevuld</p>
            )}
          </CollapsibleSection>

          {/* Scope Section */}
          <CollapsibleSection
            title="Buiten Scope"
            isComplete={scopeComplete}
            defaultOpen={false}
            preview={scope?.text?.split("\n")[0] || "Nog niet ingevuld"}
          >
            {scope ? (
              <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{scope.text}</div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nog niet ingevuld</p>
            )}
          </CollapsibleSection>
        </motion.div>

        {/* Session Actions */}
        <div className="flex flex-col items-center gap-4 pt-2">
          {!isComplete && (
            <p className="text-sm text-gray-500">
              Rond eerst alle stappen af om te kunnen exporteren
            </p>
          )}

          {/* Session complete button */}
          {isComplete && !sessionFinished && (
            <div className="w-full max-w-md">
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="w-full btn bg-green-600 text-white hover:bg-green-700 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sessie Afsluiten
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Sluit de sessie definitief af en markeer als voltooid
              </p>
            </div>
          )}

          {/* Session finished message */}
          {sessionFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="bg-green-50 rounded-xl p-6 text-center border border-green-200">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-1">
                  Sessie Voltooid!
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  De consolidatie sessie is succesvol afgerond. Alle afspraken zijn vastgelegd.
                </p>
                <button
                  onClick={handleStartNewSession}
                  className="btn btn-primary"
                >
                  Nieuwe Sessie Starten
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && isComplete && (
        <FinalCelebration
          achievements={achievements}
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Ja, Afsluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}