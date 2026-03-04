"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type TimerMode = "dialogue" | "group_vote" | "individual_vote";

interface TimerConfig {
  mode: TimerMode;
  /** Duration in seconds */
  defaultDuration: number;
  /** Label to show */
  label: string;
  /** Color scheme */
  color: "blue" | "green" | "orange" | "purple";
  /** Show warning when time is low */
  warningThreshold?: number;
  /** Auto-start on mount */
  autoStart?: boolean;
}

const MODE_CONFIGS: Record<TimerMode, Omit<TimerConfig, "defaultDuration" | "label">> = {
  dialogue: {
    mode: "dialogue",
    color: "blue",
    warningThreshold: 60, // 1 minute warning
  },
  group_vote: {
    mode: "group_vote",
    color: "green",
    warningThreshold: 30, // 30 seconds warning
  },
  individual_vote: {
    mode: "individual_vote",
    color: "orange",
    warningThreshold: 15, // 15 seconds warning
  },
};

const COLOR_CLASSES = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    accent: "bg-blue-500",
    button: "bg-blue-500 hover:bg-blue-600",
    progress: "bg-blue-500",
    warning: "bg-orange-500",
    danger: "bg-red-500",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    accent: "bg-green-500",
    button: "bg-green-500 hover:bg-green-600",
    progress: "bg-green-500",
    warning: "bg-orange-500",
    danger: "bg-red-500",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    accent: "bg-orange-500",
    button: "bg-orange-500 hover:bg-orange-600",
    progress: "bg-orange-500",
    warning: "bg-orange-600",
    danger: "bg-red-500",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    accent: "bg-purple-500",
    button: "bg-purple-500 hover:bg-purple-600",
    progress: "bg-purple-500",
    warning: "bg-orange-500",
    danger: "bg-red-500",
  },
};

interface ActivityTimerProps {
  mode: TimerMode;
  /** Duration in seconds */
  duration: number;
  /** Label to display */
  label: string;
  /** Called when timer completes */
  onComplete?: () => void;
  /** Called when timer is paused/resumed */
  onStatusChange?: (isRunning: boolean) => void;
  /** Show as compact (inline) version */
  compact?: boolean;
  /** Auto-start the timer */
  autoStart?: boolean;
  /** Custom class name */
  className?: string;
  /** Show helper text for the mode */
  showModeHelper?: boolean;
}

const MODE_ICONS: Record<TimerMode, JSX.Element> = {
  dialogue: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
  ),
  group_vote: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  individual_vote: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const MODE_HELPERS: Record<TimerMode, string> = {
  dialogue: "Tijd voor open dialoog en bespreking",
  group_vote: "Bedenktijd voor gezamenlijke beslissing",
  individual_vote: "Tijd per persoon om te stemmen en toe te lichten",
};

