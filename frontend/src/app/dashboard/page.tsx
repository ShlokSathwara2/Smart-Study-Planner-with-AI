"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { SyllabusUploader } from "@/components/SyllabusUploader";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { CalendarTimeline } from "@/components/CalendarTimeline";
import { FocusTimer } from "@/components/FocusTimer";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { CognitiveLoadTracker } from "@/components/CognitiveLoadTracker";
import { DigitalTwinProfile } from "@/components/DigitalTwinProfile";
import { VoiceInput } from "@/components/VoiceInput";
import { StrategyChat } from "@/components/StrategyChat";
import { ReviewBanner } from "@/components/ReviewBanner";
import { ReadinessChart } from "@/components/ReadinessChart";
import { StudyInsightCard } from "@/components/StudyInsightCard";
import ClickSpark from "@/components/ClickSpark";

type Tab = "home" | "upload" | "graph" | "schedule" | "focus" | "analytics" | "cognitive" | "profile" | "voice" | "strategy";

const TABS = [
  { id: "home",      icon: "🏠", label: "Home" },
  { id: "upload",    icon: "📤", label: "Upload" },
  { id: "graph",     icon: "🗺️", label: "Learning Map" },
  { id: "schedule",  icon: "📅", label: "Schedule" },
  { id: "focus",     icon: "⏱️", label: "Focus" },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "cognitive", icon: "🧠", label: "Cognitive Load" },
  { id: "voice",     icon: "🎤", label: "Voice Log" },
  { id: "strategy",  icon: "🧠", label: "AI Strategy" },
  { id: "profile",   icon: "👤", label: "My Profile" },
];

const STUDENTS = [
  { name: "Tom Smith", score: 85, color: "#14b8a6" },
  { name: "Olivia Jones", score: 95, color: "#0d9488" },
  { name: "Michael Brown", score: 56, color: "#f59e0b" },
  { name: "Emma Wilson", score: 72, color: "#10b981" },
];

const LESSONS = [
  { title: "High fidelity worksheets", time: "Today, 10:00 AM", subject: "Mathematics", icon: "📐" },
  { title: "High fidelity worksheets", time: "Today, 11:00 AM", subject: "Mathematics", icon: "📐" },
  { title: "High fidelity worksheets", time: "Today, 12:00 PM", subject: "Mathematics", icon: "📐" },
];

const EVENTS = [
  { time: "8:30 am", label: "Biology", color: "#14b8a6" },
  { time: "9:30 am", label: "Chemistry", color: "#f59e0b" },
  { time: "10:30 am", label: "Physics", color: "#ef4444" },
];

const NOTES = [
  "prepare question for final exam",
  "prepare question for final exam",
  "prepare question for final exam",
];

