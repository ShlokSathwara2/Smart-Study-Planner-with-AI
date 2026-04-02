"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { SidebarLayout } from "@/components/SidebarLayout";
import { SyllabusUploader } from "@/components/SyllabusUploader";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { CalendarTimeline } from "@/components/CalendarTimeline";
import { FocusTimer } from "@/components/FocusTimer";
import { SessionAnalytics } from "@/components/SessionAnalytics";
import { CognitiveLoadTracker } from "@/components/CognitiveLoadTracker";
import { GradientButton } from "@/components/GradientButton";

type Tab = "upload" | "graph" | "schedule" | "focus" | "analytics" | "cognitive";

export default function DashboardPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [syllabusId, setSyllabusId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("syllabus", file);
      formData.append("userId", user?.id || "anonymous");
      
      const response = await fetch("/api/syllabus/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      if (data.ok && data.syllabus) {
        setSyllabusId(data.syllabus._id);
        
        // Generate topic graph after syllabus upload
        const graphResponse = await fetch(`/api/topic-graph/from-syllabus/${data.syllabus._id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id }),
        });
        
        if (graphResponse.ok) {
          console.log("Topic graph generated");
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "upload":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                Upload Your Syllabus
              </h1>
              <p className="text-slate-400">
                AI will analyze it and create your personalized study plan
              </p>
            </div>
            <SyllabusUploader onFileUpload={handleFileUpload} />
          </div>
        );
        
      case "graph":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                Learning Path Map
              </h1>
              <p className="text-slate-400">
                Visualize topic dependencies and optimal learning order
              </p>
            </div>
            <KnowledgeGraph 
              syllabusId={syllabusId || undefined} 
              userId={user?.id} 
            />
          </div>
        );
        
      case "schedule":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                Your Study Schedule
              </h1>
              <p className="text-slate-400">
                Track your day-by-day study plan and progress
              </p>
            </div>
            <CalendarTimeline 
              planId={planId || undefined} 
              userId={user?.id} 
            />
          </div>
        );
        
      case "focus":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                Focus Timer
              </h1>
              <p className="text-slate-400">
                Pomodoro technique with distraction tracking
              </p>
            </div>
            <FocusTimer 
              userId={user?.id} 
              planId={planId || undefined} 
            />
          </div>
        );
        
      case "analytics":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                Session Analytics
              </h1>
              <p className="text-slate-400">
                Insights into your study habits and performance
              </p>
            </div>
            <SessionAnalytics userId={user?.id} />
          </div>
        );
        
      case "cognitive":
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-50 mb-2">
                🧠 Cognitive Load Analyzer
              </h1>
              <p className="text-slate-400">
                AI analyzes topic difficulty and recommends optimizations
              </p>
            </div>
            <CognitiveLoadTracker 
              userId={user?.id}
              syllabusId={syllabusId || undefined}
            />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <SidebarLayout>
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: "upload", label: "📤 Upload", icon: "📤" },
          { id: "graph", label: "🗺️ Graph", icon: "🗺️" },
          { id: "schedule", label: "📅 Schedule", icon: "📅" },
          { id: "focus", label: "⏱️ Focus", icon: "⏱️" },
          { id: "analytics", label: "📊 Analytics", icon: "📊" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {renderContent()}
    </SidebarLayout>
  );
}
