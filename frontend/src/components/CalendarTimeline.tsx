"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface Session {
  date: string;
  topic: string;
  duration: number; // in hours
  status: "pending" | "done" | "skipped" | "partial" | "planned";
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
  syllabusId?: string;
}

export function CalendarTimeline({ planId, userId, syllabusId }: CalendarViewProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  const [detectingGaps, setDetectingGaps] = useState(false);
  const [knowledgeGaps, setKnowledgeGaps] = useState<string[] | null>(null);

  // New state added for I2, I4, I5
  const [behindDays, setBehindDays] = useState(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [estimates, setEstimates] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!userId) return;
    
    const fetchPlanAndData = async () => {
      try {
        // Fix B3: Corrected URL from /api/study-plan to /api/plan
        const response = await fetch(`/api/plan/latest?userId=${userId}${syllabusId ? `&syllabusId=${syllabusId}` : ''}`);
        const data = await response.json();
        if (data.ok && data.plan) {
          setPlan(data.plan);

          const pId = data.plan._id;
          
          // Phase 6 (I4): Fetch progress
          const progRes = await fetch(`/api/plan/${pId}/progress?userId=${userId}`);
          const progData = await progRes.json();
          if (progData.ok && progData.behindDays > 0) {
            setBehindDays(progData.behindDays);
          }

          // Phase 7 (I5): Fetch estimates
          if (data.plan.syllabusId) {
             const estRes = await fetch(`${apiBase}/api/estimates/by-syllabus/${data.plan.syllabusId}?userId=${userId}`);
             const estData = await estRes.json();
             if (estData.ok && estData.estimates) {
               const estMap: Record<string, any> = {};
               estData.estimates.forEach((e: any) => { estMap[e.topic] = e; });
               setEstimates(estMap);
             }

             // Phase 10 (I2): Fetch weak topics
             const weakRes = await fetch(`${apiBase}/api/weak-topics/by-syllabus/${data.plan.syllabusId}?userId=${userId}`);
             const weakData = await weakRes.json();
             if (weakData.ok && weakData.weakTopics) {
               setWeakTopics(weakData.weakTopics.map((w: any) => w.topic.toLowerCase()));
             }
          }
        }
      } catch (error) {
        console.error("Failed to fetch study plan/data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanAndData();
  }, [userId, syllabusId]);

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
      case "planned": return "bg-indigo-500/20 border-indigo-500 text-indigo-300";
      default: return "bg-indigo-500/20 border-indigo-500 text-indigo-300";
    }
  };

  const handleUpdateSessionStatus = async (sessionId: number, status: Session["status"]) => {
    try {
      // Fix B4: Correct URL & PATCH body mapping {userId, sessionIndex, status}
      const response = await fetch(`${apiBase}/api/plan/${planId}/session`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionIndex: sessionId, status }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.plan) {
          setPlan(data.plan);
        }
      }
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  const handleDetectGaps = async () => {
    if (!selectedSession || !syllabusId || !plan) return;
    setDetectingGaps(true);
    setKnowledgeGaps(null);

    try {
      // Phase 11 & Phase 13 Concurrency: Detect both Missing Prerequisites and Semantic Dependencies
      const [gapResponse, semanticResponse] = await Promise.all([
        fetch(`${apiBase}/api/gap-detector/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, syllabusId, topicTitle: selectedSession.topic }),
        }).catch(e => ({ ok: false, json: () => ({ error: e }) })),
        fetch(`${apiBase}/api/weak-topics/flag-semantic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syllabusId, topicTitle: selectedSession.topic }),
        }).catch(e => ({ ok: false, json: () => ({ error: e }) }))
      ]);

      let updatedSessions = [...plan.sessions];
      
      if (gapResponse && typeof gapResponse.json === 'function') {
        const gapData = await gapResponse.json();
        if (gapData.ok && gapData.foundations) {
          setKnowledgeGaps(gapData.foundations);

          // Auto-insert them directly into the current plan for dynamic visual feedback
          const sessionIndex = plan.sessions.findIndex((s) => s.topic === selectedSession.topic && s.date === selectedSession.date);
          if (sessionIndex !== -1) {
            const newSessions: Session[] = gapData.foundations.map((f: string, i: number) => ({
              date: new Date(new Date(selectedSession.date).getTime() - 86400000 * (i + 1)).toISOString(),
              topic: `[Foundation] ${f}`,
              duration: 1,
              status: "pending",
            }));
            updatedSessions.splice(sessionIndex, 0, ...newSessions);
          }
        }
      }

      // Phase 13 Semantic Injection
      if (semanticResponse && typeof semanticResponse.json === 'function') {
        const semanticData = await semanticResponse.json();
        if (semanticData.ok && semanticData.atRisk?.length > 0) {
          // Mutate the local `updatedSessions` to flag at-risk topics
          const atRiskNames = semanticData.atRisk.map((r: any) => r.topic.toLowerCase());
          updatedSessions = updatedSessions.map((s: any) => {
            if (atRiskNames.includes(s.topic.replace(/\[.*\]\s*/g, '').trim().toLowerCase())) {
              return { ...s, semanticAtRisk: true, semanticReason: `Related to weak topic: ${selectedSession.topic}` };
            }
            return s;
          });
        }
      }

      updatedSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setPlan({ ...plan, sessions: updatedSessions });

    } catch (err) {
      console.error("Failed to detect gaps", err);
    } finally {
      setDetectingGaps(false);
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
          
          <div className="flex flex-col items-end gap-3">
             {/* Phase 6 (I4): Warning display */}
            {behindDays > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <span className="text-lg">⚠️</span>
                <div>
                   <p className="text-xs text-rose-300 font-semibold">You are {behindDays} days behind</p>
                   <p className="text-[10px] text-rose-300/80">Consider rescheduling in quick actions</p>
                </div>
              </div>
            )}
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
                    {/* Phase 7 (I5): Render Time Estimate and Confidence */}
                    {estimates[session.topic] && (
                       <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded">
                         est. {estimates[session.topic].estimatedHours}hrs ({estimates[session.topic].confidence}% conf)
                       </span>
                    )}
                  </div>
                  {/* Phase 10 (I2): Highlight Weak Topics inline */}
                  <h4 className="text-base font-semibold text-slate-100 mb-1 flex items-center gap-2">
                    {session.topic}
                    {weakTopics.includes(session.topic.toLowerCase()) && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] uppercase font-bold tracking-wider">
                         Weak Topic
                      </span>
                    )}
                  </h4>
                  {session.actualMinutes && (
                    <p className="text-xs text-slate-400">
                      Actual time: {session.actualMinutes} minutes
                    </p>
                  )}
                  {/* Phase 13 Semantic Flag */}
                  {(session as any).semanticAtRisk && (
                     <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30" title={(session as any).semanticReason}>
                       ⚠️ At Risk: {(session as any).semanticReason || 'Semantically Related to Weak Topic'}
                     </div>
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedSession(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl my-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-50">Session Details</h3>
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setKnowledgeGaps(null);
                }}
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

            {/* AI Knowledge Gap Detector section */}
            <div className="pt-4 border-t border-white/10">
              {knowledgeGaps ? (
                <GlassCard className="p-4 bg-orange-500/10 border-orange-500/30">
                  <div className="flex gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="text-sm font-bold text-orange-200 mb-1">Knowledge Gap Detected</h4>
                      <p className="text-xs text-orange-200/80 mb-3">Claude identified missing foundational concepts. We've auto-inserted these prerequisites into your schedule!</p>
                      <ul className="space-y-1">
                        {knowledgeGaps.map((gap, i) => (
                          <motion.li 
                            initial={{ x: -10, opacity: 0 }} 
                            animate={{ x: 0, opacity: 1 }} 
                            transition={{ delay: i * 0.1 }}
                            key={i} 
                            className="text-xs py-1 px-2 bg-black/20 rounded flex items-center gap-2 border border-orange-500/20 text-slate-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            {gap}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </GlassCard>
              ) : (
                <div className="flex flex-col items-center p-4 bg-white/[0.02] rounded-xl border border-white/5">
                  <p className="text-sm font-medium text-slate-300 mb-3">Struggling with this topic?</p>
                  <button
                    onClick={handleDetectGaps}
                    disabled={detectingGaps}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-wait"
                  >
                    {detectingGaps ? (
                      <>
                        <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Analyzing Graph...
                      </>
                    ) : (
                      <>
                        <span>🤖</span> Detect Knowledge Gaps
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex gap-3">
              <GradientButton
                label="Mark as Complete"
                onClick={() => {
                  handleUpdateSessionStatus(plan.sessions.findIndex(s => s.topic === selectedSession.topic && s.date === selectedSession.date), "done");
                  setSelectedSession(null);
                  setKnowledgeGaps(null);
                }}
                className="flex-1"
              />
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setKnowledgeGaps(null);
                }}
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
