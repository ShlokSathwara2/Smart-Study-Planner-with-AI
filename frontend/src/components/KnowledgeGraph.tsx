"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface TopicNode {
  _id: string;
  topic: string;
  dependencies?: string[];
  difficulty?: number;
  estimatedHours?: number;
}

interface KnowledgeGraphProps {
  syllabusId?: string;
  userId?: string;
}

export function KnowledgeGraph({ syllabusId, userId }: KnowledgeGraphProps) {
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);

  useEffect(() => {
    if (!syllabusId || !userId) return;
    
    const fetchTopics = async () => {
      try {
        const response = await fetch(`/api/topic-graph/by-syllabus/${syllabusId}?userId=${userId}`);
        const data = await response.json();
        if (data.ok && data.dependencies) {
          setTopics(data.dependencies);
        }
      } catch (error) {
        console.error("Failed to fetch topics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [syllabusId, userId]);

  // Calculate node positions in a circular layout
  const getNodePositions = () => {
    const centerX = 400;
    const centerY = 300;
    const radius = 200;
    const angleStep = (2 * Math.PI) / topics.length;

    return topics.map((topic, index) => {
      const angle = index * angleStep - Math.PI / 2;
      return {
        ...topic,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  };

  const positionedNodes = getNodePositions();

  // Check if a topic has all dependencies met
  const areDependenciesMet = (topic: TopicNode) => {
    if (!topic.dependencies || topic.dependencies.length === 0) return true;
    const completedTopics = topics.filter(t => t.difficulty === 0).map(t => t.topic);
    return topic.dependencies.every(dep => 
      completedTopics.some(completed => completed.toLowerCase().includes(dep.toLowerCase()))
    );
  };

  const getNodeColor = (topic: TopicNode) => {
    if (topic.difficulty === 0) return "#22C55E"; // Completed - green
    if (!areDependenciesMet(topic)) return "#EF4444"; // Blocked - red
    return "#6366F1"; // Available - indigo
  };

  if (loading) {
    return (
      <GlassCard className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Loading knowledge graph...</p>
        </div>
      </GlassCard>
    );
  }

  if (topics.length === 0) {
    return (
      <GlassCard className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-slate-400">No topics mapped yet</p>
          <p className="text-sm text-slate-500 mt-2">Upload your syllabus to generate the knowledge graph</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-slate-50">Learning Path Map</h2>
        <p className="text-sm text-slate-400 mt-1">
          Visualize topic dependencies and recommended learning order
        </p>
      </div>

      <div className="relative h-[600px] bg-gradient-to-b from-white/[0.02] to-transparent">
        <svg width="100%" height="100%" viewBox="0 0 800 600" className="absolute inset-0">
          {/* Draw dependency lines */}
          {positionedNodes.map((node, index) => {
            if (!node.dependencies || node.dependencies.length === 0) return null;
            
            return node.dependencies.map((depName) => {
              const parentNode = positionedNodes.find(n => 
                n.topic.toLowerCase().includes(depName.toLowerCase())
              );
              
              if (!parentNode) return null;
              
              const isBlocked = !areDependenciesMet(node);
              
              return (
                <line
                  key={`${node._id}-${depName}`}
                  x1={parentNode.x}
                  y1={parentNode.y}
                  x2={node.x}
                  y2={node.y}
                  stroke={isBlocked ? "#EF4444" : "#6366F1"}
                  strokeWidth="2"
                  strokeOpacity="0.4"
                  strokeDasharray={isBlocked ? "5,5" : "none"}
                />
              );
            });
          })}
        </svg>

        {/* Draw nodes */}
        {positionedNodes.map((node) => {
          const isCompleted = node.difficulty === 0;
          const isBlocked = !areDependenciesMet(node);
          
          return (
            <motion.div
              key={node._id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="absolute cursor-pointer"
              style={{
                left: node.x - 75,
                top: node.y - 20,
              }}
              onClick={() => setSelectedTopic(node)}
              whileHover={{ scale: 1.05 }}
            >
              <div
                className={`
                  px-4 py-2 rounded-lg border-2 backdrop-blur-sm
                  ${isCompleted 
                    ? "bg-green-500/20 border-green-500" 
                    : isBlocked 
                      ? "bg-red-500/20 border-red-500" 
                      : "bg-indigo-500/20 border-indigo-500"
                  }
                `}
              >
                <p className="text-xs font-medium text-slate-100 whitespace-nowrap">
                  {node.topic.length > 25 ? node.topic.substring(0, 25) + "..." : node.topic}
                </p>
                {node.estimatedHours && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ~{node.estimatedHours}h
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-white/10 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-slate-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-400">Blocked</span>
        </div>
      </div>

      {/* Topic Details Modal */}
      {selectedTopic && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTopic(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-50">{selectedTopic.topic}</h3>
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      selectedTopic.difficulty === 0
                        ? "bg-green-500"
                        : !areDependenciesMet(selectedTopic)
                          ? "bg-red-500"
                          : "bg-indigo-500"
                    }`}
                  />
                  <span className="text-sm text-slate-200">
                    {selectedTopic.difficulty === 0
                      ? "Completed"
                      : !areDependenciesMet(selectedTopic)
                        ? "Blocked by prerequisites"
                        : "Ready to learn"}
                  </span>
                </div>
              </div>
              
              {selectedTopic.estimatedHours && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Estimated Time</p>
                  <p className="text-sm text-slate-200">~{selectedTopic.estimatedHours} hours</p>
                </div>
              )}
              
              {selectedTopic.dependencies && selectedTopic.dependencies.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Requires</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTopic.dependencies.map((dep, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-white/10 rounded text-slate-300"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </GlassCard>
  );
}
