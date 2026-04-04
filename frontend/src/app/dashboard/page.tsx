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

const STAT_CARDS = [
  { icon: "🔥", label: "Day Streak",     value: "7",   unit: "days",  color: "from-orange-500/20 to-amber-600/10   border-orange-500/25", text: "text-orange-300" },
  { icon: "📈", label: "Exam Readiness", value: "74",  unit: "%",     color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/25", text: "text-emerald-300" },
  { icon: "⏰", label: "Studied Today",  value: "2.5", unit: "hrs",   color: "from-sky-500/20  to-sky-600/10        border-sky-500/25",     text: "text-sky-300" },
  { icon: "🎯", label: "Topics Done",    value: "12",  unit: "/ 40",  color: "from-violet-500/20 to-violet-600/10  border-violet-500/25",   text: "text-violet-300" },
];

function StatCard({ s, i }: { s: typeof STAT_CARDS[0]; i: number }) {
  const glowMap: Record<string, string> = {
    "text-orange-300":  "rgba(251,146,60,0.18)",
    "text-emerald-300": "rgba(52,211,153,0.18)",
    "text-sky-300":     "rgba(125,211,252,0.18)",
    "text-violet-300":  "rgba(167,139,250,0.18)",
  };
  const borderMap: Record<string, string> = {
    "text-orange-300":  "rgba(251,146,60,0.25)",
    "text-emerald-300": "rgba(52,211,153,0.25)",
    "text-sky-300":     "rgba(125,211,252,0.25)",
    "text-violet-300":  "rgba(167,139,250,0.25)",
  };
  const barMap: Record<string, string> = {
    "text-orange-300":  "linear-gradient(90deg,#f97316,#fb923c)",
    "text-emerald-300": "linear-gradient(90deg,#10b981,#34d399)",
    "text-sky-300":     "linear-gradient(90deg,#0ea5e9,#38bdf8)",
    "text-violet-300":  "linear-gradient(90deg,#7c3aed,#a78bfa)",
  };
  const barW = s.unit === "%" ? `${s.value}%` : s.unit === "days" ? "70%" : s.unit === "hrs" ? "55%" : "30%";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08, duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.97 }}
      className="relative rounded-2xl overflow-hidden cursor-default glass-shine"
      style={{
        background: `linear-gradient(135deg, ${glowMap[s.text] || "rgba(99,102,241,0.12)"} 0%, rgba(255,255,255,0.03) 100%)`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${borderMap[s.text] || "rgba(255,255,255,0.1)"}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl">{s.icon}</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow shadow-emerald-400/60" />
            <span className="text-[9px] text-emerald-400/70 font-medium uppercase tracking-widest">Live</span>
          </div>
        </div>
        <p className={`text-3xl font-bold tabular-nums ${s.text} animate-number-up`}>
          {s.value}<span className="text-sm font-medium ml-1 opacity-60">{s.unit}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500 font-medium">{s.label}</p>
        <div className="mt-3 h-0.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: barW }}
            style={{ background: barMap[s.text] || "linear-gradient(90deg,#6366f1,#a78bfa)" }}
            transition={{ delay: i * 0.08 + 0.5, duration: 1.1, ease: "easeOut" }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [reviewsDueToday, setReviewsDueToday] = useState<number>(0);

  useEffect(() => {
    if (isLoaded && user) {
      if (!user.unsafeMetadata?.onboarded) {
        router.replace("/onboarding");
      } else {
        // Phase 12: Fetch plan to retrieve pending SM-2 reviews
        fetch(`/api/plan/latest?userId=${user.id}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.ok && data.plan) {
              setPlanId(data.plan._id);
              setSyllabusId(data.plan.syllabusId);
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              const reviews = data.plan.sessions?.filter(
                (s: any) =>
                  s.status === "planned" &&
                  s.topic.startsWith("[Review]") &&
                  new Date(s.date) <= today
              );
              setReviewsDueToday(reviews?.length || 0);
            }
          })
          .catch(console.error);
      }
    }
  }, [isLoaded, user, router]);

  const displayName =
    (user?.unsafeMetadata?.displayName as string) ||
    user?.firstName ||
    "Scholar";
  const grade = user?.unsafeMetadata?.grade as string | undefined;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Prevent flash while checking onboarding state
  if (!isLoaded || (user && !user.unsafeMetadata?.onboarded)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#060818" }}>
        <div className="relative mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/40">S</div>
          <div className="absolute -inset-2 rounded-2xl border border-indigo-500/30 animate-ping opacity-30" />
        </div>
        <p className="text-slate-500 text-sm animate-pulse tracking-wide">Loading workspace...</p>
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

      // Use Next.js proxy (/api/...) so auth cookies & CORS are handled correctly
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

        // Build topic graph — use proxy, pass real userId
        try {
          const graphResponse = await fetch(`/api/graph/from-syllabus/${sid}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id }),
          });
          if (graphResponse.ok) console.log("✅ Topic graph generated for", sid);
          else console.warn("⚠️ Topic graph generation failed (will retry on plan page)");
        } catch (graphErr) {
          console.warn("⚠️ Topic graph network error:", graphErr);
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
          <div className="space-y-8">
            {/* Personal greeting */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">
                {greeting},{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent animate-gradient">
                  {displayName}
                </span>{" "}
                👋
              </h1>
              <p className="mt-2 text-slate-400 text-sm">
                {grade ? `${grade} student · ` : ""}Here&apos;s your study overview for today.
              </p>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STAT_CARDS.map((s, i) => (
                <StatCard key={s.label} s={s} i={i} />
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { icon: "📤", label: "Upload Syllabus",     desc: "Analyze your syllabus with AI",       tab: "upload" as Tab,    gradient: "from-indigo-500/15 to-violet-500/10  border-indigo-500/25" },
                  { icon: "⏱️", label: "Start Focus Session",  desc: "Begin a Pomodoro work block",         tab: "focus" as Tab,     gradient: "from-emerald-500/15 to-teal-500/10    border-emerald-500/25" },
                  { icon: "📊", label: "View Analytics",      desc: "See your study performance",          tab: "analytics" as Tab, gradient: "from-sky-500/15 to-blue-500/10          border-sky-500/25" },
                  { icon: "🗺️", label: "Learning Map",        desc: "Explore topic dependencies",         tab: "graph" as Tab,     gradient: "from-violet-500/15 to-fuchsia-500/10  border-violet-500/25" },
                  { icon: "🧠", label: "Cognitive Analysis",  desc: "Check your mental load",              tab: "cognitive" as Tab, gradient: "from-amber-500/15 to-orange-500/10     border-amber-500/25" },
                  { icon: "📅", label: "Study Schedule",      desc: "Your day-by-day plan",                tab: "schedule" as Tab,  gradient: "from-rose-500/15 to-pink-500/10          border-rose-500/25" },
                  { icon: "🎤", label: "Voice Log",           desc: "Log session with voice",              tab: "voice" as Tab,     gradient: "from-purple-500/15 to-indigo-500/10   border-purple-500/25" },
                  { icon: "🧠", label: "AI Strategy",         desc: "Generate study plan",                tab: "strategy" as Tab,  gradient: "from-cyan-500/15 to-teal-500/10       border-cyan-500/25" },
                ].map((item, i) => (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(item.tab)}
                    className="text-left rounded-2xl p-5 glass-shine"
                    style={{
                      background: `linear-gradient(135deg, ${item.gradient.split(' ')[0].replace('from-','').includes('/') ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.10)'} 0%, rgba(255,255,255,0.025) 100%)`,
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <p className="mt-3 text-sm font-bold text-slate-100">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* AI Coach Card */}
            <GlassCard glow className="p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">
                  🤖
                </div>
                <div>
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">AI Daily Coach</p>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {displayName}, you have{" "}
                    <span className="text-indigo-300 font-semibold">{reviewsDueToday} topics due for spaced repetition</span>{" "}
                    today. Your focus score has improved by{" "}
                    <span className="text-emerald-300 font-semibold">18%</span> this week — great momentum! 🎉
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    💡 Tip: Your best focus window is 9 AM – 11 AM based on your session history.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        );

      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Upload Your Syllabus</h1>
              <p className="mt-1 text-slate-400 text-sm">AI will analyze it and create your personalized study plan</p>
            </div>
            <SyllabusUploader onSyllabusSubmit={handleSyllabusSubmit} />
          </div>
        );

      case "graph":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Learning Path Map</h1>
              <p className="mt-1 text-slate-400 text-sm">Visualize topic dependencies and optimal learning order</p>
            </div>
            <KnowledgeGraph syllabusId={syllabusId || undefined} userId={user?.id} />
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Your Study Schedule</h1>
              <p className="mt-1 text-slate-400 text-sm">Track your day-by-day study plan and progress</p>
            </div>
            <CalendarTimeline planId={planId || undefined} userId={user?.id} />
          </div>
        );

      case "focus":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Focus Timer</h1>
              <p className="mt-1 text-slate-400 text-sm">Pomodoro technique with distraction tracking</p>
            </div>
            <FocusTimer userId={user?.id} planId={planId || undefined} />
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Session Analytics</h1>
              <p className="mt-1 text-slate-400 text-sm">Insights into your study habits and performance</p>
            </div>
            <SessionAnalytics userId={user?.id} />
          </div>
        );

      case "cognitive":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">🧠 Cognitive Load Analyzer</h1>
              <p className="mt-1 text-slate-400 text-sm">AI analyzes topic difficulty and recommends optimizations</p>
            </div>
            <CognitiveLoadTracker userId={user?.id} syllabusId={syllabusId || undefined} />
          </div>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">👤 My Learning Profile</h1>
              <p className="mt-1 text-slate-400 text-sm">AI Digital Twin analyzing your unique learning patterns</p>
            </div>
            <DigitalTwinProfile userId={user?.id} syllabusId={syllabusId || undefined} />
          </div>
        );

      case "voice":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">🎤 Voice Session Logger</h1>
              <p className="mt-1 text-slate-400 text-sm">Speak to log your study sessions automatically</p>
            </div>
            {syllabusId ? (
              <GlassCard className="p-6 max-w-md mx-auto">
                <VoiceInput 
                  userId={user?.id || ''} 
                  syllabusId={syllabusId}
                  onSessionLogged={() => {
                    // Refresh plan data if needed
                    console.log('Session logged via voice');
                  }}
                />
              </GlassCard>
            ) : (
              <GlassCard className="p-6">
                <p className="text-slate-400 text-center">Please upload a syllabus first to use voice logging.</p>
              </GlassCard>
            )}
          </div>
        );

      case "strategy":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">🧠 AI Strategy Generator</h1>
              <p className="mt-1 text-slate-400 text-sm">Get personalized study strategies from AI</p>
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
              <GlassCard className="p-6">
                <p className="text-slate-400 text-center">Please upload a syllabus first to generate strategies.</p>
              </GlassCard>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarLayout>
      {/* Tab Bar */}
      <div className="mb-6 relative flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-indigo-500/20 text-indigo-200 shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

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
    </SidebarLayout>
  );
}
