"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MT_MEMBERS } from "@/lib/types";

const MEMBER_COLORS = ["#003366", "#2E7D32", "#E65100", "#7B1FA2", "#FFD700", "#1a237e"];
const SPARKLE_EMOJIS = ["🌟", "⭐", "✨", "🎉", "💫"];

interface Achievement {
  id: string;
  label: string;
  icon: "vision" | "goals" | "scope" | "team";
}

interface FinalCelebrationProps {
  achievements: Achievement[];
  onClose: () => void;
}

export function FinalCelebration({
  achievements,
  onClose
}: FinalCelebrationProps) {
  const [showButton, setShowButton] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  // Memoize random particle positions so they don't change on re-render
  const particles = useMemo(() =>
    Array.from({ length: 40 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 3 + Math.random() * 7,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 2,
    })), []);

  const sparkles = useMemo(() =>
    Array.from({ length: 15 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      emoji: SPARKLE_EMOJIS[Math.floor(Math.random() * SPARKLE_EMOJIS.length)],
      size: 12 + Math.random() * 14,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 3,
    })), []);

  const triggerConfetti = useCallback(async () => {
    if (typeof window === "undefined" || confettiTriggered) return;
    setConfettiTriggered(true);

    try {
      const confetti = (await import("canvas-confetti")).default;

      // 1. Center burst with stars
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ["#003366", "#FFD700", "#2E7D32", "#E65100", "#7B1FA2"],
        shapes: ["star", "circle"],
        startVelocity: 40,
      });

      // 2. Left + right gold cannons
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
        });
      }, 400);

      // 3. Party emoji rain
      setTimeout(async () => {
        try {
          const partyShape = confetti.shapeFromText({ text: "🎉", scalar: 2 });
          confetti({
            shapes: [partyShape],
            scalar: 2,
            particleCount: 30,
            spread: 120,
            origin: { y: 0.3 },
            gravity: 0.5,
            ticks: 200,
          });
        } catch {
          // Fallback if shapeFromText not supported
          confetti({
            particleCount: 30,
            spread: 120,
            origin: { y: 0.3 },
            colors: ["#FFD700", "#FFA500"],
          });
        }
      }, 900);

      // 4. Star explosion
      setTimeout(() => {
        confetti({
          particleCount: 100,
          shapes: ["star"],
          spread: 160,
          origin: { y: 0.3 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B", "#DAA520"],
          startVelocity: 35,
          gravity: 0.8,
        });
      }, 1300);

      // 5. Trophy emoji
      setTimeout(async () => {
        try {
          const trophyShape = confetti.shapeFromText({ text: "🏆", scalar: 3 });
          confetti({
            shapes: [trophyShape],
            scalar: 3,
            particleCount: 20,
            spread: 80,
            origin: { y: 0.4 },
            gravity: 0.8,
            ticks: 250,
          });
        } catch {
          confetti({
            particleCount: 20,
            spread: 80,
            origin: { y: 0.4 },
            shapes: ["star"],
            colors: ["#FFD700"],
          });
        }
      }, 1800);

      // 6. Multi-position fireworks
      setTimeout(() => {
        [0.2, 0.5, 0.8].forEach((x, i) => {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { x, y: 0.3 },
            colors: [["#003366", "#FFD700"], ["#2E7D32", "#E65100"], ["#7B1FA2", "#FFEC8B"]][i],
            startVelocity: 30,
          });
        });
      }, 2400);

      // 7. Grand finale
      setTimeout(() => {
        confetti({
          particleCount: 250,
          spread: 180,
          startVelocity: 55,
          decay: 0.91,
          origin: { y: 0.5 },
          colors: ["#FFD700", "#003366", "#2E7D32", "#E65100", "#7B1FA2", "#FFA500"],
          shapes: ["star", "circle"],
        });
      }, 3200);

    } catch (e) {
      console.warn("Confetti not available:", e);
    }
  }, [confettiTriggered]);

  useEffect(() => {
    triggerConfetti();

    // Show button after all achievements + delay
    const buttonTimeout = setTimeout(() => {
      setShowButton(true);
    }, achievements.length * 800 + 1500);

    return () => clearTimeout(buttonTimeout);
  }, [achievements.length, triggerConfetti]);

  const title = "MISSIE VOLBRACHT!";

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "linear-gradient(135deg, #003366 0%, #1a237e 50%, #311b92 100%)",
              "linear-gradient(135deg, #1a237e 0%, #311b92 50%, #003366 100%)",
              "linear-gradient(135deg, #311b92 0%, #003366 50%, #1a237e 100%)",
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Layer 1: Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p, i) => (
            <motion.div
              key={`p-${i}`}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: ["#FFD700", "#003366", "#2E7D32", "#E65100", "#7B1FA2"][i % 5],
                left: p.left,
                top: p.top,
              }}
              animate={{
                y: [0, -(20 + Math.random() * 30), 0],
                opacity: [0.1, 0.5, 0.1],
                scale: [1, 1.4, 1],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Layer 2: Emoji sparkles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {sparkles.map((s, i) => (
            <motion.span
              key={`s-${i}`}
              className="absolute select-none"
              style={{
                left: s.left,
                top: s.top,
                fontSize: s.size,
              }}
              animate={{
                y: [-15, 15, -15],
                rotate: [0, 180, 360],
                opacity: [0.15, 0.5, 0.15],
              }}
              transition={{
                duration: s.duration,
                repeat: Infinity,
                delay: s.delay,
                ease: "easeInOut",
              }}
            >
              {s.emoji}
            </motion.span>
          ))}
        </div>

        {/* Radial light burst (plays once) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(255,215,0,0.4) 0%, transparent 70%)",
          }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
          {/* Trophy with pulsing rings */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
            className="relative inline-block mb-4"
          >
            {/* Pulsing radar rings */}
            {[0, 0.7, 1.4].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{ border: "3px solid rgba(255,215,0,0.3)" }}
                animate={{ scale: [1, 2, 2.5], opacity: [0.6, 0.2, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay }}
              />
            ))}
            <span className="text-7xl block" role="img" aria-label="trophy">🏆</span>
          </motion.div>

          {/* Letter-by-letter title */}
          <div className="flex justify-center flex-wrap mb-4">
            {title.split("").map((letter, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 50, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.05 * i + 0.3, type: "spring", stiffness: 150, damping: 12 }}
                className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-orange-400"
                style={{ textShadow: "0 0 30px rgba(255,215,0,0.3)" }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="text-lg text-blue-200/80 mb-4"
          >
            Jullie hebben het samen voor elkaar gekregen!
          </motion.p>

          {/* Team member avatars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-8"
          >
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">
              Gefeliciteerd team
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {MT_MEMBERS.map((name, i) => (
                <motion.div
                  key={name}
                  initial={{ scale: 0, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 1.0, type: "spring", stiffness: 250, damping: 15 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                  >
                    {name.charAt(0)}
                  </div>
                  <span className="text-xs text-blue-200">{name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Achievements with stamp effect */}
          <div className="space-y-3 mb-8">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ scale: 2.5, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  delay: index * 0.8 + 0.5,
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                }}
                className="relative"
              >
                {/* Impact flash */}
                <motion.div
                  className="absolute inset-0 bg-white rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ delay: index * 0.8 + 0.5, duration: 0.3 }}
                />
                <div className="flex items-center justify-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.8 + 0.7, type: "spring", stiffness: 400 }}
                    className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  >
                    {getIcon(achievement.icon)}
                  </motion.div>
                  <span className="text-lg font-semibold text-white">
                    {achievement.label}
                  </span>
                  <motion.svg
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.8 + 0.8, type: "spring" }}
                    className="w-6 h-6 text-green-400 flex-shrink-0"
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
                  </motion.svg>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          {showButton && (
            <motion.div className="relative inline-block">
              {/* Glow ring behind button */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: "rgba(255,215,0,0.2)", filter: "blur(15px)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.button
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.08, boxShadow: "0 0 30px rgba(255,215,0,0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="relative px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-lg rounded-full shadow-lg shadow-yellow-500/30"
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
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-20"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
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
