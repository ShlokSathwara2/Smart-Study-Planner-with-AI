"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StudyPatterns_1 = require("../models/StudyPatterns");
const insightManager_1 = require("../utils/insightManager");
const router = (0, express_1.Router)();
// GET /api/study-insights/:syllabusId - Get latest patterns and insights
router.get('/:syllabusId', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const patterns = await StudyPatterns_1.StudyPatternsModel.findOne({ userId, syllabusId })
            .sort({ lastUpdated: -1 })
            .lean();
        if (!patterns) {
            res.json({
                ok: true,
                message: 'No patterns found. Need at least 14 days of data.',
                requiresAnalysis: true,
                minDaysRequired: 14,
            });
            return;
        }
        res.json({
            ok: true,
            patterns: {
                timePatterns: patterns.timePatterns,
                focusPatterns: patterns.focusPatterns,
                productivityPatterns: patterns.productivityPatterns,
                learningPatterns: patterns.learningPatterns,
                weeklyInsights: patterns.weeklyInsights.slice(0, 3), // Top 3 insights
                dataQualityScore: patterns.dataQualityScore,
                totalSessionsAnalyzed: patterns.totalSessionsAnalyzed,
                totalHoursTracked: Math.round(patterns.totalHoursTracked),
                lastUpdated: patterns.lastUpdated,
            },
        });
    }
    catch (err) {
        console.error('Get study insights error:', err);
        res.status(500).json({ error: 'Failed to load study insights' });
    }
});
// POST /api/study-insights/:syllabusId/analyze - Trigger pattern analysis
router.post('/:syllabusId/analyze', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const { userId = 'anonymous', minDays = 14 } = req.body;
        // Check if we have enough data
        const patterns = await (0, insightManager_1.updateStudyPatterns)(userId, syllabusId, minDays);
        res.json({
            ok: true,
            patterns,
            message: 'Study patterns analyzed successfully',
        });
    }
    catch (err) {
        if (err.message.includes('Insufficient data')) {
            res.status(400).json({
                error: 'Insufficient data',
                message: err.message,
                minDaysRequired: 14,
            });
            return;
        }
        console.error('Analyze patterns error:', err);
        res.status(500).json({ error: 'Failed to analyze study patterns' });
    }
});
// GET /api/study-insights/:syllabusId/daily-message - Get today's coach message
router.get('/:syllabusId/daily-message', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const dailyMessage = await (0, insightManager_1.getOrCreateDailyMessage)(userId, syllabusId);
        res.json({
            ok: true,
            message: dailyMessage,
            isFresh: !dailyMessage.date || new Date(dailyMessage.date).toDateString() === new Date().toDateString(),
        });
    }
    catch (err) {
        console.error('Get daily message error:', err);
        res.status(500).json({ error: 'Failed to load daily coach message' });
    }
});
// GET /api/study-insights/:syllabusId/focus-summary - Get quick focus stats
router.get('/:syllabusId/focus-summary', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const patterns = await StudyPatterns_1.StudyPatternsModel.findOne({ userId, syllabusId })
            .select('focusPatterns totalSessionsAnalyzed dataQualityScore')
            .lean();
        if (!patterns) {
            res.json({
                ok: true,
                summary: {
                    averageFocusDuration: 0,
                    optimalSessionLength: 25,
                    dropOffPoint: 40,
                    deepWorkPercentage: 0,
                    sessionsCount: 0,
                },
            });
            return;
        }
        res.json({
            ok: true,
            summary: {
                averageFocusDuration: patterns.focusPatterns.averageFocusDuration,
                optimalSessionLength: patterns.focusPatterns.optimalSessionLength,
                dropOffPoint: patterns.focusPatterns.dropOffPoint,
                deepWorkPercentage: patterns.focusPatterns.deepWorkPercentage,
                sessionsCount: patterns.totalSessionsAnalyzed,
                dataQuality: patterns.dataQualityScore,
            },
        });
    }
    catch (err) {
        console.error('Get focus summary error:', err);
        res.status(500).json({ error: 'Failed to load focus summary' });
    }
});
exports.default = router;
