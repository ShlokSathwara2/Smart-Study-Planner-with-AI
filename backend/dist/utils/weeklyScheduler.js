"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWeeklyDigitalTwinUpdate = runWeeklyDigitalTwinUpdate;
exports.scheduleWeeklyDigitalTwinJob = scheduleWeeklyDigitalTwinJob;
const DigitalTwin_1 = require("../models/DigitalTwin");
const StudyPlan_1 = require("../models/StudyPlan");
const digitalTwinGenerator_1 = require("../utils/digitalTwinGenerator");
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
/**
 * Weekly job to update all digital twins with fresh data
 * Should be called once per week (e.g., every Sunday at midnight)
 */
async function runWeeklyDigitalTwinUpdate() {
    console.log('🔄 Starting weekly digital twin update job...');
    const stats = {
        updated: 0,
        skipped: 0,
        errors: 0,
    };
    try {
        // Get all unique user-syllabus combinations
        const allTwins = await DigitalTwin_1.DigitalTwinModel.aggregate([
            {
                $group: {
                    _id: {
                        userId: '$userId',
                        syllabusId: '$syllabusId',
                    },
                    latestId: { $first: '$_id' },
                    latestUpdate: { $max: '$updatedAt' },
                },
            },
        ]);
        console.log(`Found ${allTwins.length} digital twins to process`);
        for (const twinGroup of allTwins) {
            const { userId, syllabusId } = twinGroup._id;
            const lastUpdate = new Date(twinGroup.latestUpdate);
            const now = new Date();
            // Check if at least 7 days have passed
            const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
            if (timeSinceUpdate < ONE_WEEK_MS) {
                console.log(`⏭️  Skipping ${userId}/${syllabusId} - only ${Math.round(timeSinceUpdate / (1000 * 60 * 60 * 24))} days since last update`);
                stats.skipped++;
                continue;
            }
            try {
                console.log(`📊 Updating digital twin for ${userId}/${syllabusId} (${Math.round(timeSinceUpdate / (1000 * 60 * 60 * 24))} days old)`);
                await (0, digitalTwinGenerator_1.createOrUpdateDigitalTwin)(userId, syllabusId);
                stats.updated++;
                // Small delay to avoid overwhelming APIs
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            catch (error) {
                console.error(`❌ Error updating digital twin for ${userId}/${syllabusId}:`, error);
                stats.errors++;
            }
        }
        // Also check for users with study plans but no digital twin
        const plansWithoutTwins = await StudyPlan_1.StudyPlanModel.aggregate([
            {
                $group: {
                    _id: {
                        userId: '$userId',
                        syllabusId: '$syllabusId',
                    },
                },
            },
        ]);
        for (const planGroup of plansWithoutTwins) {
            const { userId, syllabusId } = planGroup._id;
            const existingTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
                .sort({ createdAt: -1 })
                .lean();
            if (!existingTwin) {
                try {
                    console.log(`✨ Creating new digital twin for ${userId}/${syllabusId}`);
                    await (0, digitalTwinGenerator_1.createOrUpdateDigitalTwin)(userId, syllabusId);
                    stats.updated++;
                }
                catch (error) {
                    console.error(`❌ Error creating digital twin for ${userId}/${syllabusId}:`, error);
                    stats.errors++;
                }
            }
        }
        console.log(`✅ Weekly digital twin update complete: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
        return stats;
    }
    catch (error) {
        console.error('❌ Weekly digital twin update job failed:', error);
        throw error;
    }
}
/**
 * Schedule the weekly job to run every Sunday at midnight
 * In production, use a proper cron scheduler like node-cron
 */
function scheduleWeeklyDigitalTwinJob() {
    console.log('📅 Scheduling weekly digital twin update job...');
    // Calculate time until next Sunday midnight
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(0, 0, 0, 0);
    const timeUntilSunday = nextSunday.getTime() - now.getTime();
    console.log(`Next run: ${nextSunday.toLocaleString()} (${Math.round(timeUntilSunday / (1000 * 60 * 60))} hours)`);
    // Initial delay until first run
    setTimeout(() => {
        runWeeklyDigitalTwinUpdate();
        // Then run every week
        setInterval(() => {
            runWeeklyDigitalTwinUpdate();
        }, ONE_WEEK_MS);
    }, timeUntilSunday);
}
