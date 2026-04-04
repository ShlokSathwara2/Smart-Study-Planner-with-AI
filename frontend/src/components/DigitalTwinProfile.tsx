"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface DigitalTwin {
  _id: string;
  userId: string;
  syllabusId: string;
  learningPersonality: string;
  aiSummary: string;
  totalStudyMinutes: number;
  totalSessionsCompleted: number;
  totalQuizzesTaken: number;
  topicsMastered: number;
  topicsInProgress: number;
  performance: {
    averageQuizScore: number;
    retentionRate: number;
    focusScore: number;
    completionRate: number;
    accuracyTrend: "improving" | "stable" | "declining";
    consistencyScore: number;
  };
  timePatterns: {
    bestStudyHours: number[];
    mostProductiveDay: string;
    leastProductiveDay: string;
    averageSessionDuration: number;
    streakDays: number;
  };
  predictiveInsights: {
    predictedExamScore: number;
    confidenceLevel: number;
    readinessTrend: "increasing" | "stable" | "decreasing";
    weakAreas: string[];
    strongAreas: string[];
    recommendedFocus: string[];
  };
  learningStyle: {
    visualLearner: number;
    auditoryLearner: number;
    kinestheticLearner: number;
    readingWritingLearner: number;
  };
  updatedAt: string;
}

interface DigitalTwinProfileProps {
  userId?: string;
  syllabusId?: string;
}

