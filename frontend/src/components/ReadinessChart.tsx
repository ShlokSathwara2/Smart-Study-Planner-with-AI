"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface TrendPoint {
  weekNumber: number;
  readinessPercentage: number;
  predictedScore: number;
  weekLabel: string;
}

interface ReadinessChartProps {
  userId?: string;
  syllabusId?: string;
}

const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";

export function ReadinessChart({ userId, syllabusId }: ReadinessChartProps) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [weeklyChange, setWeeklyChange] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!syllabusId || !userId) { setLoading(false); return; }
    fetch(`${apiBase}/api/exam-predict/${syllabusId}/trend?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.trend) {
          setTrend(d.trend);
          setWeeklyChange(d.weeklyChange || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [syllabusId, userId]);

  if (loading) return (
    <GlassCard className="p-5 min-h-[200px] flex items-center justify-center">
      <div className="text-slate-500 text-sm">Loading trend...</div>
    </GlassCard>
  );

  if (trend.length === 0) return (
    <GlassCard className="p-5">
      <div className="text-center py-6">
        <p className="text-3xl mb-2">📈</p>
        <p className="text-slate-400 text-sm">No readiness data yet</p>
        <p className="text-slate-500 text-xs mt-1">Complete a few study sessions to see your trend</p>
      </div>
    </GlassCard>
  );

  const maxVal = 100;
  const W = 360, H = 180, pad = { top: 10, right: 10, bottom: 30, left: 30 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xScale = (i: number) => pad.left + (i / Math.max(trend.length - 1, 1)) * innerW;
  const yScale = (v: number) => pad.top + innerH - (v / maxVal) * innerH;

  const readinessPath = trend.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(p.readinessPercentage)}`).join(' ');
  const scorePath = trend.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(p.predictedScore)}`).join(' ');

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Exam Readiness Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {trend.length} data point{trend.length > 1 ? "s" : ""}
            {weeklyChange !== 0 && (
              <span className={`ml-2 ${weeklyChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {weeklyChange > 0 ? "↑" : "↓"} {Math.abs(weeklyChange)}% this week
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded bg-indigo-500" />
            <span className="text-slate-400">Readiness</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded bg-emerald-500" />
            <span className="text-slate-400">Predicted</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.left} y1={yScale(v)} x2={W - pad.right} y2={yScale(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pad.left - 4} y={yScale(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="8">{v}%</text>
          </g>
        ))}

        {/* Readiness area fill */}
        <path d={`${readinessPath} L${xScale(trend.length - 1)},${yScale(0)} L${xScale(0)},${yScale(0)} Z`}
          fill="url(#readinessGrad)" opacity={0.15} />

        <defs>
          <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(52,211,153,0.4)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0)" />
          </linearGradient>
        </defs>

        {/* Readiness line */}
        <motion.path d={readinessPath} fill="none" stroke="#818cf8" strokeWidth="2"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
        {trend.map((p, i) => (
          <motion.circle key={`r-${i}`} cx={xScale(i)} cy={yScale(p.readinessPercentage)} r="3"
            fill="#818cf8" stroke="#1e293b" strokeWidth="1"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }} />
        ))}

        {/* Predicted score line */}
        <motion.path d={scorePath} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="4 3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
        {trend.map((p, i) => (
          <motion.circle key={`s-${i}`} cx={xScale(i)} cy={yScale(p.predictedScore)} r="2.5"
            fill="#34d399" stroke="#1e293b" strokeWidth="1"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }} />
        ))}

        {/* X-axis labels */}
        {trend.map((p, i) => (
          <text key={i} x={xScale(i)} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7">
            {p.weekLabel}
          </text>
        ))}
      </svg>
    </GlassCard>
  );
}
