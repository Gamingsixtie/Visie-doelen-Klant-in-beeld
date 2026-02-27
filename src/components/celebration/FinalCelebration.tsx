"use client";

import { useEffect, useState, useCallback } from "react";

interface Achievement {
  id: string;
  label: string;
  icon: "vision" | "goals" | "scope" | "team";
}

interface FinalCelebrationProps {
  achievements: Achievement[];
  teamMembers?: string[];
  onClose: () => void;
  sessionName?: string;
}

export function FinalCelebration({
  achievements,
  teamMembers = [],
  onClose,
  sessionName = "het MT"
}: FinalCelebrationProps) {
  const [visibleAchievements, setVisibleAchievements] = useState<number>(0);
  const [showCredits, setShowCredits] = useState(false);
  const [showFinalButton, setShowFinalButton] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  const triggerConfetti = useCallback(async () => {
    if (typeof window === "undefined" || confettiTriggered) return;

    try {
      const confetti = (await import("canvas-confetti")).default;

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Side cannons
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 }
        });
      }, 500);

      // Golden rain
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
          origin: { y: 0.3 }
        });
      }, 1200);

      // Final celebration
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 120,
          startVelocity: 45,
          decay: 0.9,
          origin: { y: 0.5 }
        });
      }, 2000);

      setConfettiTriggered(true);
    } catch (e) {
      console.warn("Confetti not available:", e);
    }
  }, [confettiTriggered]);

  useEffect(() => {
    // Trigger confetti on mount
    triggerConfetti();

    // Animate achievements one by one
    const achievementInterval = setInterval(() => {
      setVisibleAchievements((prev) => {
        if (prev < achievements.length) {
          return prev + 1;
        }
        clearInterval(achievementInterval);
        return prev;
      });
    }, 800);

    // Show credits after achievements
    const creditsTimeout = setTimeout(() => {
      setShowCredits(true);
    }, achievements.length * 800 + 500);

    // Show final button
    const buttonTimeout = setTimeout(() => {
      setShowFinalButton(true);
    }, achievements.length * 800 + 2500);

    return () => {
      clearInterval(achievementInterval);
      clearTimeout(creditsTimeout);
      clearTimeout(buttonTimeout);
    };
  }, [achievements.length, triggerConfetti]);

  const getIcon = (icon: Achievement["icon"]) => {
    switch (icon) {
      case "vision":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case "goals":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "scope":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "team":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-cito-blue via-blue-900 to-indigo-900">
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
        {/* Main title */}
        <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 mb-4 animate-pulse">
          MISSIE VOLBRACHT!
        </h1>

        <p className="text-xl text-blue-200 mb-10">
          Gefeliciteerd {sessionName}
        </p>

        {/* Achievements */}
        <div className="space-y-4 mb-10">
          {achievements.map((achievement, index) => (
            <div
              key={achievement.id}
              className={`transform transition-all duration-700 ${
                index < visibleAchievements
                  ? "translate-x-0 opacity-100"
                  : "translate-x-full opacity-0"
              }`}
            >
              <div className="flex items-center justify-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                  {getIcon(achievement.icon)}
                </div>
                <span className="text-lg font-semibold text-white">
                  {achievement.label}
                </span>
                <svg
                  className="w-6 h-6 text-green-400"
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
            </div>
          ))}
        </div>

        {/* Team credits */}
        {showCredits && teamMembers.length > 0 && (
          <div className="mb-8 transform transition-all duration-1000 animate-fade-in">
            <p className="text-blue-300 mb-3">Met dank aan het team:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {teamMembers.map((member, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/10 rounded-full text-white text-sm"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {member}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Final button */}
        {showFinalButton && (
          <button
            onClick={onClose}
            className="transform transition-all duration-500 animate-bounce px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg rounded-full hover:from-yellow-300 hover:to-orange-400 shadow-lg shadow-yellow-500/30"
          >
            Klaar voor de volgende stap
            <svg
              className="w-5 h-5 inline ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Simple confetti trigger function for use elsewhere
export async function triggerConfetti(options?: {
  particleCount?: number;
  spread?: number;
  colors?: string[];
}) {
  if (typeof window === "undefined") return;

  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: options?.particleCount || 100,
      spread: options?.spread || 70,
      colors: options?.colors || ["#FFD700", "#003366", "#2E7D32", "#E65100"],
      origin: { y: 0.6 }
    });
  } catch (e) {
    console.warn("Confetti not available:", e);
  }
}