export function ActivityTimer({
  mode,
  duration,
  label,
  onComplete,
  onStatusChange,
  compact = false,
  autoStart = false,
  className = "",
  showModeHelper = true,
}: ActivityTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [hasStarted, setHasStarted] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const modeConfig = MODE_CONFIGS[mode];
  const colors = COLOR_CLASSES[modeConfig.color];

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine progress bar color based on time left
  const getProgressColor = (): string => {
    if (timeLeft <= 10) return colors.danger;
    if (modeConfig.warningThreshold && timeLeft <= modeConfig.warningThreshold) {
      return colors.warning;
    }
    return colors.progress;
  };

  // Calculate progress percentage
  const progressPercentage = (timeLeft / duration) * 100;

  // Play sound when timer ends
  const playEndSound = useCallback(() => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 200);

      // Double beep
      setTimeout(() => {
        const audioContext2 = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator2 = audioContext2.createOscillator();
        const gainNode2 = audioContext2.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext2.destination);
        oscillator2.frequency.value = 800;
        oscillator2.type = "sine";
        gainNode2.gain.value = 0.3;
        oscillator2.start();
        setTimeout(() => {
          oscillator2.stop();
          audioContext2.close();
        }, 200);
      }, 300);
    } catch {
      // Audio not supported or blocked
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playEndSound();
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onComplete, playEndSound]);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(isRunning);
  }, [isRunning, onStatusChange]);

  const handleStart = () => {
    setIsRunning(true);
    setHasStarted(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(duration);
    setHasStarted(false);
  };

  const handleAddTime = (seconds: number) => {
    setTimeLeft((prev) => prev + seconds);
  };

  // Compact version for inline use
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border`}>
          <span className={colors.text}>{MODE_ICONS[mode]}</span>
          <span className={`font-mono font-bold ${timeLeft <= 10 ? "text-red-600" : colors.text}`}>
            {formatTime(timeLeft)}
          </span>
          {!hasStarted ? (
            <button
              onClick={handleStart}
              className={`p-1 rounded ${colors.button} text-white`}
              title="Start"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          ) : isRunning ? (
            <button
              onClick={handlePause}
              className="p-1 rounded bg-gray-500 hover:bg-gray-600 text-white"
              title="Pauze"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleStart}
              className={`p-1 rounded ${colors.button} text-white`}
              title="Hervat"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={colors.text}>{MODE_ICONS[mode]}</span>
          <span className={`font-medium ${colors.text}`}>{label}</span>
        </div>
        {showModeHelper && (
          <span className="text-xs text-gray-500">{MODE_HELPERS[mode]}</span>
        )}
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-center mb-4">
        <div className={`text-5xl font-mono font-bold tracking-wider ${
          timeLeft <= 10
            ? "text-red-600 animate-pulse"
            : timeLeft <= (modeConfig.warningThreshold || 30)
            ? "text-orange-600"
            : colors.text
        }`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {!hasStarted ? (
          <button
            onClick={handleStart}
            className={`px-6 py-2 rounded-lg ${colors.button} text-white font-medium flex items-center gap-2`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Start Timer
          </button>
        ) : (
          <>
            {isRunning ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Pauze
              </button>
            ) : (
              <button
                onClick={handleStart}
                className={`px-4 py-2 rounded-lg ${colors.button} text-white font-medium flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Hervat
              </button>
            )}

            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>

            {/* Quick add time buttons */}
            <div className="flex items-center gap-1 ml-2 border-l pl-2">
              <button
                onClick={() => handleAddTime(30)}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium"
                title="Voeg 30 seconden toe"
              >
                +30s
              </button>
              <button
                onClick={() => handleAddTime(60)}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium"
                title="Voeg 1 minuut toe"
              >
                +1m
              </button>
            </div>
          </>
        )}
      </div>

      {/* Time finished message */}
      {timeLeft === 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-center">
          <p className="text-red-700 font-medium">Tijd is om!</p>
          <button
            onClick={handleReset}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Opnieuw starten
          </button>
        </div>
      )}
    </div>
  );
}

// Preset configurations for common scenarios
export const TIMER_PRESETS = {
  // Visie stappen
  visie_overview: { mode: "dialogue" as TimerMode, duration: 180, label: "Bespreking antwoorden" }, // 3 min
  visie_themes: { mode: "dialogue" as TimerMode, duration: 300, label: "Thema's bespreken" }, // 5 min
  visie_theme_voting: { mode: "group_vote" as TimerMode, duration: 120, label: "Punten verdelen" }, // 2 min
  visie_voting: { mode: "group_vote" as TimerMode, duration: 120, label: "Formulering beoordelen" }, // 2 min

  // Doelen stappen
  doelen_overview: { mode: "dialogue" as TimerMode, duration: 180, label: "Doelen bespreken" }, // 3 min
  doelen_clusters: { mode: "dialogue" as TimerMode, duration: 240, label: "Clusters bespreken" }, // 4 min
  doelen_voting: { mode: "individual_vote" as TimerMode, duration: 90, label: "Individueel stemmen" }, // 1.5 min per persoon
  doelen_ranking: { mode: "group_vote" as TimerMode, duration: 180, label: "Ranking bepalen" }, // 3 min
  doelen_formulation: { mode: "dialogue" as TimerMode, duration: 180, label: "Formulering afronden" }, // 3 min

  // Scope stap
  scope_discussion: { mode: "dialogue" as TimerMode, duration: 300, label: "Scope bepalen" }, // 5 min
};

export default ActivityTimer;
