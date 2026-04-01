"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

const baseClasses =
  "rounded-2xl border border-white/10 bg-white/5 bg-clip-padding shadow-xl shadow-black/40 backdrop-blur-xl";

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <motion.div
      className={`${baseClasses} ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.02, borderColor: "rgba(148, 163, 184, 0.6)" }}
    >
      {children}
    </motion.div>
  );
}

