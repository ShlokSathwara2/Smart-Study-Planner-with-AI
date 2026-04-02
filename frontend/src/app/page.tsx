import Link from "next/link";
import { GradientButton } from "@/components/GradientButton";

const features = [
  {
    icon: "🧠",
    title: "AI-Powered Study Plans",
    description:
      "Upload your syllabus and Claude builds a personalised plan around your deadlines and learning pace.",
  },
  {
    icon: "📊",
    title: "Smart Topic Estimates",
    description:
      "AI analyses your historical focus sessions to predict exactly how long each topic will take you.",
  },
  {
    icon: "⏱️",
    title: "Focus Session Tracker",
    description:
      "Log real study time and watch the AI recalibrate your schedule in real time.",
  },
  {
    icon: "🗺️",
    title: "Topic Dependency Graph",
    description:
      "Visualise which topics unlock others so you always study in the right order.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a] text-slate-50 font-sans">
      {/* Background glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-indigo-600/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[60%] -left-32 h-[400px] w-[400px] rounded-full bg-emerald-500/10 blur-[100px]"
      />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <span className="text-lg font-semibold tracking-tight text-slate-50">
          Smart<span className="text-indigo-400">Study</span>
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Sign in
          </Link>
          <GradientButton label="Get started" href="/sign-up" />
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-24 pb-32 text-center sm:pt-32">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 tracking-wide uppercase">
          ✦ AI-Powered · Built with Claude
        </span>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-50 sm:text-6xl sm:leading-[1.1]">
          Study smarter.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Not harder.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base text-slate-400 sm:text-lg leading-relaxed">
          Upload your syllabus, set your exam date, and let AI build a
          personalised study plan that adapts to how you actually learn.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <GradientButton label="Start planning for free →" href="/sign-up" className="px-8 py-3 text-base" />
          <Link
            href="/sign-in"
            className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors"
          >
            Already have an account?
          </Link>
        </div>

        {/* Hero card mock */}
        <div className="mt-20 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/60 p-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Today&apos;s AI-generated plan</span>
          </div>
          <div className="grid gap-3">
            {[
              { topic: "Linear Algebra — Eigenvalues", time: "09:00 → 10:30", tag: "High priority" },
              { topic: "Probability Theory — Bayes", time: "11:00 → 12:00", tag: "Review" },
              { topic: "Algorithms — Dynamic Programming", time: "14:00 → 16:00", tag: "New topic" },
            ].map((s) => (
              <div
                key={s.topic}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{s.topic}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.time}</p>
                </div>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-0.5 text-[11px] text-indigo-300">
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Schedule auto-adjusted based on your 3-day focus history ✦
          </p>
        </div>
      </main>

      {/* Features */}
      <section className="relative z-10 px-6 pb-32 sm:px-12">
        <h2 className="text-center text-2xl font-semibold text-slate-200 mb-10">
          Everything your study session needs
        </h2>
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg shadow-black/30"
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 text-base font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 flex flex-col items-center gap-6 px-6 pb-28 text-center">
        <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
          Ready to take control of your studies?
        </h2>
        <GradientButton label="Create your free account →" href="/sign-up" className="px-8 py-3 text-base" />
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SmartStudy · Powered by Claude AI
      </footer>
    </div>
  );
}