function MiniCalendar() {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);
  const today = 27;

  return (
    <div className="dashboard-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">June 2025</h3>
        <div className="flex gap-1">
          <button className="w-6 h-6 rounded-md hover:bg-teal-50 flex items-center justify-center text-xs text-gray-400">{"<"}</button>
          <button className="w-6 h-6 rounded-md hover:bg-teal-50 flex items-center justify-center text-xs text-gray-400">{">"}</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => (
          <div key={d} className="text-center text-[9px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
        {dates.map((d) => (
          <div
            key={d}
            className={`text-center text-xs py-1.5 rounded-lg cursor-pointer transition-colors ${
              d === today
                ? "bg-teal-500 text-white font-semibold"
                : "text-gray-600 hover:bg-teal-50"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceChart() {
  return (
    <div className="dashboard-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Total attendance report</h3>
        <div className="flex items-center gap-1 bg-teal-50 rounded-lg px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          <span className="text-xs font-semibold text-teal-600">weekly</span>
        </div>
      </div>
      <svg viewBox="0 0 500 120" className="w-full h-28">
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M0,80 C40,70 80,40 120,50 C160,60 200,90 240,85 C280,80 320,30 360,40 C400,50 440,70 480,60 L500,55 L500,120 L0,120 Z" fill="url(#waveGrad)"/>
        <path d="M0,80 C40,70 80,40 120,50 C160,60 200,90 240,85 C280,80 320,30 360,40 C400,50 440,70 480,60 L500,55" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round"/>
        {[0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480].map((x, i) => (
          <line key={i} x1={x} y1="0" x2={x} y2="120" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5"/>
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-gray-400">
        <span>01</span><span>05</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [reviewsDueToday, setReviewsDueToday] = useState<number>(0);
  const [readinessPct, setReadinessPct] = useState(74);
  const [studiedToday, setStudiedToday] = useState(2.5);
  const [streakDays, setStreakDays] = useState(7);
  const [topicsDone, setTopicsDone] = useState(12);
  const [totalTopics, setTotalTopics] = useState(40);

  useEffect(() => {
    if (isLoaded && user) {
      if (!user.unsafeMetadata?.onboarded) {
        router.replace("/onboarding");
      } else {
        (async () => {
          const planRes = await fetch(`/api/plan/latest?userId=${user.id}`).then(r => r.json());
          const plan = planRes.ok ? planRes.plan : null;
          const sid = plan?.syllabusId || syllabusId;
          const [examRes, focusRes] = await Promise.all([
            sid ? fetch(`/api/exam-predict/${sid}/quick-stats?userId=${user.id}`).then(r => r.json()).catch(() => null) : null,
            fetch(`/api/focus/analytics?userId=${user.id}`).then(r => r.json()),
          ]);
          return { planRes, examRes, focusRes };
        })().then(({ planRes, examRes, focusRes }) => {
            if (planRes.ok && planRes.plan) {
              setPlanId(planRes.plan._id);
              setSyllabusId(planRes.plan.syllabusId);
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              const reviews = planRes.plan.sessions?.filter(
                (s: any) => s.status === "planned" && s.topic.startsWith("[Review]") && new Date(s.date) <= today
              );
              setReviewsDueToday(reviews?.length || 0);
              setTopicsDone(planRes.plan.sessions?.filter((s: any) => s.status === "done").length || 0);
              setTotalTopics(planRes.plan.sessions?.length || 40);
            }
            if (examRes?.ok && examRes?.stats) {
              setReadinessPct(examRes.stats.readinessPercentage || 0);
            }
            if (focusRes?.ok) {
              setStreakDays(focusRes.streakDays || 7);
              setStudiedToday(focusRes.todayMinutes ? Math.round(focusRes.todayMinutes / 6) / 10 : 2.5);
            }
          })
          .catch(console.error);
      }
    }
  }, [isLoaded, user, router, syllabusId]);

  const displayName =
    (user?.unsafeMetadata?.displayName as string) ||
    user?.firstName ||
    "Scholar";
  const grade = user?.unsafeMetadata?.grade as string | undefined;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!isLoaded || (user && !user.unsafeMetadata?.onboarded)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#e8f5f0" }}>
        <div className="relative mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-teal-500/30">S</div>
        </div>
        <p className="text-teal-700 text-sm animate-pulse tracking-wide">Loading workspace...</p>
      </div>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const handleSyllabusSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append("userId", user?.id || "anonymous");
      formData.append("grade", grade || "Unknown");

      if (data.type === "file") {
        formData.append("syllabus", data.file);
      } else {
        formData.append("manualSyllabus", JSON.stringify(data.chapters));
      }

      if (data.referenceBook) {
        formData.append("referenceBook", data.referenceBook);
      }

      const response = await fetch(`/api/syllabus/upload`, {
        method: "POST",
        body: formData,
      });
      const text = await response.text();
      let responseData: any = {};
      try { responseData = JSON.parse(text); } catch { throw new Error("Server error during upload. Is the backend running?"); }

      if (responseData.ok && responseData.syllabus) {
        const sid = responseData.syllabus._id;
        setSyllabusId(sid);

        try {
          const graphResponse = await fetch(`/api/graph/from-syllabus/${sid}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id }),
          });
          if (graphResponse.ok) console.log("Topic graph generated for", sid);
        } catch (graphErr) {
          console.warn("Topic graph network error:", graphErr);
        }

        router.push(`/dashboard/plan?syllabusId=${sid}`);
        return true;
      }

      throw new Error(responseData.error || "Failed to process syllabus");
    } catch (error: any) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            {/* Header Row */}
            <div className="flex items-start justify-between">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <h1 className="text-2xl font-bold text-gray-800">
                  {greeting}, <span className="text-teal-600">{displayName}</span>
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                  {user?.imageUrl
                    ? <img src={user.imageUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
                    : displayName.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">{displayName}</p>
                  <p className="text-[10px] text-gray-400">Student</p>
                </div>
              </motion.div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: "📅", value: "03/05", label: "Total classes", color: "bg-amber-50" },
                { icon: "👥", value: "03/05", label: "Total students", color: "bg-teal-50" },
                { icon: "👥", value: "03/05", label: "Total students", color: "bg-teal-50" },
                { icon: "👥", value: "03/05", label: "Total students", color: "bg-orange-50" },
              ].map((card, i) => (
                <ClickSpark key={i} sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="stat-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl ${card.color} flex items-center justify-center text-lg`}>
                        {card.icon}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-800">{card.value}</p>
                        <p className="text-xs text-gray-400">{card.label}</p>
                      </div>
                    </div>
                  </motion.div>
                </ClickSpark>
              ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column - Students Performance */}
              <div className="lg:col-span-1">
                <ClickSpark sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="dashboard-card p-5 h-full"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="section-title">Students performance</h3>
                      <div className="flex gap-2 text-[10px]">
                        <span className="text-gray-400 cursor-pointer hover:text-teal-500">Details</span>
                        <span className="text-gray-400 cursor-pointer hover:text-teal-500">In progress</span>
                        <span className="text-gray-400 cursor-pointer hover:text-teal-500">Average</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {STUDENTS.map((s, i) => (
                        <motion.div
                          key={s.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.08 }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                            {s.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{s.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold" style={{ color: s.score >= 80 ? "#14b8a6" : s.score >= 60 ? "#f59e0b" : "#ef4444" }}>
                              {s.score}%
                            </p>
                          </div>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${s.score}%` }}
                              transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                              style={{ background: s.score >= 80 ? "#14b8a6" : s.score >= 60 ? "#f59e0b" : "#ef4444" }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </ClickSpark>
              </div>

              {/* Center Column - Attendance Chart */}
              <div className="lg:col-span-2">
                <ClickSpark sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="h-full"
                  >
                    <AttendanceChart />
                  </motion.div>
                </ClickSpark>
              </div>
            </div>

            {/* Right Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Teaching Lessons */}
              <div className="lg:col-span-1">
                <ClickSpark sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="dashboard-card p-5 h-full"
                  >
                    <h3 className="section-title mb-4">Teaching lessons</h3>
                    <div className="space-y-3">
                      {LESSONS.map((l, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.08 }}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-base">
                            {l.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700">{l.title}</p>
                            <p className="text-[10px] text-gray-400">{l.time}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{l.subject}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </ClickSpark>
              </div>

              {/* Right Column - Calendar + Events + Notes */}
              <div className="lg:col-span-2 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Calendar */}
                  <ClickSpark sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                      <MiniCalendar />
                    </motion.div>
                  </ClickSpark>

                  {/* Upcoming Events */}
                  <ClickSpark sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="dashboard-card p-5"
                    >
                      <h3 className="section-title mb-4">Upcoming Event</h3>
                      <div className="space-y-3">
                        {EVENTS.map((e, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.55 + i * 0.08 }}
                            className="flex items-center gap-3"
                          >
                            <div className="text-[10px] text-gray-400 w-12 shrink-0">{e.time}</div>
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: e.color }} />
                            <span className="text-sm text-gray-600">{e.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </ClickSpark>
                </div>

                {/* My Notes */}
                <ClickSpark sparkColor="#14b8a6" sparkSize={8} sparkRadius={12} sparkCount={6} duration={350}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, duration: 0.4 }}
                    className="dashboard-card p-5"
                  >
                    <h3 className="section-title mb-3">My Notes</h3>
                    <div className="space-y-2">
                      {NOTES.map((n, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                          <span>{n}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </ClickSpark>
              </div>
            </div>
          </div>
        );

      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Upload Your Syllabus</h1>
              <p className="mt-1 text-gray-500 text-sm">AI will analyze it and create your personalized study plan</p>
            </div>
            <SyllabusUploader onSyllabusSubmit={handleSyllabusSubmit} />
          </div>
        );

      case "graph":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Learning Path Map</h1>
              <p className="mt-1 text-gray-500 text-sm">Visualize topic dependencies and optimal learning order</p>
            </div>
            <KnowledgeGraph syllabusId={syllabusId || undefined} userId={user?.id} />
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Your Study Schedule</h1>
              <p className="mt-1 text-gray-500 text-sm">Track your day-by-day study plan and progress</p>
            </div>
            <CalendarTimeline planId={planId || undefined} userId={user?.id} />
          </div>
        );

      case "focus":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Focus Timer</h1>
              <p className="mt-1 text-gray-500 text-sm">Pomodoro technique with distraction tracking</p>
            </div>
            <FocusTimer userId={user?.id} planId={planId || undefined} />
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Session Analytics</h1>
              <p className="mt-1 text-gray-500 text-sm">Insights into your study habits and performance</p>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <ReadinessChart userId={user?.id} syllabusId={syllabusId || undefined} />
              <StudyInsightCard userId={user?.id} syllabusId={syllabusId || undefined} />
            </div>
            <SessionAnalytics userId={user?.id} />
          </div>
        );

      case "cognitive":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Cognitive Load Analyzer</h1>
              <p className="mt-1 text-gray-500 text-sm">AI analyzes topic difficulty and recommends optimizations</p>
            </div>
            <CognitiveLoadTracker userId={user?.id} syllabusId={syllabusId || undefined} />
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">My Learning Profile</h1>
              <p className="mt-1 text-gray-500 text-sm">AI Digital Twin analyzing your unique learning patterns</p>
            </div>
            <DigitalTwinProfile userId={user?.id} syllabusId={syllabusId || undefined} />
          </div>
        );

      case "voice":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Voice Session Logger</h1>
              <p className="mt-1 text-gray-500 text-sm">Speak to log your study sessions automatically</p>
            </div>
            {syllabusId ? (
              <div className="dashboard-card p-6 max-w-md mx-auto">
                <VoiceInput 
                  userId={user?.id || ''} 
                  syllabusId={syllabusId}
                  onSessionLogged={() => {
                    console.log('Session logged via voice');
                  }}
                />
              </div>
            ) : (
              <div className="dashboard-card p-6">
                <p className="text-gray-500 text-center">Please upload a syllabus first to use voice logging.</p>
              </div>
            )}
          </div>
        );

      case "strategy":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">AI Strategy Generator</h1>
              <p className="mt-1 text-gray-500 text-sm">Get personalized study strategies from AI</p>
            </div>
            {syllabusId ? (
              <StrategyChat 
                userId={user?.id || ''} 
                syllabusId={syllabusId}
                onStrategyGenerated={(strategy) => {
                  console.log('Strategy generated:', strategy);
                }}
              />
            ) : (
              <div className="dashboard-card p-6">
                <p className="text-gray-500 text-center">Please upload a syllabus first to generate strategies.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarLayout>
      <ClickSpark sparkColor="#14b8a6" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
        {/* Content with page transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </ClickSpark>
    </SidebarLayout>
  );
}
