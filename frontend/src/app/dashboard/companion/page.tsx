"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SidebarLayout } from "@/components/SidebarLayout";
import { GlassCard } from "@/components/GlassCard";
import { StrategyChat } from "@/components/StrategyChat";
import { DigitalTwinProfile } from "@/components/DigitalTwinProfile";

export default function CompanionPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "profile">("chat");

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
          }
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#080f1e] flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Loading AI companion...</p>
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
            <h1 className="text-3xl font-bold text-slate-50 mb-2">AI Companion</h1>
            <p className="text-slate-400 text-sm">Personalized study strategies powered by Claude AI</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              💬 Study Chat
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "profile"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👤 Your Profile
            </button>
          </div>

          {/* Content */}
          {activeTab === "chat" && (
            <GlassCard className="p-6">
              {syllabusId ? (
                <StrategyChat syllabusId={syllabusId} userId={user?.id || "anonymous"} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400 mb-4">No active study plan</p>
                  <p className="text-sm text-slate-500">
                    Upload a syllabus and generate a study plan to chat with your AI companion.
                  </p>
                </div>
              )}
            </GlassCard>
          )}

          {activeTab === "profile" && (
            <GlassCard className="p-6">
              {syllabusId ? (
                <DigitalTwinProfile syllabusId={syllabusId} userId={user?.id || "anonymous"} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400 mb-4">No profile data yet</p>
                  <p className="text-sm text-slate-500">
                    Your profile will build as you study and complete sessions.
                  </p>
                </div>
              )}
            </GlassCard>
          )}
        </motion.div>
      </div>
    </SidebarLayout>
  );
}
