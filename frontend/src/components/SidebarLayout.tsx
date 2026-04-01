"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { GlassCard } from "@/components/GlassCard";

interface SidebarLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/plan", label: "Study Plan" },
  { href: "/dashboard/focus", label: "Focus Timer" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/subjects", label: "Subjects" },
  { href: "/dashboard/companion", label: "AI Companion" },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-6 px-6 py-6 text-slate-100">
      <aside className="w-64 shrink-0">
        <GlassCard className="h-full bg-[rgba(15,23,42,0.9)]/60">
          <div className="flex flex-col gap-6 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Smart Study Planner
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">Dashboard</h2>
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors duration-150 ${
                      active
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "text-slate-300 hover:bg-slate-700/40 hover:text-slate-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </GlassCard>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

