'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';

const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";

interface StrategyChatProps {
  userId: string;
  syllabusId: string;
  onStrategyGenerated?: (strategy: any) => void;
}
interface DayPlan {

  day: number;
  date: string;
  topics: string[];
  estimatedHours: number;
  focus: string;
  tips: string;
}
interface GeneratedStrategy {

  summary: string;
  totalDays: number;
  dailyPlan: DayPlan[];
  priorityTopics: string[];
  recommendedActions: string[];
  confidenceLevel: number;
}

export function StrategyChat({ userId, syllabusId, onStrategyGenerated }: StrategyChatProps) {
  const [query, setQuery] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<GeneratedStrategy | null>(null);
  const [approved, setApproved] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/study-strategy/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          syllabusId,
          query,
          examDate: examDate || undefined,
          availableHoursPerDay: hoursPerDay,
        }),
      });

      // Check if response is HTML (error page)
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. Backend may not be running.');
      }

      const data = await res.json();
      if (data.ok && data.strategy) {
        setStrategy(data.strategy);
        onStrategyGenerated?.(data.strategy);
      } else {
        alert(data.error || 'Failed to generate strategy');
      }
    } catch (err: any) {
      console.error('Failed to generate strategy:', err);
      alert(err.message || 'Failed to generate strategy. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!strategy) return;
    
    try {
      const res = await fetch(`${apiBase}/api/study-strategy/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          syllabusId,
          strategy,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setApproved(true);
        setTimeout(() => {
          setApproved(false);
          setStrategy(null);
          setQuery('');
        }, 2000);
      } else {
        alert(data.error || 'Failed to approve strategy');
      }
    } catch (err) {
      console.error('Failed to approve strategy:', err);
      alert('Failed to approve strategy. Please try again.');
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
        🧠 AI Study Strategy Generator
      </h3>

      {/* Chat Input */}
      <div className="space-y-4 mb-6">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ask: "How should I prepare for my AI exam in 10 days?" or "Create a study plan for calculus"'
          className="w-full h-24 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Exam Date (optional)
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Hours/Day: {hoursPerDay}h
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !query.trim()}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-all shadow-lg shadow-indigo-500/25"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : (
            '✨ Generate Strategy'
          )}
        </button>
      </div>

      {/* Generated Strategy Display */}
      {strategy && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Summary Card */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
            <p className="text-sm text-indigo-200 mb-3">{strategy.summary}</p>
            
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full">
                📅 {strategy.totalDays} days
              </span>
              <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                ✓ Confidence: {strategy.confidenceLevel}%
              </span>
              {strategy.priorityTopics.length > 0 && (
                <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full">
                  ⚡ {strategy.priorityTopics.length} priority topics
                </span>
              )}
            </div>
          </div>

          {/* Daily Plan Preview */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">
              📋 Study Plan Preview
            </h4>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {strategy.dailyPlan.slice(0, 5).map((day: DayPlan, idx: number) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-200">
                      Day {day.day} • {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                      {day.estimatedHours}h
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {day.topics.slice(0, 3).map((topic, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded">
                        {topic.length > 30 ? topic.substring(0, 30) + '...' : topic}
                      </span>
                    ))}
                    {day.topics.length > 3 && (
                      <span className="text-xs text-slate-500">+{day.topics.length - 3} more</span>
                    )}
                  </div>
                  {day.tips && (
                    <p className="text-xs text-slate-500">💡 {day.tips}</p>
                  )}
                </div>
              ))}
              {strategy.dailyPlan.length > 5 && (
                <p className="text-xs text-slate-500 text-center py-2">
                  + {strategy.dailyPlan.length - 5} more days in full plan
                </p>
              )}
            </div>
          </div>

          {/* Recommended Actions */}
          {strategy.recommendedActions.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">
                🎯 Recommended Actions
              </h4>
              <ul className="space-y-1">
                {strategy.recommendedActions.map((action, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400 mt-1">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Approve Button */}
          <button
            onClick={handleApprove}
            disabled={approved}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              approved
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25'
            }`}
          >
            {approved ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Strategy Applied to Schedule!
              </span>
            ) : (
              '✓ Approve & Replace Current Schedule'
            )}
          </button>

          <p className="text-xs text-slate-500 text-center">
            This will replace all planned (not completed) sessions with the new strategy
          </p>
        </motion.div>
      )}
    </GlassCard>
  );
}
