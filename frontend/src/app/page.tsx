"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { GradientButton } from "@/components/GradientButton";

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */
const phases = [
  {
    icon: "🧠",
    title: "AI Syllabus Analyzer",
    desc: "Upload PDF, image, or DOCX — Claude + OCR extracts topics, units, difficulty & estimated hours instantly.",
    color: "indigo",
  },
  {
    icon: "🗺️",
    title: "Learning Graph",
    desc: "Visual topic-dependency map shows exactly which concepts unlock others so you always study in order.",
    color: "violet",
  },
  {
    icon: "📅",
    title: "Dynamic Study Plan",
    desc: "Exam date + daily hours → Claude generates a personalised, day-by-day schedule with Google Calendar sync.",
    color: "sky",
  },
  {
    icon: "⏱️",
    title: "Focus Timer & Distraction Tracker",
    desc: "Pomodoro sessions with tab-switch detection; get a Focus Score after every work block.",
    color: "emerald",
  },
  {
    icon: "🔬",
    title: "AI Cognitive Load Analyzer",
    desc: "Tracks time-on-topic, quiz accuracy, and pause frequency then auto-splits overloaded topics.",
    color: "amber",
  },
  {
    icon: "📈",
    title: "Weak Topic Detector",
    desc: "Session-level quizzes feed a confidence score engine; weak topics auto-get more time in your plan.",
    color: "rose",
  },
  {
    icon: "🔍",
    title: "AI Knowledge Gap Detector",
    desc: "Detects missing foundations and inserts prerequisite topics into your schedule automatically.",
    color: "fuchsia",
  },
  {
    icon: "🔁",
    title: "Spaced Repetition Engine",
    desc: "SM-2 algorithm calculates next-review dates; review sessions auto-inject into your calendar.",
    color: "cyan",
  },
  {
    icon: "🤖",
    title: "AI Digital Twin",
    desc: "A personal learning model built from your behaviour — speed, focus, accuracy — used as context in every AI call.",
    color: "indigo",
  },
  {
    icon: "🎯",
    title: "Exam Outcome Predictor",
    desc: "Combines completion %, quiz scores, and revision cycles into a predicted score range + readiness %.",
    color: "violet",
  },
  {
    icon: "💬",
    title: "AI Study Buddy Chatbot",
    desc: "GPT-style chat with your own syllabus as context. Ask for MCQs, summaries, or explanations per topic.",
    color: "sky",
  },
  {
    icon: "🎤",
    title: "Voice Assistant",
    desc: "Whisper transcribes your voice; Claude parses intent and logs sessions hands-free.",
    color: "emerald",
  },
  {
    icon: "📝",
    title: "AI Exam Simulator",
    desc: "Claude generates timed mock exams from your syllabus; results feed the weak-topic engine.",
    color: "amber",
  },
  {
    icon: "🏆",
    title: "Gamification & Leaderboard",
    desc: "XP, Scholar levels, achievement badges, 7-day streaks, and anonymised peer ranking.",
    color: "rose",
  },
  {
    icon: "😴",
    title: "Burnout & Emotion Detection",
    desc: "face-api.js samples expressions locally every 60 s; detects fatigue and triggers smart break reminders.",
    color: "fuchsia",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "Study heatmap, mastery charts, distraction map, Focus Score trends, and Exam Readiness gauge.",
    color: "cyan",
  },
  {
    icon: "🌐",
    title: "Offline-First + Cross-Device Sync",
    desc: "IndexedDB keeps the app fully functional offline; syncs to MongoDB when reconnected on any device.",
    color: "indigo",
  },
  {
    icon: "📤",
    title: "PDF Report & Calendar Export",
    desc: "One-click PDF progress report and .ics export of your full study plan to any calendar app.",
    color: "violet",
  },
];

const stats = [
  { value: "105", label: "AI Features" },
  { value: "28", label: "Dev Phases" },
  { value: "10×", label: "Faster Prep" },
  { value: "∞", label: "Personalisation" },
];

const colorMap: Record<string, string> = {
  indigo: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/25 text-indigo-300",
  violet: "from-violet-500/20 to-violet-600/10 border-violet-500/25 text-violet-300",
  sky: "from-sky-500/20 to-sky-600/10 border-sky-500/25 text-sky-300",
  emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/25 text-emerald-300",
  amber: "from-amber-500/20 to-amber-600/10 border-amber-500/25 text-amber-300",
  rose: "from-rose-500/20 to-rose-600/10 border-rose-500/25 text-rose-300",
  fuchsia: "from-fuchsia-500/20 to-fuchsia-600/10 border-fuchsia-500/25 text-fuchsia-300",
  cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/25 text-cyan-300",
};

/* ─────────────────────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────────────────────── */
function AnimatedCounter({ target }: { target: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const isNum = /^\d+$/.test(target);
    if (!isNum) { setDisplay(target); return; }
    const end = parseInt(target);
    let start = 0;
    const duration = 1200;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start.toString());
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{display}</span>;
}

