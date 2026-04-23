"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface GoogleCalendarSyncProps {
  planId: string;
  userId?: string;
}

export function GoogleCalendarSync({ planId, userId }: GoogleCalendarSyncProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingClashes, setIsCheckingClashes] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [clashes, setClashes] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showClashes, setShowClashes] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch(
        `${apiBase}/api/plan/calendar/auth-url?userId=${userId}`
      );
      const data = await response.json();

      if (data.ok && data.authUrl) {
        // Open Google OAuth in new window
        const authWindow = window.open(data.authUrl, "_blank");
        
        // Listen for the callback (user needs to manually paste the code)
        const code = prompt(
          "After authorizing, Google will redirect you. Copy the 'code' parameter from the URL and paste it here:"
        );

        if (code) {
          const callbackResponse = await fetch(
            `${apiBase}/api/plan/calendar/callback`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, userId }),
            }
          );

          const callbackData = await callbackResponse.json();

          if (callbackData.ok) {
            setIsConnected(true);
            setSyncStatus("✅ Google Calendar connected successfully!");
          } else {
            setSyncStatus("❌ Failed to connect: " + callbackData.error);
          }
        }
      }
    } catch (error) {
      console.error("Google Calendar connection error:", error);
      setSyncStatus("❌ Connection failed");
    }
  };

  const handleSyncToCalendar = async () => {
    setIsSyncing(true);
    setSyncStatus("");
    setClashes([]);
    setSuggestions([]);

    try {
      const response = await fetch(
        `${apiBase}/api/plan/${planId}/calendar/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        if (data.hasClashes) {
          setClashes(data.clashes);
          setSuggestions(data.suggestions);
          setShowClashes(true);
          setSyncStatus(
            `⚠️ ${data.clashCount} session(s) clash with existing events`
          );
        } else {
          setSyncStatus(`✅ ${data.message}`);
          setIsConnected(true);
        }
      } else {
        setSyncStatus("❌ Sync failed: " + data.error);
      }
    } catch (error) {
      console.error("Calendar sync error:", error);
      setSyncStatus("❌ Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckClashes = async () => {
    setIsCheckingClashes(true);
    setSyncStatus("");

    try {
      const response = await fetch(
        `${apiBase}/api/plan/${planId}/calendar/clashes?userId=${userId}`
      );
      const data = await response.json();

      if (data.ok) {
        setClashes(data.clashes);
        setSuggestions(data.suggestions);
        setShowClashes(true);

        if (data.hasClashes) {
          setSyncStatus(
            `⚠️ Found ${data.clashCount} clash(es) with your calendar`
          );
        } else {
          setSyncStatus("✅ No clashes detected! Your schedule is clear.");
        }
      } else {
        setSyncStatus("❌ Clash check failed: " + data.error);
      }
    } catch (error) {
      console.error("Clash check error:", error);
      setSyncStatus("❌ Clash check failed");
    } finally {
      setIsCheckingClashes(false);
    }
  };

  return (
    <GlassCard className="w-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📅</span>
        <div>
          <h3 className="text-xl font-bold text-slate-50">
            Google Calendar Sync
          </h3>
          <p className="text-sm text-slate-400">
            Sync your study plan with Google Calendar
          </p>
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <p className="text-sm text-indigo-200 mb-3">
              Connect your Google Calendar to:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-indigo-400">✓</span> Sync study sessions
                as calendar events
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400">✓</span> Detect scheduling
                conflicts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400">✓</span> Get reminders before
                study sessions
              </li>
            </ul>
          </div>

          <GradientButton
            label="Connect Google Calendar"
            onClick={handleConnectGoogle}
            className="w-full"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3">
            <GradientButton
              label={isSyncing ? "Syncing..." : "Sync to Calendar"}
              onClick={handleSyncToCalendar}
              disabled={isSyncing}
              className="flex-1"
            />
            <button
              onClick={handleCheckClashes}
              disabled={isCheckingClashes}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isCheckingClashes ? "Checking..." : "Check Clashes"}
            </button>
          </div>

          {syncStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                syncStatus.includes("❌")
                  ? "bg-red-500/10 border-red-500/30 text-red-200"
                  : syncStatus.includes("⚠️")
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-200"
                  : "bg-green-500/10 border-green-500/30 text-green-200"
              }`}
            >
              <p className="text-sm">{syncStatus}</p>
            </motion.div>
          )}

          {showClashes && clashes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3 mt-4"
            >
              <h4 className="text-sm font-semibold text-orange-300">
                Scheduling Conflicts Detected:
              </h4>

              {suggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-200 mb-1">
                        {suggestion.topic}
                      </p>
                      <p className="text-xs text-slate-400 mb-2">
                        Original: {suggestion.originalTime}
                      </p>
                      <p className="text-xs text-orange-300 mb-2">
                        Clashes with: {suggestion.clashingWith.join(", ")}
                      </p>

                      {suggestion.suggestedSlots &&
                        suggestion.suggestedSlots.length > 0 && (
                          <div>
                            <p className="text-xs text-green-300 mb-1">
                              Suggested alternatives:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {suggestion.suggestedSlots.map(
                                (slot: any, slotIdx: number) => (
                                  <span
                                    key={slotIdx}
                                    className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-200"
                                  >
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
