"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface WeeklyInsight {
  type: "time" | "focus" | "productivity" | "learning";
  title: string;
  description: string;
  actionableTip: string;
  metric?: string;
  change?: string;
}

interface FocusPatterns {
  bestFocusTime: string;
  averageFocusDuration: number;
  optimalSessionLength: number;
  averageDeepWorkRatio: number;
  focusTrend: string;
}

interface TimePatterns {
  bestStudyDay: string;
  averageStudyDuration: number;
  consistencyScore: number;
}

interface PatternData {
  timePatterns?: TimePatterns;
  focusPatterns?: FocusPatterns;
  weeklyInsights?: WeeklyInsight[];
  totalSessionsAnalyzed?: number;
  totalHoursTracked?: number;
  dataQualityScore?: number;
  lastUpdated?: string;
}

interface StudyInsightCardProps {
  userId?: string;
  syllabusId?: string;
}

const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";

export function StudyInsightCard({ userId, syllabusId }: StudyInsightCardProps) {
  const [patterns, setPatterns] = useState<PatternData | null>(null);
  const [dailyMessage, setDailyMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!syllabusId || !userId) { setLoading(false); return; }
    Promise.all([
      fetch(`${apiBase}/api/study-insights/${syllabusId}?userId=${userId}`).then(r => r.json()),
      fetch(`${apiBase}/api/study-insights/${syllabusId}/daily-message?userId=${userId}`).then(r => r.json()),
    ])
      .then(([patternsData, messageData]) => {
        if (patternsData.ok && patternsData.patterns) setPatterns(patternsData.patterns);
        if (messageData.ok) setDailyMessage(messageData.message?.message || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [syllabusId, userId]);

  if (loading) return (
    <GlassCard className="p-5 min-h-[150px] flex items-center justify-center">
      <div className="text-slate-500 text-sm">Loading insights...</div>
    </GlassCard>
  );

  if (!patterns) return (
    <GlassCard className="p-5">
      <div className="text-center py-6">
        <p className="text-3xl mb-2">📊</p>
        <p className="text-slate-400 text-sm">Study insights not yet available</p>
        <p className="text-slate-500 text-xs mt-1">Need at least 14 days of study data</p>
      </div>
    </GlassCard>
  );

  const insights: WeeklyInsight[] = patterns.weeklyInsights || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Daily coach message */}
      {dailyMessage && (
        <GlassCard className="p-4 border-indigo-500/20" glow glowColor="indigo">
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm">
              🤖
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">AI Daily Coach</p>
              <p className="text-sm text-slate-200 leading-relaxed">{dailyMessage}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Pattern stats */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-slate-200 mb-4">Study Pattern Insights</h3>
        <div className="grid grid-cols-2 gap-4">
          {patterns.timePatterns && (
            <>
              <div className="rounded-xl p-3 bg-white/[0.03] border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Best Day</p>
                <p className="text-sm font-semibold text-slate-100">{patterns.timePatterns.bestStudyDay || "N/A"}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Consistency: {patterns.timePatterns.consistencyScore || 0}%</p>
              </div>
              <div className="rounded-xl p-3 bg-white/[0.03] border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Best Focus Time</p>
                <p className="text-sm font-semibold text-slate-100">{patterns.focusPatterns?.bestFocusTime || "N/A"}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Optimal session: {patterns.focusPatterns?.optimalSessionLength || 25}min</p>
              </div>
            </>
          )}
          {patterns.focusPatterns && (
            <div className="rounded-xl p-3 bg-white/[0.03] border border-white/5">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Deep Work Ratio</p>
              <p className="text-sm font-semibold text-emerald-300">{Math.round((patterns.focusPatterns.averageDeepWorkRatio || 0) * 100)}%</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Avg focus: {patterns.focusPatterns.averageFocusDuration || 0}min</p>
            </div>
          )}
          <div className="rounded-xl p-3 bg-white/[0.03] border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Data Quality</p>
            <p className="text-sm font-semibold text-slate-100">{patterns.dataQualityScore || 0}%</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{patterns.totalSessionsAnalyzed || 0} sessions · {patterns.totalHoursTracked || 0}h tracked</p>
          </div>
        </div>
      </GlassCard>

      {/* Weekly insights */}
      {insights.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">This Week's Insights</h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl p-3 bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-lg shrink-0 mt-0.5">
                    {insight.type === "time" ? "⏰" : insight.type === "focus" ? "🎯" : insight.type === "productivity" ? "⚡" : "🧠"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{insight.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{insight.description}</p>
                    <p className="text-xs text-indigo-300 mt-1.5">💡 {insight.actionableTip}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}
