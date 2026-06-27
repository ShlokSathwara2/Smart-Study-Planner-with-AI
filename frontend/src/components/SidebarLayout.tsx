"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarLayoutProps { children: ReactNode; }

const navItems = [
  { href: "/dashboard",          label: "Overview",    icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ), exact: true },
  { href: "/dashboard/plan",     label: "Study Plan",  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ) },
  { href: "/dashboard/focus",    label: "Focus Timer", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ) },
  { href: "/dashboard/schedule", label: "Schedule",    icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ) },
  { href: "/dashboard/subjects", label: "Subjects",    icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ) },
  { href: "/dashboard/companion",label: "AI Companion",icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ) },
  { href: "/dashboard/profile",  label: "My Profile",  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ) },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = (user?.unsafeMetadata?.displayName as string) || user?.firstName || "Scholar";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center py-5">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold text-white">
          S
        </div>
      </div>

      {/* Nav Icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="w-full"
            >
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={item.label}
                className={`relative flex items-center justify-center w-full aspect-square rounded-xl transition-all duration-200 group ${
                  active
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="relative z-10">{item.icon}</span>
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-white/20"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User Avatar */}
      <div className="flex flex-col items-center gap-3 py-4 border-t border-white/10">
        <div className="relative">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
            {user?.imageUrl
              ? <img src={user.imageUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
              : initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#1a3a3a]" />
        </div>
        <UserButton />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "#e8f5f0" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-[68px] shrink-0 flex-col"
        style={{
          background: "linear-gradient(180deg, #1a3a3a 0%, #153030 100%)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: "#1a3a3a", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white">S</div>
          <span className="text-sm font-semibold text-white">SmartStudy</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 z-40 w-64 flex flex-col"
              style={{ background: "#1a3a3a" }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto relative">
        <div className="relative z-10">
          <div className="lg:hidden h-14" />
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 lg:py-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
