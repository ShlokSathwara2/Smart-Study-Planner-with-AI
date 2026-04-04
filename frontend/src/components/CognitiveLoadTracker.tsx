"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface CognitiveLoadTrackerProps { userId?: string; syllabusId?: string; }
interface TopicLoad {
  _id: string; topic: string; cognitiveLoadScore?: number; difficultyLevel?: string;
  shouldSplit?: boolean; splitSuggestions?: string[];
  averageTimeOnTopic: number; averageQuizAccuracy: number; totalPauseCount: number;
}

const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";

const DIFF_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  easy:      { label: "Easy",      color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.25)"  },
  medium:    { label: "Medium",    color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.25)"  },
  hard:      { label: "Hard",      color: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.25)"  },
  "very-hard":{ label: "Very Hard",color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)" },
};

function ScoreBar({ score }: { score?: number }) {
  const v = score ?? 0;
  const color = v <= 25 ? "#4ade80" : v <= 50 ? "#fbbf24" : v <= 75 ? "#fb923c" : "#f87171";
  return (
    <div className="w-full rounded-full h-1.5 overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${v}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }} style={{ background: color }} />
    </div>
  );
}

export function CognitiveLoadTracker({ userId, syllabusId }: CognitiveLoadTrackerProps) {
  const [topics, setTopics] = useState<TopicLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalTopics: 0, highLoadTopics: 0, averageLoad: 0 });

  const fetchData = async () => {
    if (!userId || !syllabusId) return;
    try {
      const r = await fetch(`${apiBase}/api/cognitive-load/by-syllabus/${syllabusId}?userId=${userId}`);
      const d = await r.json();
      if (d.ok) { setTopics(d.records); setStats(d.stats); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [userId, syllabusId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await fetch(`${apiBase}/api/cognitive-load/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, syllabusId }),
      });
      await fetchData();
    } catch (e) { console.error(e); } finally { setAnalyzing(false); }
  };

  if (loading) return (
    <GlassCard className="w-full min-h-[300px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="h-10 w-10 mx-auto rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-slate-500 text-sm">Loading cognitive data...</p>
      </div>
    </GlassCard>
  );

  if (topics.length === 0) return (
    <GlassCard className="w-full min-h-[300px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-5xl">🧠</div>
        <p className="text-slate-300 font-medium">No learning data yet</p>
        <p className="text-sm text-slate-500">Study topics to generate cognitive load analysis</p>
        {syllabusId && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAnalyze} disabled={analyzing}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
            {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </motion.button>
        )}
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Topics",    value: stats.totalTopics,           color: "rgba(99,102,241,0.7)", bg: "rgba(99,102,241,0.10)" },
          { label: "High Load",       value: stats.highLoadTopics,        color: "rgba(248,113,113,0.7)", bg: "rgba(248,113,113,0.10)" },
          { label: "Avg Load Score",  value: `${stats.averageLoad}/100`,  color: "rgba(251,191,36,0.7)", bg: "rgba(251,191,36,0.10)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 glass-shine"
            style={{ background: `linear-gradient(135deg, ${s.bg} 0%, rgba(255,255,255,0.02) 100%)`, backdropFilter: "blur(24px)", border: `1px solid ${s.color.replace("0.7","0.22")}`, boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
            <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Analyze button */}
      <div className="flex justify-end">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAnalyze} disabled={analyzing}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 glass-shine"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
          {analyzing ? (
            <span className="flex items-center gap-2">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="inline-block">⚙️</motion.span>
              Analyzing with AI...
            </span>
          ) : "🧠 Analyze with AI"}
        </motion.button>
      </div>

      {/* Topic cards */}
      <div className="space-y-3">
        {topics.map((topic, i) => {
          const dc = DIFF_CONFIG[topic.difficultyLevel || ""] || { label: "Unknown", color: "#94a3b8", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" };
          const isOpen = expanded === topic._id;
          return (
            <motion.div key={topic._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="rounded-2xl overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${dc.bg} 0%, rgba(255,255,255,0.02) 100%)`, backdropFilter: "blur(24px)", border: `1px solid ${dc.border}`, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
              <button className="w-full p-5 text-left" onClick={() => setExpanded(isOpen ? null : topic._id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{topic.topic}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>⏱️ {Math.round(topic.averageTimeOnTopic)}m avg</span>
                      <span>🎯 {Math.round(topic.averageQuizAccuracy)}% accuracy</span>
                      <span>⏸️ {topic.totalPauseCount} pauses</span>
                    </div>
                    <ScoreBar score={topic.cognitiveLoadScore} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-black tabular-nums" style={{ color: dc.color }}>{topic.cognitiveLoadScore ?? "—"}</p>
                    <p className="text-[10px] text-slate-600">/ 100</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: dc.bg, color: dc.color, border: `1px solid ${dc.border}` }}>{dc.label}</span>
                  {topic.shouldSplit && (
                    <span className="text-xs font-medium rounded-full px-2.5 py-1" style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>⚠️ Needs Splitting</span>
                  )}
                  <span className="ml-auto text-slate-600 text-sm">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>
              <AnimatePresence>
                {isOpen && topic.splitSuggestions && topic.splitSuggestions.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="px-5 pb-5 overflow-hidden">
                    <div className="pt-4 border-t border-white/[0.06]">
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-400/80 mb-3">AI Recommendations</p>
                      <ul className="space-y-2">
                        {topic.splitSuggestions.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-rose-400 mt-0.5 shrink-0">→</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
