"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const GRADES = ["Class 9", "Class 10", "Class 11", "Class 12", "Undergraduate", "Postgraduate", "Professional"];
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
    // Save to Clerk metadata
    await user?.update({
      unsafeMetadata: {
        onboarded: true,
        displayName: name.trim() || user?.firstName || "Scholar",
        age: parseInt(age) || null,
        grade,
        goal: goals.join(", "),
      },
    });
    await user?.reload(); // Ensure local client knows about update
    window.location.href = "/dashboard"; // Full reload avoids any lingering middleware state
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return age.length > 0 && parseInt(age) > 0 && parseInt(age) < 100;
    if (step === 2) return grade !== "";
    if (step === 3) return goals.length > 0;
    return true;
  };

  const stepVariants = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <div className="relative min-h-screen bg-[#080f1e] flex items-center justify-center px-4 overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute top-[-200px] left-[10%] h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-[100px] animate-float" />
      <div className="pointer-events-none absolute bottom-[-100px] right-[5%] h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[90px] animate-float-reverse" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.06) 1px, transparent 0)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-lg z-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              Step {step + 1} of {totalSteps}
            </span>
            <span className="text-xs text-indigo-400 font-medium">
              {Math.round(((step + 1) / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Card */}
        <motion.div
          className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Top gradient stripe */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400" />

          <div className="p-8 sm:p-10">
            <AnimatePresence mode="wait">
              {/* STEP 0 — Name */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4">👋</div>
                    <h1 className="text-2xl font-bold text-slate-50">Welcome to SmartStudy!</h1>
                    <p className="mt-2 text-sm text-slate-400">
                      Let&apos;s set up your personalised experience. What should we call you?
                    </p>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Shlok"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                      autoFocus
                    />
                    {name.trim() && (
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-emerald-400 flex items-center gap-1.5"
                      >
                        <span>✓</span> Nice to meet you, {name.trim()}!
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 1 — Age */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🎂</div>
                    <h1 className="text-2xl font-bold text-slate-50">How old are you?</h1>
                    <p className="mt-2 text-sm text-slate-400">
                      This helps us tailor your study intensity and recommendations.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="99"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 18"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — Grade / Level */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🎓</div>
                    <h1 className="text-2xl font-bold text-slate-50">What&apos;s your level?</h1>
                    <p className="mt-2 text-sm text-slate-400">
                      We&apos;ll adjust AI difficulty, quiz depth, and plan intensity accordingly.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GRADES.map((g) => (
                      <motion.button
                        key={g}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setGrade(g)}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all ${
                          grade === g
                            ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-200 shadow-lg shadow-indigo-500/10"
                            : "border-white/8 bg-white/4 text-slate-300 hover:border-white/15 hover:bg-white/8"
                        }`}
                      >
                        {g}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — Goal */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🚀</div>
                    <h1 className="text-2xl font-bold text-slate-50">What&apos;s your main goal?</h1>
                    <p className="mt-2 text-sm text-slate-400">
                      Your AI coach will focus everything around this.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map((g) => {
                      const isSelected = goals.includes(g.label);
                      return (
                        <motion.button
                          key={g.label}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (isSelected) {
                              setGoals(goals.filter((gl) => gl !== g.label));
                            } else {
                              setGoals([...goals, g.label]);
                            }
                          }}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all ${
                            isSelected
                              ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200 shadow-lg shadow-emerald-500/10"
                              : "border-white/8 bg-white/4 text-slate-300 hover:border-white/15 hover:bg-white/8"
                          }`}
                        >
                          <span className="mr-2">{g.icon}</span>{g.label}
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
                <motion.button
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  ← Back
                </motion.button>
              ) : (
                <div />
              )}

              <motion.button
                whileHover={canNext() ? { scale: 1.03, y: -1 } : {}}
                whileTap={canNext() ? { scale: 0.97 } : {}}
                onClick={() => {
                  if (!canNext()) return;
                  if (step < totalSteps - 1) {
                    setStep((s) => s + 1);
                  } else {
                    handleFinish();
                  }
                }}
                disabled={!canNext() || saving}
                className={`relative overflow-hidden rounded-full px-8 py-3 text-sm font-semibold text-white transition-all ${
                  canNext()
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-40"
                }`}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 animate-gradient" />
                <span className="relative z-10">
                  {saving ? "Setting up..." : step === totalSteps - 1 ? "Launch my dashboard 🚀" : "Continue →"}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Bottom note */}
        <p className="mt-6 text-center text-xs text-slate-600">
          You can update these anytime from your profile settings
        </p>
      </div>
    </div>
  );
}
