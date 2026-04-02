"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface Session {
  date: string;
  topic: string;
  duration: number; // in hours
  status: "pending" | "done" | "skipped" | "partial";
  actualMinutes?: number;
}

interface StudyPlan {
  _id: string;
  userId: string;
  syllabusId: string;
  examDate: string;
  sessions: Session[];
}

interface CalendarViewProps {
  planId?: string;
  userId?: string;
}

export function CalendarTimeline({ planId, userId }: CalendarViewProps) {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!planId || !userId) return;
    
    const fetchPlan = async () => {
      try {
        const response = await fetch(`/api/study-plan/${planId}?userId=${userId}`);
        const data = await response.json();
        if (data.ok && data.plan) {
          setPlan(data.plan);
        }
      } catch (error) {
        console.error("Failed to fetch study plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, userId]);

  if (loading) {
    return (
      <GlassCard className="w-full min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Loading your study plan...</p>
        </div>
      </GlassCard>
    );
  }

  if (!plan || !plan.sessions.length) {
    return (
      <GlassCard className="w-full min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-slate-400">No study plan created yet</p>
          <p className="text-sm text-slate-500 mt-2">Generate a plan after uploading your syllabus</p>
        </div>
      </GlassCard>
    );
  }

  // Group sessions by week
  const weeks: Session[][] = [];
  let currentWeekSessions: Session[] = [];
  let lastWeekNumber = -1;

  plan.sessions.forEach((session) => {
    const sessionDate = new Date(session.date);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const weekNum = Math.floor(((sessionDate.getTime() - startOfYear.getTime()) / 86400000) / 7);
    
    if (weekNum !== lastWeekNumber && lastWeekNumber !== -1) {
      weeks.push(currentWeekSessions);
      currentWeekSessions = [];
    }
    
    currentWeekSessions.push(session);
    lastWeekNumber = weekNum;
  });
  
  if (currentWeekSessions.length > 0) {
    weeks.push(currentWeekSessions);
  }

  const displayedWeek = weeks[currentWeek] || [];
  const weekStart = displayedWeek[0] ? new Date(displayedWeek[0].date) : new Date();
  const weekEnd = displayedWeek[displayedWeek.length - 1] 
    ? new Date(displayedWeek[displayedWeek.length - 1].date)
    : new Date();

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "done": return "bg-green-500/20 border-green-500 text-green-300";
      case "skipped": return "bg-red-500/20 border-red-500 text-red-300";
      case "partial": return "bg-yellow-500/20 border-yellow-500 text-yellow-300";
      default: return "bg-indigo-500/20 border-indigo-500 text-indigo-300";
    }
  };

  const handleUpdateSessionStatus = async (sessionId: number, status: Session["status"]) => {
    try {
      const response = await fetch(`/api/study-plan/${planId}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status }),
      });
      
      if (response.ok) {
        // Refresh the plan
        const updatedResponse = await fetch(`/api/study-plan/${planId}?userId=${userId}`);
        const data = await updatedResponse.json();
        if (data.ok) setPlan(data.plan);
      }
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  return (
    <GlassCard className="w-full overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-50">Study Schedule</h2>
            <p className="text-sm text-slate-400 mt-1">
              Exam Date: {new Date(plan.examDate).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-400">
              Week {currentWeek + 1} of {weeks.length}
            </span>
            <button
              onClick={() => setCurrentWeek(Math.min(weeks.length - 1, currentWeek + 1))}
              disabled={currentWeek === weeks.length - 1}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Week Overview */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const daySessions = displayedWeek.filter(s => 
              new Date(s.date).toDateString() === date.toDateString()
            );
            
            return (
              <div
                key={i}
                className={`rounded-lg p-3 border ${
                  daySessions.length > 0
                    ? "border-indigo-500/30 bg-indigo-500/10"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <p className="text-xs text-slate-400 mb-1">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className="text-lg font-bold text-slate-100 mb-2">
                  {date.getDate()}
                </p>
                {daySessions.map((session, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`mb-1 px-2 py-1 rounded text-xs cursor-pointer ${getStatusColor(session.status)}`}
                    onClick={() => setSelectedSession(session)}
                    whileHover={{ scale: 1.05 }}
                  >
                    {session.topic.substring(0, 15)}...
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            This Week's Sessions ({displayedWeek.length})
          </h3>
          
          {displayedWeek.map((session, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border ${getStatusColor(session.status)} backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-400">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-slate-300">
                      {session.duration}h
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-slate-100 mb-1">
                    {session.topic}
                  </h4>
                  {session.actualMinutes && (
                    <p className="text-xs text-slate-400">
                      Actual time: {session.actualMinutes} minutes
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={session.status}
                    onChange={(e) => handleUpdateSessionStatus(index, e.target.value as Session["status"])}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                    <option value="partial">Partial</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSession(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-50">Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Topic</p>
                <p className="text-base text-slate-200">{selectedSession.topic}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Date</p>
                  <p className="text-sm text-slate-200">
                    {new Date(selectedSession.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Duration</p>
                  <p className="text-sm text-slate-200">{selectedSession.duration} hours</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm capitalize ${getStatusColor(selectedSession.status)}`}>
                  {selectedSession.status}
                </div>
              </div>
              
              {selectedSession.actualMinutes && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Actual Time Spent</p>
                  <p className="text-sm text-slate-200">{selectedSession.actualMinutes} minutes</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <GradientButton
                label="Mark as Complete"
                onClick={() => {
                  handleUpdateSessionStatus(plan.sessions.indexOf(selectedSession), "done");
                  setSelectedSession(null);
                }}
                className="flex-1"
              />
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </GlassCard>
  );
}
