"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface TopicNode { _id: string; topic: string; dependencies?: string[]; difficulty?: number; estimatedHours?: number; }
interface KnowledgeGraphProps { syllabusId?: string; userId?: string; }

const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") : "http://localhost:4000";
const DIFF_COLORS = ["#4ade80","#60a5fa","#fbbf24","#f97316","#f87171"];
const DIFF_LABELS = ["Beginner","Easy","Medium","Hard","Expert"];

export function KnowledgeGraph({ syllabusId, userId }: KnowledgeGraphProps) {
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TopicNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!syllabusId || !userId) { setLoading(false); return; }
    fetch(`${apiBase}/api/graph/by-syllabus/${syllabusId}?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.dependencies) setTopics(d.dependencies); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [syllabusId, userId]);

  // Layout: center + rings
  const getLayout = () => {
    const W = 700, H = 480, cx = W / 2, cy = H / 2;
    const positions: Record<string, { x: number; y: number }> = {};
    if (topics.length === 0) return positions;
    if (topics.length === 1) { positions[topics[0]._id] = { x: cx, y: cy }; return positions; }

    // Group by dependency depth
    const noPrereqs = topics.filter((t) => !t.dependencies || t.dependencies.length === 0);
    const hasPrereqs = topics.filter((t) => t.dependencies && t.dependencies.length > 0);
    const rings = [noPrereqs, hasPrereqs];

    rings.forEach((ring, ri) => {
      const r = ri === 0 ? 120 : 200;
      ring.forEach((t, i) => {
        const angle = (2 * Math.PI * i) / ring.length - Math.PI / 2;
        positions[t._id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
    });
    return positions;
  };

  const positions = getLayout();
  const deps = selected
    ? topics.filter((t) => selected.dependencies?.includes(t._id) || t.dependencies?.includes(selected._id))
    : [];

  if (loading) return (
    <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="h-10 w-10 mx-auto rounded-full border-2 border-violet-500 border-t-transparent" />
        <p className="text-slate-500 text-sm">Loading knowledge graph...</p>
      </div>
    </GlassCard>
  );

  if (!syllabusId) return (
    <GlassCard className="min-h-[300px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">🗺️</div>
        <p className="text-slate-300 font-medium">Upload a syllabus first</p>
        <p className="text-sm text-slate-500">The knowledge graph will appear here once your syllabus is processed</p>
      </div>
    </GlassCard>
  );

  if (topics.length === 0) return (
    <GlassCard className="min-h-[300px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-5xl">📭</div>
        <p className="text-slate-300 font-medium">No topics yet</p>
        <p className="text-sm text-slate-500">Generate a study plan to populate the learning map</p>
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-5">
      {/* Legend */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Difficulty</p>
          {DIFF_LABELS.map((l, i) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full" style={{ background: DIFF_COLORS[i], boxShadow: `0 0 6px ${DIFF_COLORS[i]}60` }} />
              <span className="text-xs text-slate-400">{l}</span>
            </div>
          ))}
          <p className="text-xs text-slate-600 ml-auto">{topics.length} topics · click to explore</p>
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Graph SVG */}
        <GlassCard className="lg:col-span-2 p-4 overflow-hidden">
          <svg ref={svgRef} viewBox="0 0 700 480" className="w-full h-auto">
            <defs>
              {topics.map((t) => {
                const di = Math.min(Math.max((t.difficulty ?? 1) - 1, 0), 4);
                const c = DIFF_COLORS[di];
                return (
                  <radialGradient key={`g-${t._id}`} id={`ng-${t._id}`} cx="50%" cy="30%" r="70%">
                    <stop offset="0%" stopColor={c} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={c} stopOpacity="0.15" />
                  </radialGradient>
                );
              })}
            </defs>

            {/* Edges */}
            {topics.flatMap((t) =>
              (t.dependencies || []).map((depId) => {
                const from = positions[t._id];
                const to = positions[depId];
                if (!from || !to) return null;
                const isHighlighted = selected && (selected._id === t._id || selected._id === depId);
                return (
                  <motion.line key={`${t._id}-${depId}`}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isHighlighted ? "rgba(165,180,252,0.6)" : "rgba(255,255,255,0.08)"}
                    strokeWidth={isHighlighted ? 1.5 : 1}
                    strokeDasharray={isHighlighted ? "none" : "4 4"}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                  />
                );
              })
            )}

            {/* Nodes */}
            {topics.map((t) => {
              const pos = positions[t._id];
              if (!pos) return null;
              const di = Math.min(Math.max((t.difficulty ?? 1) - 1, 0), 4);
              const c = DIFF_COLORS[di];
              const isSel = selected?._id === t._id;
              const isHov = hoveredId === t._id;
              const r = isSel ? 28 : isHov ? 24 : 20;
              return (
                <g key={t._id} style={{ cursor: "pointer" }}
                  onClick={() => setSelected(isSel ? null : t)}
                  onMouseEnter={() => setHoveredId(t._id)}
                  onMouseLeave={() => setHoveredId(null)}>
                  {/* Outer ring pulse */}
                  {(isSel || isHov) && (
                    <motion.circle cx={pos.x} cy={pos.y} r={r + 10} fill="none" stroke={c} strokeWidth="1" opacity={0.3}
                      animate={{ r: [r + 8, r + 16, r + 8], opacity: [0.4, 0, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} />
                  )}
                  <motion.circle cx={pos.x} cy={pos.y} r={r}
                    fill={`url(#ng-${t._id})`} stroke={c}
                    strokeWidth={isSel ? 2 : 1}
                    style={{ filter: isSel ? `drop-shadow(0 0 8px ${c})` : "none" }}
                    animate={{ r }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                  <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={isSel ? "11" : "9"} fontWeight={isSel ? "700" : "500"}>
                    {t.topic.length > 12 ? t.topic.slice(0, 11) + "…" : t.topic}
                  </text>
                </g>
              );
            })}
          </svg>
        </GlassCard>

        {/* Side panel */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected._id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
                <GlassCard glow glowColor="purple" className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-bold text-slate-100 text-base leading-snug">{selected.topic}</h3>
                    <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-300 text-lg shrink-0">✕</button>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Difficulty</p>
                      <p className="font-semibold text-sm" style={{ color: DIFF_COLORS[Math.min((selected.difficulty ?? 1) - 1, 4)] }}>
                        {DIFF_LABELS[Math.min((selected.difficulty ?? 1) - 1, 4)]}
                      </p>
                    </div>
                    {selected.estimatedHours && (
                      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Est. Time</p>
                        <p className="font-semibold text-sm text-indigo-300">{selected.estimatedHours}h</p>
                      </div>
                    )}
                    {deps.length > 0 && (
                      <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Related Topics</p>
                        <div className="space-y-1.5">
                          {deps.map((d) => (
                            <button key={d._id} onClick={() => setSelected(d)}
                              className="w-full text-left text-xs text-indigo-300 hover:text-indigo-200 py-1 flex items-center gap-1.5 transition-colors">
                              <span>→</span> {d.topic}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GlassCard className="p-5 text-center">
                  <p className="text-3xl mb-3">👆</p>
                  <p className="text-sm text-slate-400">Click any node to explore topic details and dependencies</p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Topic list */}
          <GlassCard className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">All Topics</p>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {topics.map((t) => {
                const di = Math.min(Math.max((t.difficulty ?? 1) - 1, 0), 4);
                return (
                  <button key={t._id} onClick={() => setSelected(selected?._id === t._id ? null : t)}
                    className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-all"
                    style={selected?._id === t._id
                      ? { background: "rgba(139,92,246,0.15)", color: "#c4b5fd" }
                      : { color: "#94a3b8" }}>
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: DIFF_COLORS[di], boxShadow: `0 0 4px ${DIFF_COLORS[di]}60` }} />
                    <span className="truncate">{t.topic}</span>
                    {t.estimatedHours && <span className="ml-auto text-[10px] text-slate-600 shrink-0">{t.estimatedHours}h</span>}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
