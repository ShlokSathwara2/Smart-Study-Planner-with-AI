"use client";

import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface ReviewBannerProps {
  reviewsDueToday: number;
  userId?: string;
}

export function ReviewBanner({ reviewsDueToday }: ReviewBannerProps) {
  if (reviewsDueToday === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <GlassCard className="p-4 border-amber-500/30 bg-amber-500/5" glow>
        <div className="flex items-center gap-4">
          <div className="shrink-0 h-12 w-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <span className="text-2xl">🔄</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-amber-200">Spaced Repetition Due</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                {reviewsDueToday} topic{reviewsDueToday > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-sm text-amber-200/70 mt-1">
              You have <strong className="text-amber-200">{reviewsDueToday} topic{reviewsDueToday > 1 ? "s" : ""}</strong> due for review today.
              Spaced repetition helps move knowledge into long-term memory.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.hash = "#schedule"}
            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-all"
          >
            View Schedule
          </motion.button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