/* ─────────────────────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────────────────────── */
function FeatureCard({ f, i }: { f: typeof phases[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const colors = colorMap[f.color] ?? colorMap.indigo;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      className={`group relative rounded-2xl border bg-gradient-to-br p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer ${colors}`}
    >
      <span className="text-3xl">{f.icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-slate-100">{f.title}</h3>
      <p className="mt-2 text-xs text-slate-400 leading-relaxed">{f.desc}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FLOATING ORB
───────────────────────────────────────────────────────────── */
function Orb({
  className,
  animate,
}: {
  className: string;
  animate?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-[100px] ${className} ${animate ?? "animate-float"}`}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function Home() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -60]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.4]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080f1e] text-slate-50 font-sans">

      {/* ── Background Orbs ── */}
      <Orb className="top-[-200px] left-[10%] h-[700px] w-[700px] bg-indigo-600/15" animate="animate-float" />
      <Orb className="top-[30%] right-[-150px] h-[500px] w-[500px] bg-violet-600/10" animate="animate-float-reverse" />
      <Orb className="bottom-[10%] left-[-100px] h-[400px] w-[400px] bg-emerald-600/10" animate="animate-float" />
      <Orb className="top-[60%] right-[20%] h-[300px] w-[300px] bg-sky-600/8" animate="animate-float-reverse" />

      {/* ── Rotating grid ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.07) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ════════════════════════════════
          NAV
      ════════════════════════════════ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-14"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 opacity-80" />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Smart<span className="text-indigo-400">Study</span>
          </span>
        </div>

        <nav className="hidden sm:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-200 transition-colors">Features</a>
          <a href="#ai-core" className="hover:text-slate-200 transition-colors">AI Core</a>
          <a href="#preview" className="hover:text-slate-200 transition-colors">Preview</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
          >
            Sign in
          </Link>
          <GradientButton label="Get Started →" href="/sign-up" className="px-5 py-2 text-sm" />
        </div>
      </motion.header>

      {/* ════════════════════════════════
          HERO
      ════════════════════════════════ */}
      <motion.main
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 flex flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 text-xs font-medium text-indigo-300 tracking-widest uppercase"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
          </span>
          Powered by Claude AI · 105 Features · 28 Phases
        </motion.div>

        {/* Headline */}
        <div className="max-w-4xl">
          {["Study Smarter.", "Learn Deeper.", "Ace Everything."].map((line, i) => (
            <motion.h1
              key={line}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={`block text-5xl font-bold leading-tight tracking-tight sm:text-7xl sm:leading-[1.05] ${
                i === 1
                  ? "bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent animate-gradient"
                  : "text-slate-50"
              }`}
            >
              {line}
            </motion.h1>
          ))}
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-8 max-w-2xl text-base text-slate-400 sm:text-lg leading-relaxed"
        >
          Upload your syllabus, set your exam date, and let AI build a personalised study plan with
          a digital twin of your learning style, cognitive load balancing, spaced repetition, and
          real-time adaptive scheduling.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <GradientButton
            label="Start planning for free →"
            href="/sign-up"
            className="px-9 py-3.5 text-base"
          />
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-6 py-3.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
          >
            Already have an account
          </Link>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500"
        >
          {["Free to start", "No credit card", "Claude-powered AI", "Built for students"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> {t}
            </span>
          ))}
        </motion.div>
      </motion.main>

      {/* ════════════════════════════════
          STATS BAR
      ════════════════════════════════ */}
      <section className="relative z-10 px-6 pb-20 sm:px-14">
        <div className="mx-auto max-w-4xl">
          <div className="glass-strong rounded-2xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/8">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center py-8 px-4">
                <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-indigo-300 to-violet-300 bg-clip-text text-transparent">
                  <AnimatedCounter target={s.value} />
                  {/^\d+$/.test(s.value) && <span className="text-indigo-400">+</span>}
                </span>
                <span className="mt-2 text-xs text-slate-400 tracking-wide">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          APP PREVIEW MOCK
      ════════════════════════════════ */}
      <section id="preview" className="relative z-10 px-6 pb-24 sm:px-14">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl"
        >
          <div className="text-center mb-10">
            <span className="text-xs font-medium tracking-widest uppercase text-indigo-400">Live Preview</span>
            <h2 className="mt-2 text-3xl font-bold text-slate-100">Your AI-generated plan, right now</h2>
          </div>

          <div className="glass-strong rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="animate-pulse-ring absolute inset-0 h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Today&apos;s personalised schedule</span>
              </div>
              <span className="text-xs text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-0.5 bg-indigo-500/10">
                Exam in 14 days
              </span>
            </div>

            {/* Session rows */}
            <div className="grid gap-3">
              {[
                { topic: "🧠 Neural Networks — Backpropagation", time: "09:00 → 10:30", tag: "High priority", tagColor: "rose" },
                { topic: "📐 Linear Algebra — Eigenvalue Decomposition", time: "11:00 → 12:00", tag: "⚠ Weak topic", tagColor: "amber" },
                { topic: "📊 Probability — Bayesian Inference", time: "14:00 → 15:30", tag: "Spaced review", tagColor: "sky" },
                { topic: "⚡ Algorithms — Dynamic Programming", time: "16:00 → 17:00", tag: "New topic", tagColor: "emerald" },
              ].map((s, i) => (
                <motion.div
                  key={s.topic}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/50 px-4 py-3.5 hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{s.topic}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.time}</p>
                  </div>
                  <span className={`shrink-0 ml-4 rounded-full px-3 py-0.5 text-[11px] font-medium border ${
                    s.tagColor === "rose" ? "bg-rose-500/10 border-rose-500/25 text-rose-300" :
                    s.tagColor === "amber" ? "bg-amber-500/10 border-amber-500/25 text-amber-300" :
                    s.tagColor === "sky" ? "bg-sky-500/10 border-sky-500/25 text-sky-300" :
                    "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  }`}>
                    {s.tag}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
              <p className="text-xs text-slate-500">
                Plan auto-adjusted · Digital Twin active · Exam Readiness: <span className="text-emerald-400 font-semibold">74%</span>
              </p>
              <div className="flex gap-1.5">
                {[74, 74].map((_, j) => (
                  <div key={j} className={`h-1.5 w-8 rounded-full ${j === 0 ? "bg-emerald-500" : "bg-slate-700"}`} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════
          FEATURES GRID
      ════════════════════════════════ */}
      <section id="features" className="relative z-10 px-6 pb-24 sm:px-14">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-xs font-medium tracking-widest uppercase text-indigo-400">28 Phases · 105 Steps</span>
            <h2 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">
              Everything your studies need
            </h2>
            <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
              From syllabus upload to exam day — every step powered by state-of-the-art AI.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {phases.map((f, i) => (
              <FeatureCard key={f.title} f={f} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          AI CORE SPOTLIGHT
      ════════════════════════════════ */}
      <section id="ai-core" className="relative z-10 px-6 pb-24 sm:px-14">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-xs font-medium tracking-widest uppercase text-violet-400">The AI Core</span>
            <h2 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">
              Three breakthroughs, one planner
            </h2>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: "🤖",
                title: "AI Digital Twin",
                desc: "After one week, your personal learning model captures speed, focus, retention, and best study hours — making every AI call uniquely yours.",
                gradient: "from-indigo-900/60 to-violet-900/40",
                border: "border-indigo-500/20",
                pill: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
              },
              {
                icon: "🔮",
                title: "Exam Outcome Predictor",
                desc: "Collects completion %, quiz scores, and revision cycles to deliver a predicted score range with readiness trend charts week over week.",
                gradient: "from-violet-900/60 to-fuchsia-900/40",
                border: "border-violet-500/20",
                pill: "bg-violet-500/10 text-violet-300 border-violet-500/25",
              },
              {
                icon: "⚖️",
                title: "Cognitive Load Balancer",
                desc: "Analyzes time-on-topic, pause frequency, and quiz accuracy. When overload is detected, AI auto-splits topics into digestible sub-modules.",
                gradient: "from-sky-900/60 to-indigo-900/40",
                border: "border-sky-500/20",
                pill: "bg-sky-500/10 text-sky-300 border-sky-500/25",
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.55 }}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b p-7 ${c.gradient} ${c.border} transition-transform duration-300 cursor-pointer hover:shadow-lg hover:shadow-black/40`}
              >
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium mb-5 ${c.pill}`}>
                  {c.icon} {c.title}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.desc}</p>
                <div className="mt-6 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${[82, 74, 91][i]}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 + 0.4, duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full bg-gradient-to-r ${
                      i === 0 ? "from-indigo-500 to-violet-500" :
                      i === 1 ? "from-violet-500 to-fuchsia-500" :
                      "from-sky-500 to-indigo-500"
                    }`}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">{["82% accuracy rate", "74% avg readiness", "91% load detection"][i]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════
          CTA SECTION
      ════════════════════════════════ */}
      <section className="relative z-10 px-6 pb-28 sm:px-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="mx-auto max-w-3xl rounded-3xl relative overflow-hidden"
        >
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-3xl p-px bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-500 opacity-40" />
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-950/90 via-[#0f172a] to-violet-950/70 backdrop-blur-2xl p-10 sm:p-14 text-center">
            <span className="text-4xl">🎓</span>
            <h2 className="mt-5 text-3xl font-bold text-slate-50 sm:text-4xl">
              Ready to transform how you study?
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
              Join thousands of students who use AI to study smarter, beat burnout, and walk into exams with confidence.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <GradientButton label="Create free account →" href="/sign-up" className="px-10 py-4 text-base" />
              <Link
                href="/sign-in"
                className="inline-flex items-center rounded-full border border-white/10 px-7 py-4 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-600">No credit card required · Free to start</p>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════
          FOOTER
      ════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6 sm:px-14">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-6">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 opacity-80" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-semibold">
              Smart<span className="text-indigo-400">Study</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 text-center">
            © {new Date().getFullYear()} SmartStudy · Powered by{" "}
            <span className="text-indigo-400">Claude AI</span>
          </p>

          <p className="text-xs text-slate-500">
            Made with{" "}
            <span className="text-rose-400">❤️</span>{" "}
            by{" "}
            <span className="font-semibold text-indigo-400">Shlok Sathwara</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
