"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";

export default function SubjectsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syllabus, setSyllabus] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && user) {
      if (!user.unsafeMetadata?.onboarded) {
        router.replace("/onboarding");
      }
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/plan/latest?userId=${user.id}&syllabusId=*`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.plan) {
            setSyllabusId(data.plan.syllabusId);
            // Fetch syllabus details
            return fetch(`/api/syllabus/${data.plan.syllabusId}?userId=${user.id}`);
          }
          throw new Error("No plan found");
        })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.syllabus) {
            setSyllabus(data.syllabus);
          }
        })
        .catch(() => {
          // Silently fail - no syllabus loaded yet
        })
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Loading subjects...</p>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 space-y-6"
        >
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Learning Map</h1>
            <p className="text-slate-400 text-sm">See how your topics connect and depend on each other</p>
          </div>

          {/* Knowledge Graph */}
          <GlassCard className="p-6">
            {syllabusId ? (
              <KnowledgeGraph syllabusId={syllabusId} userId={user?.id || "anonymous"} />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No subjects loaded</p>
                <p className="text-sm text-slate-500">
                  Upload a syllabus to see your learning map and topic connections.
                </p>
              </div>
            )}
          </GlassCard>

          {/* Syllabus Overview */}
          {syllabus && (
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-slate-50 mb-4">Syllabus Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Topics</p>
                  <p className="text-2xl font-bold text-indigo-400">{syllabus.topics?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Total Pages</p>
                  <p className="text-2xl font-bold text-violet-400">{syllabus.totalPages || 0}</p>
                </div>
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </SidebarLayout>
  );
}
