"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";

type StudySession = {
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
  unit?: string;
  estimatedMinutes: number;
  status?: "planned" | "done" | "skipped" | "partial";
  actualMinutes?: number;
  loggedAt?: string;
};

type StudyPlan = {
  _id: string;
  syllabusId: string;
  examDate: string;
  dailyHours: number;
  sessions: StudySession[];
};

type TopicEstimate = {
  topic: string;
  estimatedHours: number;
  confidence: number;
};

function groupByDate(sessions: StudySession[]) {
  const map = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const list = map.get(s.date) ?? [];
    list.push(s);
    map.set(s.date, list);
  }
  for (const [k, list] of map.entries()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    map.set(k, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function statusBadgeClasses(status: StudySession["status"]) {
  switch (status) {
    case "done":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    case "partial":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    case "skipped":
      return "border-slate-400/15 bg-white/5 text-slate-300";
    default:
      return "border-indigo-400/20 bg-indigo-400/10 text-indigo-200";
  }
}

export default function StudyPlanPage() {
  const { user } = useUser();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [syllabusId, setSyllabusId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [clashes, setClashes] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<TopicEstimate[]>([]);
  const [behindDays, setBehindDays] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ date: string; index: number } | null>(null);

  const grouped = useMemo(() => groupByDate(plan?.sessions ?? []), [plan?.sessions]);
  const estimateMap = useMemo(() => {
    const m = new Map<string, TopicEstimate>();
    for (const e of estimates) m.set(e.topic, e);
    return m;
  }, [estimates]);

  async function refreshEstimates(currentSyllabusId: string) {
    const res = await fetch(`${apiBase}/api/estimates/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: user?.id ?? "anonymous",
        syllabusId: currentSyllabusId,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setEstimates(Array.isArray(data?.estimates) ? data.estimates : []);
  }

  async function refreshProgress(currentPlanId: string) {
    const res = await fetch(
      `${apiBase}/api/plan/${currentPlanId}/progress?userId=${encodeURIComponent(user?.id ?? "anonymous")}`,
    );
    if (!res.ok) return;
    const data = await res.json();
    setBehindDays(typeof data?.behindDays === "number" ? data.behindDays : null);
  }

  async function onGenerate() {
    setError(null);
    setLoading(true);
    setPlan(null);
    setClashes([]);
    setBehindDays(null);

    try {
      if (!syllabusId.trim()) throw new Error("Please paste a syllabusId first.");
      if (!examDate) throw new Error("Please select an exam date.");
      if (!dailyHours || dailyHours <= 0) throw new Error("Daily hours must be > 0.");

      const res = await fetch(`${apiBase}/api/plan/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
          syllabusId: syllabusId.trim(),
          examDate,
          dailyHours,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to generate plan.");

      setPlan(data.plan);
      setClashes(Array.isArray(data.clashes) ? data.clashes : []);

      await refreshEstimates(syllabusId.trim());
      await refreshProgress(data.plan?._id);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSessions(updatedSessions: StudySession[]) {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/plan/${plan._id}/sessions`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
          sessions: updatedSessions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save changes.");
      setPlan(data.plan);
      setClashes(Array.isArray(data.clashes) ? data.clashes : []);
      await refreshProgress(plan._id);
    } catch (e: any) {
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function updateSessionLog(sessionIndex: number, payload: { status?: StudySession["status"]; actualMinutes?: number }) {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/plan/${plan._id}/session`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
          sessionIndex,
          ...payload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update session.");
      setPlan(data.plan);
      await refreshProgress(plan._id);
      await refreshEstimates(plan.syllabusId);
    } catch (e: any) {
      setError(e?.message || "Failed to update session.");
    } finally {
      setSaving(false);
    }
  }

  async function autoReschedule() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/plan/${plan._id}/reschedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to reschedule.");
      setPlan(data.plan);
      await refreshProgress(plan._id);
    } catch (e: any) {
      setError(e?.message || "Failed to reschedule.");
    } finally {
      setSaving(false);
    }
  }

  function onDragStart(date: string, index: number) {
    dragRef.current = { date, index };
  }

  function onDrop(targetDate: string) {
    if (!plan) return;
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const updated = [...plan.sessions];
    const group = grouped.find(([d]) => d === drag.date)?.[1] ?? [];
    const session = group[drag.index];
    if (!session) return;

    // find original absolute index in plan.sessions
    const absIndex = updated.findIndex(
      (s) =>
        s.date === session.date &&
        s.startTime === session.startTime &&
        s.endTime === session.endTime &&
        s.topic === session.topic,
    );
    if (absIndex === -1) return;

    updated[absIndex] = { ...updated[absIndex], date: targetDate, status: updated[absIndex].status ?? "planned" };
    setPlan({ ...plan, sessions: updated });
  }

  useEffect(() => {
    if (plan?._id) {
      refreshProgress(plan._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?._id]);

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6">
        <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-6">
          <h1 className="text-2xl font-semibold text-slate-50">Generate your study plan</h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Paste your <span className="text-indigo-200 font-medium">syllabusId</span> (from the syllabus upload step),
            choose your exam date, and set how many hours you can study per day.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Syllabus ID
              </label>
              <input
                value={syllabusId}
                onChange={(e) => setSyllabusId(e.target.value)}
                placeholder="e.g. 65f2c0e9a8..."
                className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-400/60"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Exam date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-indigo-400/60"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Daily hours
              </label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-slate-100 outline-none focus:border-indigo-400/60"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <GradientButton
              label={loading ? "Generating..." : "Generate plan"}
              disabled={loading}
              onClick={onGenerate}
              className={loading ? "opacity-70 cursor-not-allowed" : ""}
            />
            <span className="text-xs text-slate-400">
              Uses your topic dependency graph + Claude to build a day-by-day schedule.
            </span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </GlassCard>

        {plan && behindDays != null && behindDays > 0 && (
          <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-5 border border-amber-400/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-200">
                  You are {behindDays} day{behindDays === 1 ? "" : "s"} behind
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Missed sessions are still marked as planned. Use recovery to redistribute the remaining workload.
                </p>
              </div>
              <button
                onClick={autoReschedule}
                className="text-xs rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-amber-100 hover:bg-amber-400/15 transition"
                disabled={saving}
              >
                {saving ? "Working..." : "AI recovery plan"}
              </button>
            </div>
          </GlassCard>
        )}

        {clashes.length > 0 && (
          <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-5 border border-amber-400/20">
            <p className="text-sm font-medium text-amber-200">Schedule clashes detected</p>
            <p className="mt-1 text-xs text-slate-300">
              Some sessions overlap (inside the generated plan). We can auto-fix these in Phase 6 drag-and-drop / reschedule.
            </p>
          </GlassCard>
        )}

        {plan && (
          <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Your timeline</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Exam date: <span className="text-slate-200 font-medium">{plan.examDate}</span> · Daily hours:{" "}
                  <span className="text-slate-200 font-medium">{plan.dailyHours}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => refreshEstimates(plan.syllabusId)}
                  className="text-xs rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10 transition"
                >
                  Refresh AI time estimates
                </button>
                <button
                  onClick={() => plan && saveSessions(plan.sessions)}
                  className="text-xs rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-indigo-100 hover:bg-indigo-400/15 transition disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-6">
              {grouped.map(([date, sessions]) => (
                <div
                  key={date}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(date)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{date}</p>
                  <div className="mt-3 grid gap-3">
                    {sessions.map((s, idx) => {
                      const est = estimateMap.get(s.topic);
                      const status = s.status ?? "planned";
                      return (
                        <div
                          key={`${s.topic}-${s.startTime}-${idx}`}
                          draggable
                          onDragStart={() => onDragStart(date, idx)}
                          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[rgba(30,41,59,0.55)]/70 px-4 py-3 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-50">{s.topic}</p>
                            <p className="text-xs text-slate-300">
                              {s.startTime}–{s.endTime} · {Math.round(s.estimatedMinutes)}m
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                            {est ? (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                                est. {Number(est.estimatedHours).toFixed(1)} hrs · {Math.round(est.confidence)}% confidence
                              </span>
                            ) : (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                                no estimate yet
                              </span>
                            )}
                            <span className={`rounded-full border px-3 py-1 ${statusBadgeClasses(status)}`}>
                              status: {status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                const absIndex = plan.sessions.findIndex(
                                  (x) =>
                                    x.date === s.date &&
                                    x.startTime === s.startTime &&
                                    x.endTime === s.endTime &&
                                    x.topic === s.topic,
                                );
                                if (absIndex >= 0) updateSessionLog(absIndex, { status: "done", actualMinutes: s.actualMinutes ?? s.estimatedMinutes });
                              }}
                              className="text-xs rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100 hover:bg-emerald-400/15 transition"
                            >
                              Mark done
                            </button>
                            <button
                              onClick={() => {
                                const absIndex = plan.sessions.findIndex(
                                  (x) =>
                                    x.date === s.date &&
                                    x.startTime === s.startTime &&
                                    x.endTime === s.endTime &&
                                    x.topic === s.topic,
                                );
                                if (absIndex >= 0) updateSessionLog(absIndex, { status: "partial", actualMinutes: Math.round((s.actualMinutes ?? s.estimatedMinutes) * 0.5) });
                              }}
                              className="text-xs rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100 hover:bg-amber-400/15 transition"
                            >
                              Partial
                            </button>
                            <button
                              onClick={() => {
                                const absIndex = plan.sessions.findIndex(
                                  (x) =>
                                    x.date === s.date &&
                                    x.startTime === s.startTime &&
                                    x.endTime === s.endTime &&
                                    x.topic === s.topic,
                                );
                                if (absIndex >= 0) updateSessionLog(absIndex, { status: "skipped", actualMinutes: 0 });
                              }}
                              className="text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 hover:bg-white/10 transition"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </SidebarLayout>
  );
}

