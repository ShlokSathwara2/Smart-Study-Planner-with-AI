"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";

const FEATURES = [
  { icon: "🧠", title: "AI Study Planner", desc: "Claude-powered micro scheduling that adapts to your cognitive load in real time", color: "rgba(99,102,241,0.7)", bg: "rgba(99,102,241,0.10)" },
  { icon: "📊", title: "Spaced Repetition", desc: "SM-2 algorithm surfaces the right topic at the right moment — before you forget it", color: "rgba(52,211,153,0.7)", bg: "rgba(52,211,153,0.10)" },
  { icon: "⏱️", title: "Focus Timer", desc: "Pomodoro with distraction tracking and live cognitive-load scoring", color: "rgba(34,211,238,0.7)", bg: "rgba(34,211,238,0.10)" },
  { icon: "🗺️", title: "Knowledge Graph", desc: "Visualize every topic dependency so you always know what to study next", color: "rgba(139,92,246,0.7)", bg: "rgba(139,92,246,0.10)" },
  { icon: "🎤", title: "Voice Logging", desc: "Narrate your session — AI transcribes, categorises, and updates your plan automatically", color: "rgba(251,146,60,0.7)", bg: "rgba(251,146,60,0.10)" },
  { icon: "📈", title: "Session Analytics", desc: "Rich charts on your study velocity, retention rate, and exam readiness score", color: "rgba(236,72,153,0.7)", bg: "rgba(236,72,153,0.10)" },
];

const STATS = [
  { value: "94%", label: "Exam Pass Rate" },
  { value: "3.2×", label: "Retention Boost" },
  { value: "40%", label: "Less Study Time" },
  { value: "10k+", label: "Plans Generated" },
];

export function FuturisticUI() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.3]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    const iv = setInterval(() => setTick((t) => t + 1), 3000);
    return () => { window.removeEventListener("mousemove", h); clearInterval(iv); };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen text-slate-100 overflow-x-hidden" style={{ background: "#060818" }}>
      {/* Ambient mouse-follow light */}
      <div className="pointer-events-none fixed inset-0 z-0 transition-all duration-700"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99,102,241,0.07) 0%, transparent 70%)`,
        }} />

      {/* Fixed BG orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[5%] h-[700px] w-[700px] rounded-full blur-[130px] animate-aurora"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[0%] h-[500px] w-[500px] rounded-full blur-[110px] animate-float-reverse"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
        <div className="absolute top-[45%] right-[15%] h-[300px] w-[300px] rounded-full blur-[90px] animate-float"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)" }} />
        {/* Grid */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.045) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
      </div>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 lg:px-12"
        style={{
          background: "rgba(6,8,24,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/40">S</div>
          <span className="text-base font-semibold">Smart<span className="text-indigo-400">Study</span></span>
          <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-indigo-400/60 border border-indigo-500/20 rounded px-1.5 py-0.5">AI</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-slate-400 hover:text-slate-200 transition px-3 py-1.5 rounded-lg hover:bg-white/5">
            Sign in
          </Link>
          <Link href="/sign-up">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="text-sm font-semibold text-white px-5 py-2 rounded-xl glass-shine"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 2px 16px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              Get started →
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-6 lg:px-12 min-h-screen flex items-center">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto w-full text-center">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-indigo-300"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by Claude AI · Adaptive Learning
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-6">
            <span className="text-slate-50">Study Smarter.</span>{" "}
            <br />
            <span className="gradient-text">Not Harder.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.55 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI builds a micro-level, day-by-day study plan from your syllabus —
            then adapts it every session based on your cognitive load, focus data, and forgetting curve.
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                className="group relative overflow-hidden rounded-2xl px-8 py-4 text-base font-bold text-white glass-shine"
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)",
                  backgroundSize: "200% 100%",
                  boxShadow: "0 6px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}>
                <span className="relative z-10 flex items-center gap-2">✨ Start for free <span className="group-hover:translate-x-1 transition-transform inline-block">→</span></span>
              </motion.button>
            </Link>
            <Link href="#features">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="rounded-2xl px-7 py-4 text-base font-medium text-slate-300 hover:text-slate-100 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
                See how it works
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((st, i) => (
              <div key={st.label}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}>
                <motion.p className="text-2xl font-black gradient-text"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.08 }}>
                  {st.value}
                </motion.p>
                <p className="text-xs text-slate-500 mt-1">{st.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600 text-xs">
          <div className="h-8 w-px bg-gradient-to-b from-transparent to-indigo-500/50 rounded" />
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-24 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400/70 mb-3">Everything you need</motion.p>
            <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-3xl sm:text-4xl font-black text-slate-50">
              Built for how your brain actually learns
            </motion.h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.07, duration: 0.45 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group rounded-2xl p-6 glass-shine cursor-default"
                style={{
                  background: `linear-gradient(135deg, ${f.bg} 0%, rgba(255,255,255,0.025) 100%)`,
                  backdropFilter: "blur(28px)",
                  border: `1px solid ${f.color.replace("0.7", "0.2")}`,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)",
                  transition: "all 0.25s ease",
                }}>
                <div className="h-11 w-11 rounded-xl mb-4 flex items-center justify-center text-xl"
                  style={{ background: f.bg, border: `1px solid ${f.color.replace("0.7","0.3")}`, boxShadow: `0 2px 12px ${f.color.replace("0.7","0.2")}` }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section className="relative z-10 py-24 px-6 lg:px-12">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto rounded-3xl p-10 text-center overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)",
            backdropFilter: "blur(40px)",
            border: "1px solid rgba(99,102,241,0.3)",
            boxShadow: "0 20px 60px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), transparent)" }} />
          <h2 className="text-3xl font-black text-slate-50 mb-3">Ready to ace your exams?</h2>
          <p className="text-slate-400 mb-8">Upload your syllabus. Let AI do the planning.</p>
          <Link href="/sign-up">
            <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
              className="rounded-2xl px-10 py-4 text-base font-bold text-white glass-shine"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 6px 32px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}>
              Start for free ✨
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-8 px-6 text-center">
        <p className="text-sm text-slate-600">
          SmartStudy AI · Built with Next.js, Claude API & ❤️
        </p>
      </footer>
    </div>
  );
}
