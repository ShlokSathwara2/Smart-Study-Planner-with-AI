"use client";

import { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  href?: string;
}

export function GradientButton({ label, className = "", ...props }: GradientButtonProps) {
  const { href, ...buttonProps } = props;
  const inner = (
    <motion.button
      type={buttonProps.type ?? "button"}
      whileHover={{ y: -1, boxShadow: "0 18px 45px rgba(15,23,42,0.65)" }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-2 text-sm font-medium text-slate-50 ${className}`}
      {...(buttonProps as any)}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400" />
      <span className="absolute inset-0 opacity-0 mix-blend-screen blur-lg transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative z-10">{label}</span>
    </motion.button>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {inner}
      </Link>
    );
  }

  return (
    inner
  );
}

