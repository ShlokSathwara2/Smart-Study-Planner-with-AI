"use client";

import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = "", glow = false, onClick }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 30 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-3, 3]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl shadow-black/40 overflow-hidden transition-shadow duration-300 hover:shadow-2xl hover:shadow-black/50 ${glow ? "hover:border-indigo-500/30" : "hover:border-white/20"} ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Spotlight glow that follows mouse */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [springX, springY],
            ([x, y]: number[]) =>
              `radial-gradient(300px circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(99,102,241,0.07), transparent 70%)`
          ),
        }}
      />
      {/* Top edge shimmer on hover */}
      {glow && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      )}
      {children}
    </motion.div>
  );
}


