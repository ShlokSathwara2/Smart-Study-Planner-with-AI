"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface FocusTimerProps {
  userId?: string;
  planId?: string;
}

type TimerMode = "work" | "break";

export function FocusTimer({ userId, planId }: FocusTimerProps) {
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [distractions, setDistractions] = useState(0);
  const [deepWorkSeconds, setDeepWorkSeconds] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showTopicSelect, setShowTopicSelect] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Detect tab switches (distractions)
  useEffect(() => {
    if (!isRunning || !sessionStarted) return;

    const handleVisibilityChange = () => {
      if (document.hidden && mode === "work") {
        setDistractions(prev => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning, sessionStarted, mode]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Track deep work time (when timer is running and in work mode)
          if (mode === "work" && isRunning) {
            setDeepWorkSeconds(prev => prev + 1);
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer completed
      if (mode === "work") {
        // Switch to break
        handleCompleteSession();
        setMode("break");
        setTimeLeft(5 * 60);
      } else {
        // Break over, back to work
        setMode("work");
        setTimeLeft(25 * 60);
      }
      setIsRunning(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, mode]);

  const handleStartSession = () => {
    if (!selectedTopic.trim()) return;
    setShowTopicSelect(false);
    setSessionStarted(true);
    setIsRunning(true);
    startTimeRef.current = Date.now();
  };

  const handlePause = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResume = () => {
    setIsRunning(true);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Save session to backend
    await saveSession();
    
    // Reset
    setSessionStarted(false);
    setShowTopicSelect(true);
    setMode("work");
    setTimeLeft(25 * 60);
    setDistractions(0);
    setDeepWorkSeconds(0);
  };

  const handleCompleteSession = async () => {
    await saveSession();
    
    // Track cognitive load signal
    if (selectedTopic && planId && userId) {
      try {
        await fetch("/api/cognitive-load/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            syllabusId: planId, // Using planId as proxy for syllabusId
            topic: selectedTopic,
            timeSpentMinutes: Math.floor(deepWorkSeconds / 60),
            pauseCount: distractions,
            rewindCount: 0,
          }),
        });
      } catch (error) {
        console.error("Failed to track cognitive load:", error);
      }
    }
  };

  const saveSession = async () => {
    if (!userId || !planId || !startTimeRef.current) return;
    
    try {
      const endTime = Date.now();
      const durationMinutes = Math.floor((endTime - startTimeRef.current) / 60000);
      
      const response = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
          topic: selectedTopic,
          startTime: new Date(startTimeRef.current).toISOString(),
          endTime: new Date(endTime).toISOString(),
          actualMinutes: durationMinutes,
          distractions,
          deepWorkSeconds,
        }),
      });
      
      if (response.ok) {
        console.log("Session saved successfully");
      }
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateFocusScore = () => {
    if (deepWorkSeconds === 0) return 0;
    const totalTime = deepWorkSeconds + (distractions * 60); // Assume each distraction costs 1 minute
    return Math.round((deepWorkSeconds / totalTime) * 100);
  };

  // Topic Select Screen
  if (showTopicSelect) {
    return (
      <GlassCard className="w-full max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="text-6xl mb-6">⏱️</div>
          <h2 className="text-2xl font-bold text-slate-50 mb-3">
            Start a Focus Session
          </h2>
          <p className="text-slate-400 mb-8">
            What topic will you be working on?
          </p>
          
          <input
            type="text"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            placeholder="e.g., Linear Algebra - Eigenvalues"
            className="w-full max-w-md bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
          />
          
          <GradientButton
            label="Start Focus Session"
            onClick={handleStartSession}
            disabled={!selectedTopic.trim()}
          />
          
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <p className="text-2xl font-bold text-indigo-400">25</p>
              <p className="text-xs text-slate-400 mt-1">Work Minutes</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">5</p>
              <p className="text-xs text-slate-400 mt-1">Break Minutes</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-400">∞</p>
              <p className="text-xs text-slate-400 mt-1">Cycles</p>
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Timer Screen
  return (
    <GlassCard className="w-full max-w-2xl mx-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-50">{selectedTopic}</h2>
            <p className="text-sm text-slate-400">
              {mode === "work" ? "Focus Time" : "Break Time"}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            mode === "work" 
              ? "bg-indigo-500/20 text-indigo-300" 
              : "bg-emerald-500/20 text-emerald-300"
          }`}>
            {mode === "work" ? "🎯 WORK" : "☕ BREAK"}
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-8">
          <motion.div
            key={timeLeft}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-7xl font-mono font-bold text-slate-50 mb-4"
          >
            {formatTime(timeLeft)}
          </motion.div>
          
          {/* Progress Ring */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
                fill="none"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                stroke={mode === "work" ? "#6366F1" : "#22C55E"}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 1 }}
                animate={{ 
                  pathLength: timeLeft / (mode === "work" ? 25 * 60 : 5 * 60) 
                }}
                transition={{ duration: 0.5 }}
              />
            </svg>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {!isRunning ? (
            <GradientButton
              label={timeLeft === 25 * 60 ? "Start Session" : "Resume"}
              onClick={handleResume}
            />
          ) : (
            <button
              onClick={handlePause}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
            >
              Pause
            </button>
          )}
          
          <button
            onClick={handleStop}
            className="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg font-medium text-red-300 transition-colors"
          >
            Stop
          </button>
        </div>

        {/* Stats */}
        {sessionStarted && (
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-xs text-slate-400 mb-1">Distractions</p>
              <p className="text-2xl font-bold text-red-400">{distractions}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Deep Work</p>
              <p className="text-2xl font-bold text-indigo-400">
                {Math.floor(deepWorkSeconds / 60)}m
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Focus Score</p>
              <p className="text-2xl font-bold text-emerald-400">
                {calculateFocusScore()}%
              </p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
