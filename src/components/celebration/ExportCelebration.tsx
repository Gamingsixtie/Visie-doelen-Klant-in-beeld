"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MT_MEMBERS } from "@/lib/types";

interface ExportCelebrationProps {
  sessionName?: string;
  onClose: () => void;
}

export function ExportCelebration({ sessionName, onClose }: ExportCelebrationProps) {
  const [phase, setPhase] = useState<"enter" | "confetti" | "message" | "details">("enter");
  const [confettiFired, setConfettiFired] = useState(false);

  const fireConfetti = useCallback(async () => {
    if (typeof window === "undefined" || confettiFired) return;
    setConfettiFired(true);

    try {
      const confetti = (await import("canvas-confetti")).default;

      // Burst from center
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.45 },
        colors: ["#003366", "#FFD700", "#2E7D32", "#E65100", "#7B1FA2"],
        startVelocity: 35,
      });

      // Left cannon
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 50,
          origin: { x: 0.1, y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
        });
      }, 300);

      // Right cannon
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 50,
          origin: { x: 0.9, y: 0.6 },
          colors: ["#FFD700", "#FFA500", "#FFEC8B"],
        });
      }, 300);

      // Golden shower
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 160,
          origin: { y: 0.2 },
          colors: ["#FFD700", "#DAA520", "#F0E68C"],
          gravity: 0.6,
          scalar: 1.2,
          ticks: 200,
        });
      }, 900);

      // Final fireworks
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
          origin: { x: 0.7, y: 0.4 },
          colors: ["#E65100", "#7B1FA2"],
        });
      }, 1500);
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-br from-cito-blue/95 via-blue-900/95 to-indigo-950/95 backdrop-blur-sm"
        />

        {/* Floating particles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                background: ["#FFD700", "#003366", "#2E7D32", "#E65100"][i % 4],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.15, 0.4, 0.15],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Document icon with glow */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="mb-6 inline-block"
          >
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(255,215,0,0.3)",
                    "0 0 40px rgba(255,215,0,0.6)",
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
              {/* Small document badge */}
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
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={phase !== "enter" ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-gold to-orange-400 mb-3"
            style={{ textShadow: "0 0 30px rgba(255,215,0,0.3)" }}
          >
            Document klaar!
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={phase !== "enter" ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-blue-200 mb-2"
          >
            Jullie Klant in Beeld is geexporteerd
          </motion.p>

          {sessionName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase !== "enter" ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="text-sm text-blue-300/70 mb-6 font-mono"
            >
              {sessionName}.docx
            </motion.p>
          )}

          {/* Team credit card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={
              phase === "details" || phase === "message"
                ? { opacity: 1, y: 0, scale: 1 }
                : {}
            }
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 mb-8"
          >
            <p className="text-white/60 text-xs uppercase tracking-widest mb-3">
              Gefeliciteerd team
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {MT_MEMBERS.map((name, i) => (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    phase === "details"
                      ? { opacity: 1, scale: 1 }
                      : {}
                  }
                  transition={{ delay: i * 0.15 + 0.1, type: "spring", stiffness: 300 }}
                  className="px-3 py-1.5 bg-white/15 rounded-full text-sm font-medium text-white border border-white/10"
                >
                  {name}
                </motion.span>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase === "details" ? { opacity: 1 } : {}}
              transition={{ delay: MT_MEMBERS.length * 0.15 + 0.3 }}
              className="text-blue-200/80 text-sm mt-3"
            >
              Samen hebben jullie de visie en doelen vastgelegd!
            </motion.p>
          </motion.div>

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={phase === "details" ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8 }}
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold rounded-full hover:from-yellow-300 hover:to-orange-400 transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 hover:scale-105 active:scale-95"
          >
            Sluiten
          </motion.button>
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