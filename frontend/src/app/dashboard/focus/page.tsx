"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";

type Phase = "idle" | "work" | "break" | "finished";

export default function FocusPage() {
  const { user } = useUser();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60); // work duration
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [workElapsed, setWorkElapsed] = useState(0);
  const [deepWorkSeconds, setDeepWorkSeconds] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [report, setReport] = useState<{
    focusScore: number;
    deepMinutes: number;
    totalMinutes: number;
    distractions: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRunning = phase === "work" || phase === "break";
  const totalWorkSeconds = 25 * 60;
  const breakSeconds = 5 * 60;

  const formattedTime = useMemo(() => {
    const m = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (remainingSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remainingSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (phase === "work") {
            // auto-switch to break
            setPhase("break");
            return breakSeconds;
          }
          if (phase === "break") {
            setPhase("finished");
            return 0;
          }
        }
        return prev - 1;
      });
      if (phase === "work") {
        setWorkElapsed((v) => v + 1);
        setDeepWorkSeconds((d) => d + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, phase, breakSeconds]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && phase === "work") {
        setDistractions((d) => d + 1);
        setDeepWorkSeconds((d) => Math.max(0, d - 5)); // simple penalty heuristic
        if (sessionId) {
          fetch(`${apiBase}/api/focus/${sessionId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              userId: user?.id ?? "anonymous",
              eventType: "visibility-hidden",
            }),
          }).catch(() => {});
        }
      } else if (!document.hidden && sessionId) {
        fetch(`${apiBase}/api/focus/${sessionId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: user?.id ?? "anonymous",
            eventType: "visibility-visible",
          }),
        }).catch(() => {});
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [apiBase, phase, sessionId, user?.id]);

  async function startSession() {
    try {
      setError(null);
      setReport(null);
      if (!topic.trim()) {
        throw new Error("Enter a topic before starting.");
      }
      const res = await fetch(`${apiBase}/api/focus/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
          topic: topic.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to start session.");
      setSessionId(data.session?._id);
      setPhase("work");
      setRemainingSeconds(totalWorkSeconds);
      setWorkElapsed(0);
      setDeepWorkSeconds(0);
      setDistractions(0);
    } catch (e: any) {
      setError(e?.message || "Failed to start.");
    }
  }

  async function finishAndReport() {
    if (!sessionId) {
      setPhase("finished");
      return;
    }
    const total = Math.max(workElapsed, 1);
    const deep = Math.min(deepWorkSeconds, total);
    const focusScore = Math.round((deep / total) * 100);

    setReport({
      focusScore,
      deepMinutes: Math.round(deep / 60),
      totalMinutes: Math.round(total / 60),
      distractions,
    });
    setPhase("finished");

    try {
      await fetch(`${apiBase}/api/focus/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
          status: "finished",
          totalSeconds: total,
          deepWorkSeconds: deep,
          distractionCount: distractions,
          eventType: "end",
        }),
      });
    } catch {
      // ignore
    }
  }

  async function pauseOrResume(next: "pause" | "resume") {
    if (!sessionId) return;
    try {
      await fetch(`${apiBase}/api/focus/${sessionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "anonymous",
          status: next === "pause" ? "paused" : "running",
          eventType: next === "pause" ? "pause" : "resume",
          totalSeconds: workElapsed,
          deepWorkSeconds,
          distractionCount: distractions,
        }),
      });
      if (next === "pause") {
        setPhase("idle");
      } else {
        setPhase("work");
      }
    } catch {
      // ignore
    }
  }

  const title =
    phase === "work" ? "Focus block" : phase === "break" ? "Break" : phase === "finished" ? "Session complete" : "Ready to focus";

  return (
    <SidebarLayout>
      <div className="flex flex-col gap-6">
        <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-6">
          <h1 className="text-2xl font-semibold text-slate-50">Focus timer</h1>
          <p className="mt-2 text-sm text-slate-300 max-w-xl">
            Classic Pomodoro: <span className="font-semibold text-indigo-200">25 min</span> deep work +{" "}
            <span className="font-semibold text-emerald-200">5 min</span> break, tracked with an AI-aware focus score.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[2fr,1fr] items-center">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Topic you&apos;re working on
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Neural Networks – Backpropagation"
                className="h-10 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-indigo-400/60"
                disabled={phase === "work" || phase === "break"}
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
              <p className="font-mono text-4xl font-semibold text-slate-50">{formattedTime}</p>
              <p className="text-xs text-slate-400">
                Distractions: <span className="text-slate-100 font-medium">{distractions}</span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {phase === "idle" && (
              <GradientButton label="Start 25 min focus" onClick={startSession} />
            )}
            {phase === "work" && (
              <>
                <GradientButton label="Pause" onClick={() => pauseOrResume("pause")} />
                <button
                  onClick={finishAndReport}
                  className="text-xs rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10 transition"
                >
                  End early
                </button>
              </>
            )}
            {phase === "break" && (
              <span className="text-xs text-emerald-200">
                Break in progress. Timer will stop automatically when break ends.
              </span>
            )}
            {phase === "finished" && (
              <GradientButton
                label="Start another session"
                onClick={() => {
                  setPhase("idle");
                  setRemainingSeconds(totalWorkSeconds);
                  setReport(null);
                  setSessionId(null);
                  setWorkElapsed(0);
                  setDeepWorkSeconds(0);
                  setDistractions(0);
                }}
              />
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </GlassCard>

        {report && (
          <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-6">
            <h2 className="text-lg font-semibold text-slate-50">Session report</h2>
            <p className="mt-1 text-xs text-slate-400">
              Topic: <span className="text-slate-200 font-medium">{topic || "Untitled"}</span>
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Focus score
                </p>
                <p className="mt-1 text-2xl font-semibold text-emerald-300">
                  {report.focusScore}
                  <span className="text-base text-slate-400"> / 100</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Deep work time
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {report.deepMinutes} min{" "}
                  <span className="text-slate-500">
                    (of {report.totalMinutes} min total)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Distractions
                </p>
                <p className="mt-1 text-sm text-slate-200">{report.distractions}</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </SidebarLayout>
  );
}

