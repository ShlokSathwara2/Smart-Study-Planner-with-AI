"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "🏠", exact: true },
  { href: "/dashboard/plan", label: "Study Plan", icon: "📅" },
  { href: "/dashboard/focus", label: "Focus Timer", icon: "⏱️" },
  { href: "/dashboard/schedule", label: "Schedule", icon: "🗓️" },
  { href: "/dashboard/subjects", label: "Subjects", icon: "📚" },
  { href: "/dashboard/companion", label: "AI Companion", icon: "🤖" },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const displayName =
    (user?.unsafeMetadata?.displayName as string) ||
    user?.firstName ||
    "Scholar";
  const grade = (user?.unsafeMetadata?.grade as string) || null;
  const goal = (user?.unsafeMetadata?.goal as string) || null;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-[#080f1e] text-slate-100">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-[#0a1428]/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
          <div className="relative h-7 w-7 shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">S</span>
          </div>
          <span className="text-sm font-semibold">
            Smart<span className="text-indigo-400">Study</span>
          </span>
        </div>

        {/* User Info Card */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                {user?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0a1428]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                Hey, {displayName}! 👋
              </p>
              {grade && (
                <p className="text-xs text-slate-500 truncate">{grade}</p>
              )}
            </div>
          </div>
          {goal && (
            <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-3 py-2">
              <p className="text-xs text-indigo-300 leading-tight">🎯 {goal}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            Navigation
          </p>
          <div className="flex flex-col gap-0.5">
            {navItems.map((item, i) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Link
                    href={item.href}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-indigo-500/15 text-indigo-200 shadow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-base transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {active && (
                      <motion.span
                        layoutId="active-dot"
                        className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                      />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>

        {/* Bottom: Clerk User Button */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">Account</p>
            <UserButton />
          </div>
        </div>
      </aside>

      {/* ── Main Content area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile + desktop) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#080f1e]/80 backdrop-blur-xl px-6 py-3.5">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="relative h-6 w-6">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-semibold">Smart<span className="text-indigo-400">Study</span></span>
          </div>

          {/* Greeting (desktop) */}
          <div className="hidden lg:block">
            <motion.p
              key={displayName}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-slate-400"
            >
              Welcome back,{" "}
              <span className="text-slate-100 font-semibold">{displayName}</span> 🎓
            </motion.p>
          </div>

          <div className="flex items-center gap-3">
            {/* Readiness pill */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-medium">AI Active</span>
            </div>
            {/* Mobile user button */}
            <div className="lg:hidden">
              <UserButton />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