export function DigitalTwinProfile({ userId, syllabusId }: DigitalTwinProfileProps) {
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!userId || !syllabusId) return;

    fetchDigitalTwin();
  }, [userId, syllabusId]);

  const fetchDigitalTwin = async () => {
    try {
      const response = await fetch(`${apiBase}/api/digital-twin/${syllabusId}?userId=${userId}`);
      const data = await response.json();

      if (data.ok && data.digitalTwin) {
        setDigitalTwin(data.digitalTwin);
      }
    } catch (error) {
      console.error("Failed to fetch digital twin:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDigitalTwin = async () => {
    if (!userId || !syllabusId) return;

    setGenerating(true);
    try {
      const response = await fetch(`${apiBase}/api/digital-twin/${syllabusId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, forceRegenerate: false }),
      });

      const data = await response.json();
      if (data.ok && data.digitalTwin) {
        setDigitalTwin(data.digitalTwin);
      }
    } catch (error) {
      console.error("Failed to generate digital twin:", error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🧠</div>
          <p className="text-slate-400">Loading your learning profile...</p>
        </div>
      </GlassCard>
    );
  }

  if (!digitalTwin) {
    return (
      <GlassCard className="w-full min-h-[400px] flex flex-col items-center justify-center gap-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            No Learning Profile Yet
          </h3>
          <p className="text-slate-400 mb-6">
            Your AI Digital Twin analyzes your study patterns, quiz performance, 
            and learning habits to create a personalized learning model.
          </p>
          <GradientButton
            label={generating ? "Analyzing Your Data..." : "Generate My Digital Twin"}
            onClick={handleGenerateDigitalTwin}
            disabled={generating}
            className="min-w-[250px]"
          />
        </div>
      </GlassCard>
    );
  }

  const ProgressRing = ({ value, color, size = 120 }: { value: number; color: string; size?: number }) => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="text-slate-700"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`${color} transition-all duration-1000 ease-out`}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-slate-100">{value}%</span>
        </div>
      </div>
    );
  };

  const StatCard = ({ icon, label, value, subtext, gradient }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-gradient-to-br p-4 ${gradient}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-lg font-bold text-slate-100">{value}</p>
          {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-50 flex items-center gap-3">
            🧠 Your Learning Profile
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              {digitalTwin.learningPersonality}
            </span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            AI-powered insights based on {digitalTwin.totalStudyMinutes} minutes of study data
          </p>
        </div>
        <button
          onClick={handleGenerateDigitalTwin}
          disabled={generating}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-slate-200 transition-colors disabled:opacity-50"
        >
          {generating ? "Updating..." : "Refresh"}
        </button>
      </div>

      {/* AI Summary */}
      <GlassCard className="p-6 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/25">
        <div className="flex gap-4">
          <div className="shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
            🤖
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
              AI Analysis
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">
              {digitalTwin.aiSummary}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📊"
          label="Predicted Exam Score"
          value={`${digitalTwin.predictiveInsights.predictedExamScore}%`}
          subtext={`${digitalTwin.predictiveInsights.readinessTrend} trend`}
          gradient="from-emerald-500/20 to-emerald-600/10 border-emerald-500/25"
        />
        <StatCard
          icon="🎯"
          label="Quiz Average"
          value={`${digitalTwin.performance.averageQuizScore}%`}
          subtext={`${digitalTwin.performance.accuracyTrend}`}
          gradient="from-sky-500/20 to-blue-600/10 border-sky-500/25"
        />
        <StatCard
          icon="⚡"
          label="Focus Score"
          value={`${digitalTwin.performance.focusScore}/100`}
          subtext={`${digitalTwin.timePatterns.streakDays}-day streak`}
          gradient="from-violet-500/20 to-purple-600/10 border-violet-500/25"
        />
        <StatCard
          icon="🔁"
          label="Retention Rate"
          value={`${digitalTwin.performance.retentionRate}%`}
          subtext="Long-term memory"
          gradient="from-amber-500/20 to-orange-600/10 border-amber-500/25"
        />
      </div>

      {/* Circular Progress Rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10">
          <ProgressRing
            value={digitalTwin.performance.completionRate}
            color="text-emerald-400"
          />
          <p className="text-xs text-slate-400 mt-3">Completion Rate</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10">
          <ProgressRing
            value={digitalTwin.predictiveInsights.confidenceLevel}
            color="text-indigo-400"
          />
          <p className="text-xs text-slate-400 mt-3">AI Confidence</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10">
          <ProgressRing
            value={digitalTwin.performance.consistencyScore}
            color="text-violet-400"
          />
          <p className="text-xs text-slate-400 mt-3">Consistency</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10">
          <ProgressRing
            value={Math.round((digitalTwin.topicsMastered / Math.max(1, digitalTwin.topicsMastered + digitalTwin.topicsInProgress)) * 100)}
            color="text-amber-400"
          />
          <p className="text-xs text-slate-400 mt-3">Mastery Progress</p>
        </div>
      </div>

      {/* Learning Style */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          🎨 Learning Style Preferences
        </h3>
        <div className="space-y-4">
          {[
            { label: "Visual", value: digitalTwin.learningStyle.visualLearner, icon: "👁️" },
            { label: "Reading/Writing", value: digitalTwin.learningStyle.readingWritingLearner, icon: "📝" },
            { label: "Auditory", value: digitalTwin.learningStyle.auditoryLearner, icon: "🎧" },
            { label: "Kinesthetic", value: digitalTwin.learningStyle.kinestheticLearner, icon: "✋" },
          ].map((style) => (
            <div key={style.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <span>{style.icon}</span>
                  {style.label}
                </span>
                <span className="text-sm font-semibold text-slate-200">{style.value}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${style.value}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Time Patterns & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Study Times */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            ⏰ Optimal Study Schedule
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-sm text-slate-300">Best Hours</span>
              <span className="text-sm font-semibold text-indigo-300">
                {digitalTwin.timePatterns.bestStudyHours.map(h => `${h}:00`).join(', ')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm text-slate-300">Best Day</span>
              <span className="text-sm font-semibold text-emerald-300">
                {digitalTwin.timePatterns.mostProductiveDay}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-slate-300">Avg Session</span>
              <span className="text-sm font-semibold text-slate-200">
                {digitalTwin.timePatterns.averageSessionDuration} min
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Focus Areas */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            🎯 Recommended Focus
          </h3>
          <div className="space-y-2">
            {digitalTwin.predictiveInsights.recommendedFocus.length > 0 ? (
              digitalTwin.predictiveInsights.recommendedFocus.slice(0, 4).map((focus, i) => (
                <motion.div
                  key={focus}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20"
                >
                  <div className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-sm text-rose-200">{focus}</span>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Keep up the great work! No specific areas need immediate attention.</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Weak vs Strong Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            ⚠️ Areas Needing Attention
          </h3>
          {digitalTwin.predictiveInsights.weakAreas.length > 0 ? (
            <ul className="space-y-2">
              {digitalTwin.predictiveInsights.weakAreas.slice(0, 5).map((area, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-rose-300">
                  <span className="text-rose-400">•</span>
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No weak areas identified yet!</p>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            ✅ Strong Areas
          </h3>
          {digitalTwin.predictiveInsights.strongAreas.length > 0 ? (
            <ul className="space-y-2">
              {digitalTwin.predictiveInsights.strongAreas.slice(0, 5).map((area, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-emerald-300">
                  <span className="text-emerald-400">✓</span>
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Keep studying to identify your strengths!</p>
          )}
        </GlassCard>
      </div>

      {/* Overall Stats */}
      <GlassCard className="p-6 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border-slate-500/25">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">📈 Overall Progress</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100">{Math.round(digitalTwin.totalStudyMinutes / 60)}</p>
            <p className="text-xs text-slate-400 mt-1">Hours Studied</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100">{digitalTwin.totalSessionsCompleted}</p>
            <p className="text-xs text-slate-400 mt-1">Sessions Done</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100">{digitalTwin.totalQuizzesTaken}</p>
            <p className="text-xs text-slate-400 mt-1">Quizzes Taken</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100">{digitalTwin.topicsMastered}/{digitalTwin.topicsMastered + digitalTwin.topicsInProgress}</p>
            <p className="text-xs text-slate-400 mt-1">Topics Mastered</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
