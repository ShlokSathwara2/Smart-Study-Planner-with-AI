"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const GRADES = ["Class 9","Class 10","Class 11","Class 12","Undergraduate","Postgraduate","Professional"];
const GOALS = [
  { icon: "🏆", label: "Ace my exams" },
  { icon: "📚", label: "Build strong fundamentals" },
  { icon: "⚡", label: "Study in less time" },
  { icon: "🧠", label: "Remember everything I learn" },
  { icon: "🎯", label: "Target a specific score" },
  { icon: "💡", label: "Enjoy studying" },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.firstName || "");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const totalSteps = 4;

  const handleFinish = async () => {
    setSaving(true);
    await user?.update({
      unsafeMetadata: {
        onboarded: true,
        displayName: name.trim() || user?.firstName || "Scholar",
        age: parseInt(age) || null,
        grade,
        goal: goals.join(", "),
      },
    });
    await user?.reload();
    window.location.href = "/dashboard";
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return age.length > 0 && parseInt(age) > 0 && parseInt(age) < 100;
    if (step === 2) return grade !== "";
    if (step === 3) return goals.length > 0;
    return true;
  };

  const stepVariants = {
    initial: { opacity: 0, x: 30, filter: "blur(4px)" },
    animate: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: { opacity: 0, x: -30, filter: "blur(4px)" },
  };

  const stepColors = [
    { from: "#6366f1", to: "#8b5cf6", shadow: "rgba(99,102,241,0.4)" },
    { from: "#0ea5e9", to: "#6366f1", shadow: "rgba(14,165,233,0.4)" },
    { from: "#8b5cf6", to: "#ec4899", shadow: "rgba(139,92,246,0.4)" },
    { from: "#10b981", to: "#6366f1", shadow: "rgba(16,185,129,0.4)" },
  ];
  const sc = stepColors[step] || stepColors[0];

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden" style={{ background: "#060818" }}>
      {/* BG orbs */}
      <div className="pointer-events-none absolute top-[-180px] left-[8%] h-[600px] w-[600px] rounded-full blur-[110px] animate-float"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)" }} />
      <div className="pointer-events-none absolute bottom-[-100px] right-[5%] h-[450px] w-[450px] rounded-full blur-[100px] animate-float-reverse"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.11) 0%, transparent 70%)" }} />
      <div className="pointer-events-none absolute top-[40%] right-[20%] h-[250px] w-[250px] rounded-full blur-[80px]"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }} />
      {/* Grid */}
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.05) 1px, transparent 0)", backgroundSize: "44px 44px" }} />

      <div className="w-full max-w-md z-10">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "w-8" : "w-3"}`}
                  style={{
                    background: i <= step
                      ? `linear-gradient(90deg, ${sc.from}, ${sc.to})`
                      : "rgba(255,255,255,0.1)",
                  }} />
              ))}
            </div>
            <span className="text-xs font-medium" style={{ color: sc.from }}>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
          </div>
        </div>

        {/* Card */}
        <motion.div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${sc.shadow}`,
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Gradient stripe */}
          <div className="h-[2px] w-full"
            style={{ background: `linear-gradient(90deg, ${sc.from}, ${sc.to}, ${sc.from})` }} />

          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="s0" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4 animate-float inline-block">👋</div>
                    <h1 className="text-2xl font-bold text-slate-50">Welcome to SmartStudy!</h1>
                    <p className="mt-2 text-sm text-slate-400">Let's personalise your AI study experience</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Your name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shlok"
                      className="w-full rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none focus-glow transition-all text-sm"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} autoFocus />
                    <AnimatePresence>
                      {name.trim() && (
                        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                          <span>✓</span> Nice to meet you, {name.trim()}!
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div key="s1" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4 animate-float inline-block">🎂</div>
                    <h1 className="text-2xl font-bold text-slate-50">How old are you?</h1>
                    <p className="mt-2 text-sm text-slate-400">Helps us tailor intensity & recommendations</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Age</label>
                    <input type="number" min="5" max="99" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 18"
                      className="w-full rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none focus-glow transition-all text-sm"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} autoFocus />
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="s2" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-4 animate-float inline-block">🎓</div>
                    <h1 className="text-2xl font-bold text-slate-50">What's your level?</h1>
                    <p className="mt-2 text-sm text-slate-400">We'll adjust AI difficulty accordingly</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GRADES.map((g) => (
                      <motion.button key={g} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setGrade(g)}
                        className="rounded-xl px-4 py-3 text-sm font-medium text-left transition-all"
                        style={grade === g ? {
                          background: `linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.12))`,
                          border: "1px solid rgba(99,102,241,0.35)",
                          color: "#c7d2fe",
                          boxShadow: "0 2px 16px rgba(99,102,241,0.2)",
                        } : {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "#94a3b8",
                        }}>
                        {g}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="s3" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-4 animate-float inline-block">🚀</div>
                    <h1 className="text-2xl font-bold text-slate-50">What's your main goal?</h1>
                    <p className="mt-2 text-sm text-slate-400">Your AI coach will focus everything around this</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GOALS.map((g) => {
                      const sel = goals.includes(g.label);
                      return (
                        <motion.button key={g.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => sel ? setGoals(goals.filter((x) => x !== g.label)) : setGoals([...goals, g.label])}
                          className="rounded-xl px-3 py-3 text-sm font-medium text-left transition-all"
                          style={sel ? {
                            background: "linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.10))",
                            border: "1px solid rgba(52,211,153,0.35)",
                            color: "#6ee7b7",
                            boxShadow: "0 2px 16px rgba(52,211,153,0.15)",
                          } : {
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            color: "#94a3b8",
                          }}>
                          <span className="mr-1.5">{g.icon}</span>{g.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-8 flex items-center justify-between gap-4">
              {step > 0 ? (
                <motion.button whileHover={{ x: -2 }} onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  ← Back
                </motion.button>
              ) : <div />}
              <motion.button
                whileHover={canNext() ? { scale: 1.03, y: -1 } : {}}
                whileTap={canNext() ? { scale: 0.97 } : {}}
                onClick={() => { if (!canNext()) return; step < totalSteps - 1 ? setStep((s) => s + 1) : handleFinish(); }}
                disabled={!canNext() || saving}
                className="relative overflow-hidden rounded-full px-8 py-3 text-sm font-bold text-white transition-all disabled:opacity-40"
                style={canNext() ? {
                  background: `linear-gradient(135deg, ${sc.from}, ${sc.to})`,
                  boxShadow: `0 4px 20px ${sc.shadow}`,
                } : { background: "rgba(255,255,255,0.1)" }}
              >
                {saving ? "Setting up..." : step === totalSteps - 1 ? "Launch Dashboard 🚀" : "Continue →"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        <p className="mt-5 text-center text-[11px] text-slate-600">
          You can update these anytime from your profile settings
        </p>
      </div>
    </div>
  );
}
