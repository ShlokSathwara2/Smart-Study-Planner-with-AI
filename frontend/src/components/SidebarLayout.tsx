"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarLayoutProps { children: ReactNode; }

const navItems = [
  { href: "/dashboard",          label: "Overview",    icon: "🏠", exact: true },
  { href: "/dashboard/plan",     label: "Study Plan",  icon: "📅" },
  { href: "/dashboard/focus",    label: "Focus Timer", icon: "⏱️" },
  { href: "/dashboard/schedule", label: "Schedule",    icon: "🗓️" },
  { href: "/dashboard/subjects", label: "Subjects",    icon: "📚" },
  { href: "/dashboard/companion",label: "AI Companion",icon: "🤖" },
  { href: "/dashboard/profile",  label: "My Profile",  icon: "👤" },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = (user?.unsafeMetadata?.displayName as string) || user?.firstName || "Scholar";
  const grade  = (user?.unsafeMetadata?.grade as string) || null;
  const goal   = (user?.unsafeMetadata?.goal as string) || null;
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="relative h-8 w-8 shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400/30 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">S</span>
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight">
            Smart<span className="text-indigo-400">Study</span>
          </span>
          <div className="text-[10px] text-slate-500 tracking-widest uppercase">AI Platform</div>
        </div>
      </div>

      {/* User Card */}
      <div className="mx-3 my-3 rounded-xl p-3"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/30 overflow-hidden">
              {user?.imageUrl
                ? <img src={user.imageUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
                : initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#080d1c] shadow shadow-emerald-400/50" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-100 truncate">{displayName}</p>
            {grade && <p className="text-[10px] text-indigo-400/80 truncate">{grade}</p>}
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        {goal && (
          <div className="mt-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 border border-white/[0.06]">
            <p className="text-[10px] text-slate-400 leading-tight">🎯 {goal.split(",")[0]}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Navigation</p>
        {navItems.map((item, i) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group ${
                  active ? "text-indigo-200" : "text-slate-400 hover:text-slate-200"
                }`}
                style={active ? {
                  background: "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 100%)",
                  border: "1px solid rgba(99,102,241,0.22)",
                  boxShadow: "0 2px 12px rgba(99,102,241,0.15)",
                } : { border: "1px solid transparent" }}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06))" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {!active && (
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
                )}
                <span className="relative z-10 text-base leading-none">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
                {active && (
                  <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400 shadow shadow-indigo-400/60" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="mx-3 mb-4 rounded-xl p-3 border border-white/[0.05]"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AI Engine Online</span>
          <div className="ml-auto font-mono text-indigo-400/60">v2.0</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen text-slate-100" style={{ background: "#060818" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/[0.05]"
        style={{
          background: "linear-gradient(180deg, rgba(10,14,30,0.95) 0%, rgba(8,12,28,0.98) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b border-white/[0.06]"
        style={{ background: "rgba(6,8,24,0.92)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">S</div>
          <span className="text-sm font-semibold">Smart<span className="text-indigo-400">Study</span></span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition">
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-40 w-64 flex flex-col border-r border-white/[0.06]"
              style={{ background: "rgba(6,8,24,0.97)", backdropFilter: "blur(24px)" }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="lg:hidden h-14" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
