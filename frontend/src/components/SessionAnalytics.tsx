"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface SessionAnalyticsProps { userId?: string; }

interface SessionStats {
  totalSessions: number; completedSessions: number; totalMinutes: number;
  averageFocusScore: number; totalDistractions: number;
  weeklyTrend: { week: string; sessions: number; minutes: number; focusScore: number; }[];
}

const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";

export function SessionAnalytics({ userId }: SessionAnalyticsProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`${apiBase}/api/focus/analytics?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.stats) setStats(d.stats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const Loader = ({ label }: { label: string }) => (
    <GlassCard className="w-full min-h-[300px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="h-10 w-10 mx-auto rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-slate-500 text-sm">{label}</p>
      </div>
    </GlassCard>
  );

  if (loading) return <Loader label="Loading analytics..." />;

  if (!stats || stats.totalSessions === 0) return (
    <GlassCard className="w-full min-h-[300px] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">📈</div>
        <p className="text-slate-300 font-medium">No session data yet</p>
        <p className="text-sm text-slate-500 mt-2">Complete focus sessions to see your analytics here</p>
      </div>
    </GlassCard>
  );

  const completionRate = Math.round((stats.completedSessions / stats.totalSessions) * 100);
  const maxSessions = Math.max(...stats.weeklyTrend.map((w) => w.sessions), 1);
  const hours = Math.floor(stats.totalMinutes / 60);
  const mins = stats.totalMinutes % 60;

  const overviewCards = [
    { icon: "✅", label: "Completion Rate", value: `${completionRate}%`, sub: `${stats.completedSessions}/${stats.totalSessions} sessions`, color: "rgba(52,211,153,0.7)", bg: "rgba(52,211,153,0.10)" },
    { icon: "⏱️", label: "Total Study Time",  value: `${hours}h ${mins}m`, sub: `${Math.round(stats.totalMinutes / stats.totalSessions)}m avg/session`, color: "rgba(99,102,241,0.7)", bg: "rgba(99,102,241,0.10)" },
    { icon: "🎯", label: "Avg Focus Score",  value: `${stats.averageFocusScore}%`, sub: stats.averageFocusScore >= 80 ? "Excellent!" : "Keep improving", color: "rgba(34,211,238,0.7)", bg: "rgba(34,211,238,0.10)" },
    { icon: "⚡", label: "Distractions",      value: `${stats.totalDistractions}`, sub: `${(stats.totalDistractions / stats.totalSessions).toFixed(1)} per session`, color: "rgba(251,146,60,0.7)", bg: "rgba(251,146,60,0.10)" },
  ];

  const achievements = [
    { show: stats.totalSessions >= 10,         icon: "🎯", title: "Dedicated Learner",  desc: "Completed 10+ focus sessions",       color: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.3)" },
    { show: stats.averageFocusScore >= 90,      icon: "⭐", title: "Focus Master",       desc: "Maintained 90%+ average focus",      color: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.3)" },
    { show: stats.totalMinutes >= 600,          icon: "⏰", title: "Time Warrior",       desc: "Studied for 10+ hours total",        color: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)" },
    { show: stats.totalDistractions === 0,      icon: "🧘", title: "Undisturbed",        desc: "Zero distractions in your sessions", color: "rgba(34,211,238,0.10)", border: "rgba(34,211,238,0.3)" },
  ].filter((a) => a.show);

  const insights = [
    { show: stats.averageFocusScore >= 80,         icon: "✓", text: "Excellent focus!", sub: "You're maintaining great concentration.", color: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.3)", tc: "#6ee7b7" },
    { show: stats.totalDistractions > stats.totalSessions, icon: "⚠️", text: "Reduce distractions", sub: "Try closing unnecessary tabs and silencing notifications.", color: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.3)", tc: "#fcd34d" },
    { show: completionRate < 70,                   icon: "📅", text: "Stay consistent", sub: "Try to complete more of your scheduled sessions.", color: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.25)", tc: "#a5b4fc" },
  ].filter((i) => i.show);

  return (
    <div className="space-y-5">
      {/* Overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ y: -4 }} className="rounded-2xl p-5 glass-shine"
            style={{ background: `linear-gradient(135deg, ${c.bg} 0%, rgba(255,255,255,0.025) 100%)`, backdropFilter: "blur(24px)", border: `1px solid ${c.color.replace("0.7","0.22")}`, boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{c.icon}</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-2xl font-black tabular-nums" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{c.label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-200">Weekly Progress</h3>
          <span className="text-[10px] text-slate-600 uppercase tracking-widest">Sessions per week</span>
        </div>
        <div className="h-52 flex items-end gap-3">
          {stats.weeklyTrend.map((week, i) => {
            const h = Math.max((week.sessions / maxSessions) * 100, 4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full" style={{ height: "192px", display: "flex", alignItems: "flex-end" }}>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap rounded-xl px-3 py-2 text-xs"
                    style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}>
                    <p className="font-semibold text-slate-200">{week.sessions} sessions</p>
                    <p className="text-slate-400">{week.minutes}m · {week.focusScore}% focus</p>
                  </div>
                  <motion.div className="w-full rounded-t-xl relative overflow-hidden"
                    initial={{ height: 0 }} animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.08, duration: 0.55, ease: "easeOut" }}
                    style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.8) 0%, rgba(99,102,241,0.3) 100%)", boxShadow: "0 0 12px rgba(99,102,241,0.2)" }}>
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "rgba(165,180,252,0.6)" }} />
                  </motion.div>
                </div>
                <p className="text-[10px] text-slate-500 truncate w-full text-center">{week.week.slice(-5)}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Insights + Achievements */}
      <div className="grid lg:grid-cols-2 gap-5">
        <GlassCard className="p-6">
          <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2"><span>💡</span> Insights</h3>
          <div className="space-y-3">
            {insights.length === 0 && <p className="text-sm text-slate-500">Study more sessions to unlock insights.</p>}
            {insights.map((ins, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className="flex gap-3 items-start rounded-xl p-3"
                style={{ background: ins.color, border: `1px solid ${ins.border}` }}>
                <span className="text-base mt-0.5">{ins.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: ins.tc }}>{ins.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{ins.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2"><span>🏆</span> Achievements</h3>
          <div className="space-y-3">
            {achievements.length === 0 && <p className="text-sm text-slate-500">Complete more sessions to unlock achievements.</p>}
            {achievements.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: a.color, border: `1px solid ${a.border}` }}>
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
