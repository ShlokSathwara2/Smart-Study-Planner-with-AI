"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudyPatterns = updateStudyPatterns;
exports.getOrCreateDailyMessage = getOrCreateDailyMessage;
const StudyPatterns_1 = require("../models/StudyPatterns");
const patternAnalyzer_1 = require("./patternAnalyzer");
const dailyStudyCoach_1 = require("./dailyStudyCoach");
async function updateStudyPatterns(userId, syllabusId, minDays = 14) {
    try {
        // Analyze patterns
        const analyzed = await (0, patternAnalyzer_1.analyzeStudyPatterns)(userId, syllabusId, minDays);
        // Get or create patterns document
        let patterns = await StudyPatterns_1.StudyPatternsModel.findOne({ userId, syllabusId });
        if (!patterns) {
            // Create new
            patterns = await StudyPatterns_1.StudyPatternsModel.create({
                userId,
                syllabusId,
                ...analyzed,
                analysisStartDate: new Date(Date.now() - minDays * 24 * 60 * 60 * 1000),
                totalSessionsAnalyzed: 0,
                totalHoursTracked: 0,
                dataQualityScore: Math.min(100, (analyzed.weeklyInsights.length / 4) * 100),
            });
        }
        else {
            // Update existing
            patterns.set(analyzed);
            patterns.lastUpdated = new Date();
            // Update data quality score based on amount of data
            const sessionsCount = analyzed.weeklyInsights.length;
            patterns.dataQualityScore = Math.min(100, Math.round((sessionsCount / 10) * 100));
            await patterns.save();
        }
        return patterns;
    }
    catch (error) {
        if (error.message.includes('Insufficient data')) {
            throw error;
        }
        throw error;
    }
}
async function getOrCreateDailyMessage(userId, syllabusId) {
    // Check if we already have a message for today
    const patterns = await StudyPatterns_1.StudyPatternsModel.findOne({ userId, syllabusId }).lean();
    if (!patterns) {
        // No patterns yet, generate fresh message
        const coachMessage = await (0, dailyStudyCoach_1.generateDailyCoachMessage)(userId, syllabusId);
        await (0, dailyStudyCoach_1.saveDailyCoachMessage)(userId, syllabusId, coachMessage);
        return coachMessage;
    }
    // Check for today's message
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessage = patterns.dailyCoachMessages?.find(m => {
        const msgDate = new Date(m.date);
        msgDate.setHours(0, 0, 0, 0);
        return msgDate.getTime() === today.getTime();
    });
    if (todayMessage) {
        return todayMessage;
    }
    // Generate new message for today
    const coachMessage = await (0, dailyStudyCoach_1.generateDailyCoachMessage)(userId, syllabusId);
    await (0, dailyStudyCoach_1.saveDailyCoachMessage)(userId, syllabusId, coachMessage);
    return coachMessage;
}
