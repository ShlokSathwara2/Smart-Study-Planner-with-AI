"use client";

import { motion } from "framer-motion";

interface GradientButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "danger" | "success";
}

const VARIANTS = {
  primary: { bg: "linear-gradient(135deg, #6366f1, #8b5cf6)", shadow: "rgba(99,102,241,0.4)" },
  danger:  { bg: "linear-gradient(135deg, #ef4444, #f87171)", shadow: "rgba(239,68,68,0.35)" },
  success: { bg: "linear-gradient(135deg, #10b981, #34d399)", shadow: "rgba(16,185,129,0.35)" },
};

export function GradientButton({ label, onClick, disabled, className = "", variant = "primary" }: GradientButtonProps) {
  const v = VARIANTS[variant];
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed glass-shine ${className}`}
      style={{
        background: v.bg,
        boxShadow: `0 4px 18px ${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
    >
      {label}
    </motion.button>
  );
}
