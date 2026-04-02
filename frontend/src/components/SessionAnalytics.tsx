"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface SessionAnalyticsProps {
  userId?: string;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  averageFocusScore: number;
  totalDistractions: number;
  weeklyTrend: Array<{
    week: string;
    sessions: number;
    minutes: number;
    focusScore: number;
  }>;
}

export function SessionAnalytics({ userId }: SessionAnalyticsProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/focus/analytics?userId=${userId}`);
        const data = await response.json();
        if (data.ok && data.stats) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📊</div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </GlassCard>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📈</div>
          <p className="text-slate-400">No session data yet</p>
          <p className="text-sm text-slate-500 mt-2">Complete focus sessions to see your analytics</p>
        </div>
      </GlassCard>
    );
  }

  const completionRate = Math.round((stats.completedSessions / stats.totalSessions) * 100);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-2xl">✅</div>
            <p className="text-xs text-slate-400">Completion Rate</p>
          </div>
          <p className="text-3xl font-bold text-green-400">{completionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.completedSessions}/{stats.totalSessions} sessions
          </p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-2xl">⏱️</div>
            <p className="text-xs text-slate-400">Total Time</p>
          </div>
          <p className="text-3xl font-bold text-indigo-400">
            {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {Math.round(stats.totalMinutes / stats.totalSessions)}m avg/session
          </p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-2xl">🎯</div>
            <p className="text-xs text-slate-400">Avg Focus Score</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{stats.averageFocusScore}%</p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.averageFocusScore >= 80 ? "Excellent!" : "Keep improving"}
          </p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-2xl">⚠️</div>
            <p className="text-xs text-slate-400">Total Distractions</p>
          </div>
          <p className="text-3xl font-bold text-red-400">{stats.totalDistractions}</p>
          <p className="text-xs text-slate-500 mt-1">
            {(stats.totalDistractions / stats.totalSessions).toFixed(1)} per session
          </p>
        </GlassCard>
      </div>

      {/* Weekly Trend Chart */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-6">Weekly Progress</h3>
        
        <div className="h-64 flex items-end justify-between gap-2">
          {stats.weeklyTrend.map((week, index) => {
            const maxSessions = Math.max(...stats.weeklyTrend.map(w => w.sessions));
            const heightPercent = (week.sessions / maxSessions) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${heightPercent}%`, opacity: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-indigo-500/30 to-indigo-400 rounded-t-lg relative group"
                  style={{ minHeight: "8px" }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10">
                    <p className="font-medium text-slate-200">{week.sessions} sessions</p>
                    <p className="text-slate-400">{week.minutes}m • {week.focusScore}% focus</p>
                  </div>
                </motion.div>
                <p className="text-xs text-slate-400 rotate-[-45deg] origin-top-left translate-y-2">
                  {week.week}
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">💡</div>
            <h3 className="text-lg font-semibold text-slate-200">Insights</h3>
          </div>
          
          <div className="space-y-3">
            {stats.averageFocusScore >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-green-400 mt-0.5">✓</div>
                <div>
                  <p className="text-sm text-slate-200">Excellent focus!</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You're maintaining great concentration during study sessions.
                  </p>
                </div>
              </div>
            )}
            
            {stats.totalDistractions > stats.totalSessions && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-yellow-400 mt-0.5">⚠️</div>
                <div>
                  <p className="text-sm text-slate-200">Reduce distractions</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try closing unnecessary tabs and silencing notifications.
                  </p>
                </div>
              </div>
            )}
            
            {completionRate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <div className="text-indigo-400 mt-0.5">📅</div>
                <div>
                  <p className="text-sm text-slate-200">Stay consistent</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try to complete more of your scheduled sessions.
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🏆</div>
            <h3 className="text-lg font-semibold text-slate-200">Achievements</h3>
          </div>
          
          <div className="space-y-3">
            {stats.totalSessions >= 10 && (
              <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="text-2xl">🎯</div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Dedicated Learner</p>
                  <p className="text-xs text-slate-400 mt-1">Completed 10+ focus sessions</p>
                </div>
              </div>
            )}
            
            {stats.averageFocusScore >= 90 && (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="text-2xl">⭐</div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Focus Master</p>
                  <p className="text-xs text-slate-400 mt-1">Maintained 90%+ average focus score</p>
                </div>
              </div>
            )}
            
            {stats.totalMinutes >= 600 && (
              <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <div className="text-2xl">⏰</div>
                <div>
                  <p className="text-sm font-medium text-slate-200">Time Warrior</p>
                  <p className="text-xs text-slate-400 mt-1">Studied for 10+ hours total</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
