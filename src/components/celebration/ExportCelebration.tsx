"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MT_MEMBERS } from "@/lib/types";

const MEMBER_COLORS = ["#003366", "#2E7D32", "#E65100", "#7B1FA2", "#FFD700", "#1a237e"];
const SPARKLE_EMOJIS = ["🌟", "⭐", "✨", "🎉"];

interface ExportCelebrationProps {
  sessionName?: string;
  onClose: () => void;
}

export function ExportCelebration({ sessionName, onClose }: ExportCelebrationProps) {
  const [phase, setPhase] = useState<"enter" | "confetti" | "message" | "details">("enter");
  const [confettiFired, setConfettiFired] = useState(false);

  // Memoize random positions
  const particles = useMemo(() =>
    Array.from({ length: 50 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 3 + Math.random() * 8,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
    })), []);

  const emojiSparkles = useMemo(() =>
    Array.from({ length: 10 }).map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      emoji: SPARKLE_EMOJIS[Math.floor(Math.random() * SPARKLE_EMOJIS.length)],
      size: 14 + Math.random() * 12,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 3,
    })), []);

  const fireConfetti = useCallback(async () => {
    if (typeof window === "undefined" || confettiFired) return;
    setConfettiFired(true);

    try {
      const confetti = (await import("canvas-confetti")).default;

      // 1. Center burst with stars
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.45 },
        colors: ["#003366", "#FFD700", "#2E7D32", "#E65100", "#7B1FA2"],
        shapes: ["star", "circle"],
        startVelocity: 35,
      });

      // 2. Left + right cannons (boosted)
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 50,
          origin: { x: 0.1, y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 50,
          origin: { x: 0.9, y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
        });
      }, 300);

      // 3. Document emoji confetti
      setTimeout(async () => {
        try {
          const docShape = confetti.shapeFromText({ text: "📄", scalar: 2 });
          confetti({
            shapes: [docShape],
            scalar: 2,
            particleCount: 25,
            spread: 100,
            origin: { y: 0.3 },
            gravity: 0.6,
            ticks: 200,
          });
        } catch {
          confetti({
            particleCount: 25,
            spread: 100,
            origin: { y: 0.3 },
            colors: ["#FFD700", "#FFA500"],
          });
        }
      }, 700);

      // 4. Golden shower
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 160,
          origin: { y: 0.2 },
          colors: ["#FFD700", "#DAA520", "#F0E68C"],
          gravity: 0.5,
          scalar: 1.2,
          ticks: 200,
        });
      }, 1000);

      // 5. Multi-position fireworks
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { x: 0.3, y: 0.4 },
          colors: ["#003366", "#2E7D32"],
        });
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { x: 0.5, y: 0.3 },
          colors: ["#FFD700", "#FFA500"],
          shapes: ["star"],
        });
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { x: 0.7, y: 0.4 },
          colors: ["#E65100", "#7B1FA2"],
        });
      }, 1500);

      // 6. Check emoji
      setTimeout(async () => {
        try {
          const checkShape = confetti.shapeFromText({ text: "✅", scalar: 2 });
          confetti({
            shapes: [checkShape],
            scalar: 2,
            particleCount: 20,
            spread: 90,
            origin: { y: 0.4 },
            gravity: 0.7,
            ticks: 200,
          });
        } catch {
          confetti({
            particleCount: 20,
            spread: 90,
            origin: { y: 0.4 },
            colors: ["#2E7D32"],
          });
        }
      }, 2000);

      // 7. Star explosion
      setTimeout(() => {
        confetti({
          particleCount: 80,
          shapes: ["star"],
          spread: 140,
          origin: { y: 0.35 },
          colors: ["#FFD700", "#003366", "#2E7D32", "#E65100", "#7B1FA2"],
          startVelocity: 40,
        });
      }, 2500);

      // 8. Gentle confetti rain
      setTimeout(() => {
        confetti({
          particleCount: 20,
          spread: 160,
          origin: { y: 0.1 },
          colors: ["#FFD700", "#DAA520"],
          gravity: 1.2,
          ticks: 300,
          scalar: 0.8,
        });
      }, 3000);

      // 9. Grand finale
      setTimeout(() => {
        confetti({
          particleCount: 200,
          spread: 180,
          startVelocity: 50,
          decay: 0.9,
          origin: { y: 0.5 },
          colors: ["#FFD700", "#003366", "#2E7D32", "#E65100", "#7B1FA2", "#FFA500"],
          shapes: ["star", "circle"],
        });
      }, 3500);

    } catch {
      // canvas-confetti not available
    }
  }, [confettiFired]);

  useEffect(() => {
    // Phase transitions
    const t1 = setTimeout(() => setPhase("confetti"), 400);
    const t2 = setTimeout(() => {
      setPhase("message");
      fireConfetti();
    }, 800);
    const t3 = setTimeout(() => setPhase("details"), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [fireConfetti]);

  const titleText = "Document klaar!";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      >
        {/* Animated gradient backdrop */}
        <motion.div
          className="absolute inset-0 backdrop-blur-sm"
          animate={{
            background: [
              "linear-gradient(135deg, rgba(0,51,102,0.97) 0%, rgba(26,35,126,0.97) 50%, rgba(49,27,146,0.97) 100%)",
              "linear-gradient(135deg, rgba(26,35,126,0.97) 0%, rgba(49,27,146,0.97) 50%, rgba(0,51,102,0.97) 100%)",
              "linear-gradient(135deg, rgba(49,27,146,0.97) 0%, rgba(0,51,102,0.97) 50%, rgba(26,35,126,0.97) 100%)",
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
                y: [0, -(15 + Math.random() * 25), 0],
                opacity: [0.15, 0.45, 0.15],
                scale: [1, 1.3, 1],
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
          {emojiSparkles.map((s, i) => (
            <motion.span
              key={`e-${i}`}
              className="absolute select-none"
              style={{ left: s.left, top: s.top, fontSize: s.size }}
              animate={{
                y: [-10, 10, -10],
                rotate: [0, 180, 360],
                opacity: [0.1, 0.4, 0.1],
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

        {/* Radial light burst (plays once on confetti) */}
        {phase !== "enter" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, rgba(255,215,0,0.35) 0%, transparent 70%)",
            }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Document icon with seal and pulsing rings */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              {/* Pulsing rings behind icon */}
              {[0, 0.6, 1.2].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-2xl"
                  style={{ border: "2px solid rgba(255,215,0,0.3)" }}
                  animate={{ scale: [1, 1.6, 2], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay }}
                />
              ))}

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(255,215,0,0.3)",
                    "0 0 50px rgba(255,215,0,0.6)",
                    "0 0 20px rgba(255,215,0,0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>

              {/* Document badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-cito-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </motion.div>

              {/* Golden seal stamp */}
              <motion.div
                initial={{ scale: 3, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 10 }}
                className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-lg">⭐</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Letter-by-letter title */}
          <div className="flex justify-center flex-wrap mb-3">
            {titleText.split("").map((letter, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -90 }}
                animate={phase !== "enter" ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                transition={{ delay: 0.04 * i + 0.2, type: "spring", stiffness: 150, damping: 12 }}
                className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400"
                style={{ textShadow: "0 0 30px rgba(255,215,0,0.3)" }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={phase !== "enter" ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-lg text-blue-200 mb-2"
          >
            Jullie Klant in Beeld is geexporteerd
          </motion.p>

          {sessionName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase !== "enter" ? { opacity: 1 } : {}}
              transition={{ delay: 1.0 }}
              className="text-sm text-blue-300/70 mb-6 font-mono"
            >
              {sessionName}.docx
            </motion.p>
          )}

          {/* Award-style team credit card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={
              phase === "details" || phase === "message"
                ? { opacity: 1, y: 0, scale: 1 }
                : {}
            }
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl border border-yellow-500/30 p-6 mb-8"
          >
            {/* Trophy header */}
            <motion.div
              initial={{ scale: 0 }}
              animate={phase === "details" ? { scale: 1 } : {}}
              transition={{ type: "spring", stiffness: 300 }}
              className="text-3xl mb-2"
            >
              🏆
            </motion.div>
            <p className="text-yellow-400/90 text-xs uppercase tracking-widest mb-3 font-semibold">
              Team Klant in Beeld
            </p>
            {/* Gold separator */}
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mb-4" />

            <div className="flex flex-wrap justify-center gap-2">
              {MT_MEMBERS.map((name, i) => (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, scale: 0, rotate: -10 }}
                  animate={
                    phase === "details"
                      ? { opacity: 1, scale: 1, rotate: 0 }
                      : {}
                  }
                  transition={{ delay: i * 0.12 + 0.1, type: "spring", stiffness: 300 }}
                  className="px-3 py-1.5 bg-white/15 rounded-full text-sm font-medium text-white border border-white/20 flex items-center gap-1.5"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                  >
                    {name.charAt(0)}
                  </span>
                  {name}
                </motion.span>
              ))}
            </div>

            {/* Gold separator */}
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mt-4 mb-3" />

            <motion.p
              initial={{ opacity: 0 }}
              animate={phase === "details" ? { opacity: 1 } : {}}
              transition={{ delay: MT_MEMBERS.length * 0.12 + 0.4 }}
              className="text-blue-200/80 text-sm"
            >
              Samen hebben jullie de visie en doelen vastgelegd!
            </motion.p>
          </motion.div>

          {/* Close button with glow */}
          <motion.div className="relative inline-block">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(255,215,0,0.15)", filter: "blur(12px)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={phase === "details" ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.08, boxShadow: "0 0 30px rgba(255,215,0,0.5)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="relative px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold rounded-full hover:from-yellow-300 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/20"
            >
              Sluiten
            </motion.button>
          </motion.div>
        </div>

        {/* Corner close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors z-20"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
