"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface CognitiveLoadTrackerProps {
  userId?: string;
  syllabusId?: string;
}

interface TopicLoad {
  _id: string;
  topic: string;
  cognitiveLoadScore?: number;
  difficultyLevel?: string;
  shouldSplit?: boolean;
  splitSuggestions?: string[];
  averageTimeOnTopic: number;
  averageQuizAccuracy: number;
  totalPauseCount: number;
}

export function CognitiveLoadTracker({ userId, syllabusId }: CognitiveLoadTrackerProps) {
  const [topics, setTopics] = useState<TopicLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    totalTopics: 0,
    highLoadTopics: 0,
    averageLoad: 0,
  });

  useEffect(() => {
    if (!userId || !syllabusId) return;
    
    fetchCognitiveLoadData();
  }, [userId, syllabusId]);

  const fetchCognitiveLoadData = async () => {
    try {
      const response = await fetch(`/api/cognitive-load/by-syllabus/${syllabusId}?userId=${userId}`);
      const data = await response.json();
      if (data.ok) {
        setTopics(data.records);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch cognitive load:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/cognitive-load/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, syllabusId }),
      });
      
      if (response.ok) {
        await fetchCognitiveLoadData();
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getDifficultyColor = (level?: string) => {
    switch (level) {
      case 'easy': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'hard': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'very-hard': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-white/5 border-white/10';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-500';
    if (score <= 25) return 'bg-green-500';
    if (score <= 50) return 'bg-yellow-500';
    if (score <= 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🧠</div>
          <p className="text-slate-400">Loading cognitive load data...</p>
        </div>
      </GlassCard>
    );
  }

  if (topics.length === 0) {
    return (
      <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-400">No learning data yet</p>
          <p className="text-sm text-slate-500 mt-2">
            Study topics to generate cognitive load analysis
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400 mb-1">Total Topics</p>
          <p className="text-2xl font-bold text-slate-100">{stats.totalTopics}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400 mb-1">High Load Topics</p>
          <p className="text-2xl font-bold text-red-400">{stats.highLoadTopics}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400 mb-1">Avg Cognitive Load</p>
          <p className="text-2xl font-bold text-indigo-400">{stats.averageLoad}/100</p>
        </GlassCard>
      </div>

      {/* Analyze Button */}
      <div className="flex justify-end">
        <GradientButton
          label={analyzing ? "Analyzing with AI..." : "Analyze with AI"}
          onClick={handleAnalyze}
          disabled={analyzing}
        />
      </div>

      {/* Topics Grid */}
      <div className="grid gap-4">
        {topics.map((topic) => (
          <motion.div
            key={topic._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border backdrop-blur-sm ${getDifficultyColor(topic.difficultyLevel)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-100 mb-1">
                  {topic.topic}
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <span>⏱️ {Math.round(topic.averageTimeOnTopic)}m avg</span>
                  <span>🎯 {Math.round(topic.averageQuizAccuracy)}% accuracy</span>
                  <span>⏸️ {topic.totalPauseCount} pauses</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold mb-1">
                  {topic.cognitiveLoadScore || '—'}
                </div>
                <div className="text-xs text-slate-400">/ 100</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getScoreColor(topic.cognitiveLoadScore)}`}
                style={{ width: `${topic.cognitiveLoadScore || 0}%` }}
              />
            </div>

            {/* Difficulty Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 rounded-full border capitalize">
                {topic.difficultyLevel || 'Not analyzed'}
              </span>
              
              {topic.shouldSplit && (
                <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                  ⚠️ Needs Splitting
                </span>
              )}
            </div>

            {/* Split Suggestions */}
            {topic.shouldSplit && topic.splitSuggestions && topic.splitSuggestions.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mt-3 pt-3 border-t border-red-500/20"
              >
                <p className="text-xs text-red-300 mb-2">AI Recommendations:</p>
                <ul className="space-y-1">
                  {topic.splitSuggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
