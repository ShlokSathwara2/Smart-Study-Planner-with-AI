"use client";

import { ReactNode, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

type GlowColor = "cyan" | "purple" | "pink" | "indigo" | "emerald" | "teal" | "default";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  glowColor?: GlowColor;
  onClick?: () => void;
  noHover?: boolean;
}

const glowColorMap: Record<GlowColor, { border: string; shadow: string; bg: string; accent: string }> = {
  cyan:    { border: "rgba(34,211,238,0.35)",    shadow: "rgba(34,211,238,0.18)",  bg: "rgba(34,211,238,0.06)",    accent: "rgba(34,211,238,0.7)" },
  purple:  { border: "rgba(139,92,246,0.35)",    shadow: "rgba(139,92,246,0.18)",  bg: "rgba(139,92,246,0.06)",    accent: "rgba(139,92,246,0.7)" },
  pink:    { border: "rgba(236,72,153,0.35)",    shadow: "rgba(236,72,153,0.18)",  bg: "rgba(236,72,153,0.06)",    accent: "rgba(236,72,153,0.7)" },
  indigo:  { border: "rgba(99,102,241,0.35)",    shadow: "rgba(99,102,241,0.18)",  bg: "rgba(99,102,241,0.06)",    accent: "rgba(99,102,241,0.7)" },
  emerald: { border: "rgba(52,211,153,0.35)",    shadow: "rgba(52,211,153,0.18)",  bg: "rgba(52,211,153,0.06)",    accent: "rgba(52,211,153,0.7)" },
  teal:    { border: "rgba(20,184,166,0.35)",    shadow: "rgba(20,184,166,0.18)",  bg: "rgba(20,184,166,0.06)",    accent: "rgba(20,184,166,0.7)" },
  default: { border: "rgba(0,0,0,0.06)",         shadow: "rgba(0,0,0,0.06)",       bg: "rgba(20,184,166,0.04)",    accent: "rgba(20,184,166,0.5)" },
};

export function GlassCard({
  children,
  className = "",
  glow = false,
  glowColor = "default",
  onClick,
  noHover = false,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 180, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 180, damping: 28 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [noHover ? 0 : 2, noHover ? 0 : -2]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [noHover ? 0 : -2, noHover ? 0 : 2]);

  const colors = glow ? glowColorMap[glowColor] : glowColorMap.default;

  const spotlightBg = useTransform(
    [springX, springY],
    ([x, y]: number[]) =>
      `radial-gradient(280px circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, ${colors.bg}, transparent 70%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width - 0.5);
    mouseY.set((e.clientY - r.top) / r.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${isHovered && !noHover ? colors.border : "rgba(0,0,0,0.05)"}`,
        boxShadow: isHovered && !noHover
          ? `0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px ${colors.border}`
          : "0 2px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      whileHover={noHover ? {} : { y: -3 }}
      whileTap={onClick ? { scale: 0.985 } : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      onClick={onClick}
    >
      {/* Spotlight */}
      {!noHover && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: spotlightBg, opacity: isHovered ? 1 : 0, transition: "opacity 0.3s" }}
        />
      )}

      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)`,
          opacity: isHovered ? 0.6 : 0.15,
        }}
      />

      {children}
    </motion.div>
  );
}
