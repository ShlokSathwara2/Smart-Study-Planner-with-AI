"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";

type StudySession = {
  date: string; startTime: string; endTime: string; topic: string; unit?: string;
  estimatedMinutes: number; status?: "planned" | "done" | "skipped" | "partial";
  actualMinutes?: number; loggedAt?: string;
};
type StudyPlan = { _id: string; syllabusId: string; examDate: string; dailyHours: number; sessions: StudySession[]; };
type TopicEstimate = { topic: string; estimatedHours: number; confidence: number; };

function groupByDate(sessions: StudySession[]) {
  const map = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const list = map.get(s.date) ?? [];
    list.push(s); map.set(s.date, list);
  }
  for (const [k, list] of map.entries()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    map.set(k, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

const STATUS_CONFIG = {
  done:    { color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.25)",  label: "Done" },
  partial: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.25)",  label: "Partial" },
  skipped: { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)", label: "Skipped" },
  planned: { color: "#a5b4fc", bg: "rgba(165,180,252,0.08)", border: "rgba(165,180,252,0.18)", label: "Planned" },
};

export default function StudyPlanPage() {
  const { user } = useUser();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [syllabusId, setSyllabusId] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sid = new URLSearchParams(window.location.search).get("syllabusId");
      if (sid) setSyllabusId(sid);
    }
  }, []);

  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [clashes, setClashes] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<TopicEstimate[]>([]);
  const [behindDays, setBehindDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const dragRef = useRef<{ date: string; index: number } | null>(null);

  const grouped = useMemo(() => groupByDate(plan?.sessions ?? []), [plan?.sessions]);
  const estimateMap = useMemo(() => { const m = new Map<string, TopicEstimate>(); for (const e of estimates) m.set(e.topic, e); return m; }, [estimates]);

  const doneCount = plan?.sessions.filter((s) => s.status === "done").length ?? 0;
  const totalCount = plan?.sessions.length ?? 0;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  async function refreshEstimates(sid: string) {
    try {
      const res = await fetch(`/api/estimates/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: user?.id ?? "anonymous", syllabusId: sid }) });
      if (!res.ok) return;
      const text = await res.text();
      try {
        const d = JSON.parse(text);
        setEstimates(Array.isArray(d?.estimates) ? d.estimates : []);
      } catch { /* ignore parse errors */ }
    } catch { /* ignore network errors */ }
  }

  async function refreshProgress(pid: string) {
    try {
      const res = await fetch(`/api/plan/${pid}/progress?userId=${encodeURIComponent(user?.id ?? "anonymous")}`);
      if (!res.ok) return;
      const text = await res.text();
      try {
        const d = JSON.parse(text);
        setBehindDays(typeof d?.behindDays === "number" ? d.behindDays : null);
      } catch { /* ignore */ }
    } catch { /* ignore */ }
  }

  async function onGenerate() {
    setError(null); setLoading(true); setPlan(null); setClashes([]); setBehindDays(null);
    try {
      if (!syllabusId.trim()) throw new Error("Please enter a Syllabus ID first. Go to the Overview tab and upload your syllabus.");
      if (!examDate) throw new Error("Please select an exam date.");
      if (!dailyHours || dailyHours <= 0) throw new Error("Daily hours must be > 0.");
      const res = await fetch(`/api/plan/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user?.id ?? "anonymous", syllabusId: syllabusId.trim(), examDate, dailyHours }),
      });
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { throw new Error("Server returned an unexpected response. Please check the backend is running."); }
      if (!res.ok) {
        const msg = data?.error || "Failed to generate plan.";
        if (msg.includes("No topic graph")) throw new Error("No topic graph found for this syllabus. Please go back to the Overview tab and re-upload your chapters first.");
        throw new Error(msg);
      }
      setPlan(data.plan);
      setClashes(Array.isArray(data.clashes) ? data.clashes : []);
      // Run background refreshes silently — errors here must never override the plan
      refreshEstimates(syllabusId.trim());
      refreshProgress(data.plan?._id);
      setExpandedDate(null);
    } catch (e: any) { setError(e?.message || "Something went wrong."); }
    finally { setLoading(false); }
  }

  async function saveSessions(sessions: StudySession[]) {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/plan/${plan._id}/sessions`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: user?.id ?? "anonymous", sessions }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Failed to save.");
      setPlan(d.plan); setClashes(Array.isArray(d.clashes) ? d.clashes : []);
      await refreshProgress(plan._id);
    } catch (e: any) { setError(e?.message || "Failed to save."); }
    finally { setSaving(false); }
  }

  async function updateSessionLog(idx: number, payload: { status?: StudySession["status"]; actualMinutes?: number }) {
    if (!plan) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/api/plan/${plan._id}/session`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: user?.id ?? "anonymous", sessionIndex: idx, ...payload }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Failed to update.");
      setPlan(d.plan);
      await refreshProgress(plan._id);
      await refreshEstimates(plan.syllabusId);
    } catch (e: any) { setError(e?.message || "Failed to update."); }
    finally { setSaving(false); }
  }

  async function autoReschedule() {
    if (!plan) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${apiBase}/api/plan/${plan._id}/reschedule`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: user?.id ?? "anonymous" }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Failed to reschedule.");
      setPlan(d.plan); await refreshProgress(plan._id);
    } catch (e: any) { setError(e?.message || "Failed to reschedule."); }
    finally { setSaving(false); }
  }

  function onDragStart(date: string, index: number) { dragRef.current = { date, index }; }
  function onDrop(targetDate: string) {
    if (!plan) return;
    const drag = dragRef.current; dragRef.current = null; if (!drag) return;
    const updated = [...plan.sessions];
    const group = grouped.find(([d]) => d === drag.date)?.[1] ?? [];
    const session = group[drag.index]; if (!session) return;
    const absIndex = updated.findIndex((s) => s.date === session.date && s.startTime === session.startTime && s.topic === session.topic);
    if (absIndex === -1) return;
    updated[absIndex] = { ...updated[absIndex], date: targetDate, status: updated[absIndex].status ?? "planned" };
    setPlan({ ...plan, sessions: updated });
  }

  useEffect(() => { if (plan?._id) refreshProgress(plan._id); }, [plan?._id]);

  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" };

  return (
    <SidebarLayout>
      <div className="space-y-5">
        {/* Config card */}
        <GlassCard glow glowColor="indigo" className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.3)" }}>📅</div>
            <div>
              <h1 className="text-xl font-bold text-slate-50">Generate Study Plan</h1>
              <p className="text-xs text-slate-500 mt-0.5">Claude builds a day-by-day schedule from your syllabus</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Syllabus ID", placeholder: "e.g. 65f2c0e9a8…", value: syllabusId, onChange: (v: string) => setSyllabusId(v), type: "text" },
              { label: "Exam Date",   placeholder: "", value: examDate, onChange: (v: string) => setExamDate(v), type: "date" },
              { label: "Daily Hours", placeholder: "2", value: dailyHours, onChange: (v: string) => setDailyHours(Number(v)), type: "number" },
            ].map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{f.label}</label>
                <input type={f.type} value={f.value} onChange={(e) => f.onChange(e.target.value)}
                  placeholder={f.placeholder} min={f.type === "number" ? 0.5 : undefined} step={f.type === "number" ? 0.5 : undefined}
                  className="h-10 w-full rounded-xl px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus-glow transition-all"
                  style={inputStyle} />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} onClick={onGenerate} disabled={loading}
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60 glass-shine"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 18px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="inline-block">⚙️</motion.span>
                  Generating…
                </span>
              ) : "✨ Generate Plan"}
            </motion.button>
            <p className="text-xs text-slate-600">Uses topic dependency graph + Claude AI</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 rounded-xl px-4 py-3 text-sm text-rose-300"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Behind days alert */}
        <AnimatePresence>
          {plan && behindDays != null && behindDays > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-300">You are {behindDays} day{behindDays === 1 ? "" : "s"} behind schedule</p>
                    <p className="mt-0.5 text-xs text-slate-400">Missed sessions are still planned. Use recovery to redistribute workload.</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={autoReschedule} disabled={saving}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-amber-200 disabled:opacity-60"
                    style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)" }}>
                    {saving ? "Working…" : "🔄 AI Recovery Plan"}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clashes */}
        {clashes.length > 0 && (
          <GlassCard className="p-4">
            <p className="text-sm font-semibold text-amber-300 mb-1">⚡ Schedule clashes detected</p>
            <p className="text-xs text-slate-400">Some sessions overlap. Drag-and-drop to resolve, then save.</p>
          </GlassCard>
        )}

        {/* Plan timeline */}
        <AnimatePresence>
          {plan && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {/* Progress header */}
              <GlassCard className="p-5 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-bold text-slate-100">Your Study Timeline</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Exam: <span className="text-slate-300">{plan.examDate}</span> · {plan.dailyHours}h/day · {totalCount} sessions</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => refreshEstimates(plan.syllabusId)}
                      className="text-xs rounded-xl px-3 py-2 text-slate-300"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                      🔄 Refresh Estimates
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => plan && saveSessions(plan.sessions)} disabled={saving}
                      className="text-xs rounded-xl px-3 py-2 text-indigo-200 disabled:opacity-60"
                      style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                      {saving ? "Saving…" : "💾 Save Changes"}
                    </motion.button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{doneCount} of {totalCount} sessions done</span>
                    <span className="text-indigo-400 font-semibold">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{ background: "linear-gradient(90deg, #6366f1, #a78bfa, #34d399)" }} />
                  </div>
                </div>
              </GlassCard>

              {/* Day cards */}
              <div className="space-y-3">
                {grouped.map(([date, sessions], di) => {
                  const isExpanded = expandedDate === date || expandedDate === null;
                  const dayDone = sessions.filter((s) => s.status === "done").length;
                  const allDone = dayDone === sessions.length;
                  return (
                    <motion.div key={date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: di * 0.04 }} className="rounded-2xl overflow-hidden"
                      style={{ backdropFilter: "blur(24px)", background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)", border: `1px solid ${allDone ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)"}`, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}
                      onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(date)}>
                      {/* Day header */}
                      <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition"
                        onClick={() => setExpandedDate(expandedDate === date ? null : date)}>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-sm font-bold"
                            style={allDone
                              ? { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
                              : { background: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.2)" }}>
                            {allDone ? "✓" : di + 1}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{date}</p>
                            <p className="text-[10px] text-slate-600">{sessions.length} session{sessions.length !== 1 ? "s" : ""} · {dayDone} done</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {sessions.map((s, i) => {
                              const sc = STATUS_CONFIG[s.status || "planned"];
                              return <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: sc.color }} />;
                            })}
                          </div>
                          <span className="text-slate-600 text-sm">{expandedDate === date ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {(expandedDate === date || expandedDate === null) && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="px-5 pb-4 space-y-2.5 border-t border-white/[0.05] pt-3">
                              {sessions.map((s, idx) => {
                                const est = estimateMap.get(s.topic);
                                const status = s.status ?? "planned";
                                const sc = STATUS_CONFIG[status];
                                const absIndex = plan.sessions.findIndex((x) => x.date === s.date && x.startTime === s.startTime && x.topic === s.topic);
                                return (
                                  <motion.div key={`${s.topic}-${idx}`} draggable onDragStart={() => onDragStart(date, idx)}
                                    whileHover={{ x: 3 }} className="rounded-xl p-4 cursor-grab active:cursor-grabbing"
                                    style={{ background: `linear-gradient(135deg, ${sc.bg} 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${sc.border}` }}>
                                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                      <p className="font-semibold text-sm text-slate-100">{s.topic}</p>
                                      <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{s.startTime}–{s.endTime}</span>
                                        <span>·</span>
                                        <span>{Math.round(s.estimatedMinutes)}m</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                      {est && (
                                        <span className="text-[10px] rounded-full px-2.5 py-1 text-emerald-300"
                                          style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)" }}>
                                          est. {Number(est.estimatedHours).toFixed(1)}h · {Math.round(est.confidence)}% conf.
                                        </span>
                                      )}
                                      <span className="text-[10px] rounded-full px-2.5 py-1 font-medium" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                                        {sc.label}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        { label: "✓ Done",    status: "done"    as const, mins: s.actualMinutes ?? s.estimatedMinutes },
                                        { label: "½ Partial", status: "partial" as const, mins: Math.round((s.actualMinutes ?? s.estimatedMinutes) * 0.5) },
                                        { label: "— Skip",    status: "skipped" as const, mins: 0 },
                                      ].map((btn) => (
                                        <motion.button key={btn.status} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                          onClick={() => absIndex >= 0 && updateSessionLog(absIndex, { status: btn.status, actualMinutes: btn.mins })}
                                          className="text-[11px] rounded-lg px-3 py-1.5 font-medium transition-all"
                                          style={status === btn.status
                                            ? { background: STATUS_CONFIG[btn.status].bg, border: `1px solid ${STATUS_CONFIG[btn.status].color}`, color: STATUS_CONFIG[btn.status].color }
                                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                                          {btn.label}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SidebarLayout>
  );
}
