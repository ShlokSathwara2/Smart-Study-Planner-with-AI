"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface FocusTimerProps { userId?: string; planId?: string; }
type TimerMode = "work" | "break";

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;
const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";

export function FocusTimer({ userId, planId }: FocusTimerProps) {
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [distractions, setDistractions] = useState(0);
  const [deepWorkSeconds, setDeepWorkSeconds] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const totalDuration = mode === "work" ? WORK_DURATION : BREAK_DURATION;
  const progress = 1 - timeLeft / totalDuration;
  const focusScore = deepWorkSeconds === 0 ? 0 : Math.round((deepWorkSeconds / (deepWorkSeconds + distractions * 60)) * 100);

  useEffect(() => {
    if (!isRunning || !sessionStarted) return;
    const h = () => { if (document.hidden && mode === "work") setDistractions((d) => d + 1); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [isRunning, sessionStarted, mode]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
        if (mode === "work") setDeepWorkSeconds((d) => d + 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === "work") { handleCompleteSession(); setMode("break"); setTimeLeft(BREAK_DURATION); setCompletedPomodoros((p) => p + 1); }
      else { setMode("work"); setTimeLeft(WORK_DURATION); }
      setIsRunning(false);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft, mode]);

  const handleStartSession = () => {
    if (!selectedTopic.trim()) return;
    setShowSetup(false); setSessionStarted(true); setIsRunning(true);
    startTimeRef.current = Date.now();
  };

  const handleCompleteSession = async () => { await saveSession(); };

  const saveSession = async () => {
    if (!userId || !planId || !startTimeRef.current) return;
    try {
      await fetch(`${apiBase}/api/focus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId, topic: selectedTopic, startTime: new Date(startTimeRef.current).toISOString(), endTime: new Date().toISOString(), actualMinutes: Math.floor(deepWorkSeconds / 60), distractions, deepWorkSeconds }),
      });
    } catch (e) { console.error("Failed to save session", e); }
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await saveSession();
    setSessionStarted(false); setShowSetup(true); setMode("work");
    setTimeLeft(WORK_DURATION); setDistractions(0); setDeepWorkSeconds(0);
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  if (showSetup) {
    return (
      <GlassCard glow glowColor="indigo" className="w-full max-w-xl mx-auto p-8">
        <div className="text-center mb-8">
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-6xl mb-4 inline-block">⏱️</motion.div>
          <h2 className="text-2xl font-bold text-slate-50 mb-2">Focus Session</h2>
          <p className="text-slate-400 text-sm">Enter deep work mode. Distractions are tracked automatically.</p>
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">What are you studying?</label>
          <input
            type="text" value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)}
            placeholder="e.g., Linear Algebra – Eigenvalues"
            onKeyDown={(e) => e.key === "Enter" && handleStartSession()}
            className="w-full rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none focus-glow transition-all text-sm"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[{ v: "25", l: "Work mins", c: "rgba(99,102,241,0.7)", bg: "rgba(99,102,241,0.12)" },
            { v: "5",  l: "Break mins", c: "rgba(52,211,153,0.7)",  bg: "rgba(52,211,153,0.10)" },
            { v: completedPomodoros.toString(), l: "Completed", c: "rgba(251,146,60,0.7)", bg: "rgba(251,146,60,0.10)" }].map((st) => (
            <div key={st.l} className="rounded-xl p-3 text-center" style={{ background: st.bg, border: `1px solid ${st.c.replace("0.7","0.25")}` }}>
              <p className="text-2xl font-bold" style={{ color: st.c }}>{st.v}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{st.l}</p>
            </div>
          ))}
        </div>

        <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
          onClick={handleStartSession} disabled={!selectedTopic.trim()}
          className="w-full rounded-2xl py-4 font-bold text-white text-sm disabled:opacity-40 glass-shine"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
          🎯 Start Focus Session
        </motion.button>
      </GlassCard>
    );
  }

  return (
    <GlassCard glow glowColor={mode === "work" ? "indigo" : "emerald"} className="w-full max-w-xl mx-auto p-8">
      {/* Topic + Mode badge */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Studying</p>
          <p className="font-semibold text-slate-100 text-sm truncate max-w-xs">{selectedTopic}</p>
        </div>
        <motion.div key={mode} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-full px-3 py-1.5 text-xs font-bold"
          style={mode === "work"
            ? { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }
            : { background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7" }}>
          {mode === "work" ? "🎯 WORK" : "☕ BREAK"}
        </motion.div>
      </div>

      {/* Ring timer */}
      <div className="relative w-64 h-64 mx-auto mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
          {/* Track */}
          <circle cx="120" cy="120" r="110" fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.06)" />
          {/* Glow ring behind */}
          <circle cx="120" cy="120" r="110" fill="none" strokeWidth="12"
            stroke={mode === "work" ? "rgba(99,102,241,0.12)" : "rgba(52,211,153,0.12)"}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          {/* Progress */}
          <motion.circle cx="120" cy="120" r="110" fill="none" strokeWidth="8"
            stroke={mode === "work" ? "#6366f1" : "#34d399"}
            strokeDasharray={circumference} animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }} strokeLinecap="round" />
        </svg>
        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.p key={`${mm}${ss}`} initial={{ scale: 0.96 }} animate={{ scale: 1 }}
            className="text-5xl font-black font-mono tabular-nums"
            style={{ color: mode === "work" ? "#a5b4fc" : "#6ee7b7", textShadow: mode === "work" ? "0 0 30px rgba(99,102,241,0.4)" : "0 0 30px rgba(52,211,153,0.4)" }}>
            {mm}:{ss}
          </motion.p>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">{mode === "work" ? "focus" : "rest"}</p>
          {/* Pomodoro dots */}
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: Math.max(completedPomodoros, 1) }).map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < completedPomodoros ? "#f97316" : "rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {!isRunning ? (
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setIsRunning(true)}
            className="rounded-2xl px-8 py-3 font-bold text-white glass-shine"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
            ▶ Resume
          </motion.button>
        ) : (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setIsRunning(false); if (timerRef.current) clearInterval(timerRef.current); }}
            className="rounded-2xl px-8 py-3 font-semibold text-slate-300"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
            ⏸ Pause
          </motion.button>
        )}
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleStop}
          className="rounded-2xl px-6 py-3 font-semibold text-rose-300"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
          ■ Stop
        </motion.button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/[0.06]">
        {[
          { label: "Distractions", value: distractions, color: "#f87171", icon: "⚡" },
          { label: "Deep Work",    value: `${Math.floor(deepWorkSeconds / 60)}m`, color: "#a5b4fc", icon: "🎯" },
          { label: "Focus Score",  value: `${focusScore}%`, color: "#6ee7b7", icon: "📈" },
        ].map((st) => (
          <div key={st.label} className="text-center rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            <p className="text-lg mb-0.5">{st.icon}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: st.color }}>{st.value}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{st.label}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
