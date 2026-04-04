"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarLayout } from "@/components/SidebarLayout";

const GRADES = [
  "Class 9", "Class 10", "Class 11", "Class 12",
  "Undergraduate", "Postgraduate", "Professional",
];
const GOALS = [
  { icon: "🏆", label: "Ace my exams" },
  { icon: "📚", label: "Build strong fundamentals" },
  { icon: "⚡", label: "Study in less time" },
  { icon: "🧠", label: "Remember everything I learn" },
  { icon: "🎯", label: "Target a specific score" },
  { icon: "💡", label: "Enjoy studying" },
];

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable state — initialised from Clerk unsafeMetadata
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const meta = user?.unsafeMetadata as any;
  const displayName = meta?.displayName || user?.firstName || "Scholar";
  const currentAge = meta?.age?.toString() || "—";
  const currentGrade = meta?.grade || "—";
  const currentGoals: string[] = meta?.goal
    ? meta.goal.split(", ").filter(Boolean)
    : [];
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  function startEdit() {
    setName(meta?.displayName || user?.firstName || "");
    setAge(meta?.age?.toString() || "");
    setGrade(meta?.grade || "");
    setSelectedGoals(currentGoals);
    setEditing(true);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await user?.update({
        unsafeMetadata: {
          ...meta,
          displayName: name.trim() || user?.firstName || "Scholar",
          age: parseInt(age) || null,
          grade,
          goal: selectedGoals.join(", "),
        },
      });
      await user?.reload();
      setSuccessMsg("Profile updated! ✓");
      setEditing(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function resetAllData() {
    setResetting(true);
    try {
      // Clear all backend data for this user
      await fetch(`${apiBase}/api/user/reset`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });

      // Clear Clerk onboarding flag so they go through onboarding again
      await user?.update({
        unsafeMetadata: {
          onboarded: false,
          displayName: null,
          age: null,
          grade: null,
          goal: null,
        },
      });
      await user?.reload();
      router.replace("/onboarding");
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  }

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!isLoaded) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-50">👤 My Profile</h1>
          <p className="mt-1 text-slate-400 text-sm">Your personal details and learning preferences</p>
        </motion.div>

        {/* Success toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
            >
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar + identity card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.13) 0%, rgba(139,92,246,0.08) 100%)",
            border: "1px solid rgba(99,102,241,0.25)",
            backdropFilter: "blur(24px)",
            borderRadius: 20,
          }}
          className="p-6"
        >
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/30">
                {user?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt={displayName} className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-[#0a1428]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-50">{displayName}</h2>
              <p className="text-sm text-slate-400 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
              <p className="text-xs text-slate-600 mt-1">Member since {memberSince}</p>
            </div>
            {!editing && (
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={startEdit}
                className="shrink-0 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                ✏️ Edit
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Details grid (view mode) */}
        {!editing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
              borderRadius: 20,
            }}
            className="p-6 space-y-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Learning Details</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Full Name", value: displayName, icon: "👤" },
                { label: "Age", value: currentAge, icon: "🎂" },
                { label: "Education Level", value: currentGrade, icon: "🎓" },
                { label: "Member Since", value: memberSince, icon: "📅" },
              ].map((item) => (
                <div key={item.label}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}
                  className="p-4"
                >
                  <p className="text-xs text-slate-500 mb-1">{item.icon} {item.label}</p>
                  <p className="text-sm font-semibold text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Goals */}
            <div>
              <p className="text-xs text-slate-500 mb-2">🎯 Study Goals</p>
              <div className="flex flex-wrap gap-2">
                {currentGoals.length > 0 ? currentGoals.map((g) => (
                  <span key={g}
                    style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                    className="rounded-full px-3 py-1 text-xs font-medium text-indigo-300"
                  >
                    {g}
                  </span>
                )) : (
                  <span className="text-sm text-slate-500">No goals set</span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Edit mode */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(24px)",
              borderRadius: 20,
            }}
            className="p-6 space-y-5"
          >
            <h3 className="text-sm font-semibold text-slate-200">Edit Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5">Name</label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1.5">Age</label>
                <input
                  type="number" value={age} onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Education Level</label>
              <div className="grid grid-cols-3 gap-2">
                {GRADES.map((g) => (
                  <button key={g} onClick={() => setGrade(g)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left"
                    style={grade === g ? {
                      background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))",
                      border: "1px solid rgba(99,102,241,0.4)",
                      color: "#c7d2fe",
                    } : {
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#94a3b8",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Goals</label>
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => {
                  const sel = selectedGoals.includes(g.label);
                  return (
                    <button key={g.label}
                      onClick={() => sel ? setSelectedGoals(selectedGoals.filter(x => x !== g.label)) : setSelectedGoals([...selectedGoals, g.label])}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all"
                      style={sel ? {
                        background: "rgba(52,211,153,0.15)",
                        border: "1px solid rgba(52,211,153,0.35)",
                        color: "#6ee7b7",
                      } : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#94a3b8",
                      }}
                    >
                      <span className="mr-1.5">{g.icon}</span>{g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={saveProfile} disabled={saving}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </motion.button>
              <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-300 transition">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: "Day Streak", value: "7", unit: "days", icon: "🔥", color: "#f97316" },
            { label: "Topics Done", value: "12", unit: "topics", icon: "✅", color: "#10b981" },
            { label: "Exam Readiness", value: "74", unit: "%", icon: "📈", color: "#6366f1" },
          ].map((s) => (
            <div key={s.label}
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
              }}
              className="p-4 text-center"
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-2xl font-bold text-slate-50">{s.value}<span className="text-sm text-slate-500 ml-1">{s.unit}</span></p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Danger Zone — Reset Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.04) 100%)",
            border: "1px solid rgba(239,68,68,0.20)",
            borderRadius: 20,
          }}
          className="p-6"
        >
          <h3 className="text-sm font-bold text-red-400 mb-1">⚠️ Danger Zone</h3>
          <p className="text-xs text-slate-400 mb-4">
            This will permanently delete all your study plans, syllabus data, quiz results, focus sessions, and reset your onboarding details. You'll be taken through the setup again fresh.
          </p>

          <AnimatePresence>
            {!showResetConfirm ? (
              <motion.button
                key="reset-btn"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setShowResetConfirm(true)}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition"
              >
                🗑️ Reset All My Data
              </motion.button>
            ) : (
              <motion.div
                key="reset-confirm"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14 }}
                className="p-4 space-y-3"
              >
                <p className="text-sm font-semibold text-red-300">Are you absolutely sure?</p>
                <p className="text-xs text-slate-400">This action is <strong className="text-red-400">irreversible</strong>. All your data will be permanently erased.</p>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={resetAllData} disabled={resetting}
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 4px 16px rgba(239,68,68,0.35)" }}
                  >
                    {resetting ? "Resetting…" : "Yes, Reset Everything"}
                  </motion.button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="text-sm text-slate-500 hover:text-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </SidebarLayout>
  );
}
