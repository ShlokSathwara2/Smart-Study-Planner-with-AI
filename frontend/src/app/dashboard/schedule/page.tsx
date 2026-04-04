"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { CalendarTimeline } from "@/components/CalendarTimeline";

export default function SchedulePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
            setPlanId(data.plan._id);
            setSyllabusId(data.plan.syllabusId);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [user?.id]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Loading schedule...</p>
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
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Study Schedule</h1>
            <p className="text-slate-400 text-sm">Your personalized study timeline</p>
          </div>

          {/* Calendar Timeline */}
          <GlassCard className="p-6">
            {planId && syllabusId ? (
              <CalendarTimeline planId={planId} syllabusId={syllabusId} userId={user?.id || "anonymous"} />
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No study plan yet</p>
                <p className="text-sm text-slate-500">
                  Upload a syllabus and generate a plan to see your schedule here.
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </SidebarLayout>
  );
}
