"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DigitalTwin_1 = require("../models/DigitalTwin");
const digitalTwinGenerator_1 = require("../utils/digitalTwinGenerator");
const router = (0, express_1.Router)();
// GET /api/digital-twin/:syllabusId - Get user's digital twin profile
router.get('/:syllabusId', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const digitalTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
            .sort({ createdAt: -1 })
            .lean();
        if (!digitalTwin) {
            res.json({
                ok: true,
                message: 'No digital twin found. Generate one first.',
                requiresGeneration: true,
            });
            return;
        }
        res.json({
            ok: true,
            digitalTwin,
        });
    }
    catch (err) {
        console.error('Get digital twin error:', err);
        res.status(500).json({ error: 'Failed to load digital twin' });
    }
});
// POST /api/digital-twin/:syllabusId/generate - Generate/update digital twin
router.post('/:syllabusId/generate', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const { userId = 'anonymous', forceRegenerate = false } = req.body;
        // Check if recent digital twin exists (within 7 days)
        if (!forceRegenerate) {
            const existingTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
                .sort({ createdAt: -1 })
                .lean();
            if (existingTwin) {
                const daysSinceUpdate = (Date.now() - new Date(existingTwin.updatedAt).getTime()) /
                    (1000 * 60 * 60 * 24);
                if (daysSinceUpdate < 7) {
                    res.json({
                        ok: true,
                        digitalTwin: existingTwin,
                        message: 'Using existing digital twin (updated recently)',
                    });
                    return;
                }
            }
        }
        // Generate new digital twin
        const digitalTwin = await (0, digitalTwinGenerator_1.createOrUpdateDigitalTwin)(userId, syllabusId);
        res.json({
            ok: true,
            digitalTwin,
            message: 'Digital twin generated successfully',
        });
    }
    catch (err) {
        console.error('Generate digital twin error:', err);
        res.status(500).json({ error: 'Failed to generate digital twin' });
    }
});
// GET /api/digital-twin/:syllabusId/quick-stats - Get quick stats without full profile
router.get('/:syllabusId/quick-stats', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const digitalTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
            .sort({ createdAt: -1 })
            .select('performance predictiveInsights timePatterns streakDays')
            .lean();
        if (!digitalTwin) {
            res.json({
                ok: true,
                stats: {
                    predictedExamScore: 0,
                    confidenceLevel: 0,
                    readinessTrend: 'stable',
                    focusScore: 0,
                    retentionRate: 0,
                    streakDays: 0,
                },
            });
            return;
        }
        res.json({
            ok: true,
            stats: {
                predictedExamScore: digitalTwin.predictiveInsights.predictedExamScore,
                confidenceLevel: digitalTwin.predictiveInsights.confidenceLevel,
                readinessTrend: digitalTwin.predictiveInsights.readinessTrend,
                focusScore: digitalTwin.performance.focusScore,
                retentionRate: digitalTwin.performance.retentionRate,
                streakDays: digitalTwin.timePatterns.streakDays,
                bestStudyHours: digitalTwin.timePatterns.bestStudyHours,
            },
        });
    }
    catch (err) {
        console.error('Get quick stats error:', err);
        res.status(500).json({ error: 'Failed to load quick stats' });
    }
});
// POST /api/digital-twin/:syllabusId/update-weekly - Weekly update endpoint
router.post('/:syllabusId/update-weekly', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const { userId = 'anonymous' } = req.body;
        // Check if at least 7 days since last update
        const existingTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
            .sort({ createdAt: -1 })
            .lean();
        if (existingTwin) {
            const daysSinceUpdate = (Date.now() - new Date(existingTwin.updatedAt).getTime()) /
                (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 7) {
                res.json({
                    ok: true,
                    message: `Too soon for weekly update (${Math.round(daysSinceUpdate)} days since last update)`,
                    digitalTwin: existingTwin,
                });
                return;
            }
        }
        // Generate updated digital twin
        const digitalTwin = await (0, digitalTwinGenerator_1.createOrUpdateDigitalTwin)(userId, syllabusId);
        res.json({
            ok: true,
            digitalTwin,
            message: 'Weekly digital twin update completed',
        });
    }
    catch (err) {
        console.error('Weekly update error:', err);
        res.status(500).json({ error: 'Failed to update digital twin' });
    }
});
// GET /api/digital-twin/:syllabusId/history - Get digital twin history
router.get('/:syllabusId/history', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const limit = parseInt(req.query.limit) || 10;
        const history = await DigitalTwin_1.DigitalTwinModel.find({ userId, syllabusId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('performance predictiveInsights learningPersonality aiSummary createdAt updatedAt')
            .lean();
        res.json({
            ok: true,
            history,
            count: history.length,
        });
    }
    catch (err) {
        console.error('Get digital twin history error:', err);
        res.status(500).json({ error: 'Failed to load digital twin history' });
    }
});
exports.default = router;
