import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { ProgressRing } from "@/components/ProgressRing";
import { GradientButton } from "@/components/GradientButton";

export default function DashboardPage() {
  return (
    <SidebarLayout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6">
          <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-6">
            <h1 className="text-2xl font-semibold text-slate-50">
              Welcome back, planner-in-progress 👋
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              This is your command center. Soon, your AI companion will adapt sessions around
              energy levels, deadlines, and focus windows.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <GradientButton label="Create first study plan" href="/dashboard/plan" />
              <span className="text-xs text-slate-400">
                Takes under 60 seconds. No stress.
              </span>
            </div>
          </GlassCard>

          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Today&apos;s focus
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">Deep Work Block</p>
              <p className="mt-1 text-xs text-slate-400">09:00 → 11:00 · 2 sessions</p>
            </GlassCard>
            <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Upcoming
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">Exam in 7 days</p>
              <p className="mt-1 text-xs text-slate-400">Planner will auto-ramp intensity.</p>
            </GlassCard>
            <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Streak
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">3 days</p>
              <p className="mt-1 text-xs text-slate-400">Consistency unlocks smarter schedules.</p>
            </GlassCard>
          </div>
        </div>

        <GlassCard className="bg-[rgba(15,23,42,0.92)]/70 p-6 flex flex-col items-center justify-center gap-4">
          <ProgressRing value={42} />
          <p className="text-sm text-slate-300 text-center max-w-xs">
            You&apos;re{" "}
            <span className="font-semibold text-indigo-300">42% aligned</span> with
            this week&apos;s study targets. The AI companion will smooth out your schedule as you
            log more real sessions.
          </p>
        </GlassCard>
      </div>
    </SidebarLayout>
  );
}

