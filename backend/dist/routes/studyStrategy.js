"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StudyPlan_1 = require("../models/StudyPlan");
const studyStrategyGenerator_1 = require("../utils/studyStrategyGenerator");
const router = (0, express_1.Router)();
// POST /api/study-strategy/generate - Generate AI strategy
router.post('/generate', async (req, res) => {
    try {
        const { userId, syllabusId, query, examDate, availableHoursPerDay } = req.body;
        if (!userId || !syllabusId || !query) {
            res.status(400).json({ error: 'Missing required fields: userId, syllabusId, and query are required' });
            return;
        }
        const strategy = await (0, studyStrategyGenerator_1.generateStudyStrategy)({
            userId,
            syllabusId,
            query,
            examDate,
            availableHoursPerDay,
        });
        res.json({
            ok: true,
            strategy,
            message: 'Study strategy generated successfully',
        });
    }
    catch (error) {
        console.error('Strategy generation error:', error);
        res.status(500).json({
            error: 'Failed to generate strategy',
            details: error.message,
        });
    }
});
// POST /api/study-strategy/approve - Approve and apply strategy
router.post('/approve', async (req, res) => {
    try {
        const { userId, syllabusId, strategy } = req.body;
        if (!userId || !syllabusId || !strategy) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Get or create study plan
        let plan = await StudyPlan_1.StudyPlanModel.findOne({ userId, syllabusId });
        if (!plan) {
            // Calculate exam date from strategy
            const examDate = new Date();
            examDate.setDate(examDate.getDate() + strategy.totalDays);
            plan = await StudyPlan_1.StudyPlanModel.create({
                userId,
                syllabusId,
                examDate: examDate.toISOString().split('T')[0], // YYYY-MM-DD format
                dailyHours: strategy.dailyPlan[0]?.estimatedHours || 2,
                sessions: [],
            });
        }
        else {
            // Clear existing planned sessions (keep only completed ones)
            plan.sessions = plan.sessions.filter((s) => s.status === 'done');
        }
        // Convert strategy to sessions
        const newSessions = strategy.dailyPlan.flatMap(day => day.topics.map(topic => ({
            topic,
            date: day.date,
            estimatedMinutes: Math.round(day.estimatedHours * 60),
            status: 'planned',
            priorityLevel: strategy.priorityTopics.includes(topic) ? 'high' : 'normal',
            notes: `${day.focus}. Tip: ${day.tips}`,
        })));
        plan.sessions.push(...newSessions);
        await plan.save();
        res.json({
            ok: true,
            message: `Strategy approved! ${newSessions.length} sessions scheduled.`,
            sessionsAdded: newSessions.length,
        });
    }
    catch (error) {
        console.error('Strategy approval error:', error);
        res.status(500).json({
            error: 'Failed to approve strategy',
            details: error.message,
        });
    }
});
// GET /api/study-strategy/:syllabusId/latest - Get latest generated strategy
router.get('/:syllabusId/latest', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const userId = req.query.userId || 'anonymous';
        const plan = await StudyPlan_1.StudyPlanModel.findOne({ userId, syllabusId }).lean();
        if (!plan) {
            res.json({
                ok: true,
                strategy: null,
                message: 'No study plan found',
            });
            return;
        }
        // Extract strategy from sessions (reverse engineer)
        const plannedSessions = plan.sessions.filter((s) => s.status === 'planned');
        if (plannedSessions.length === 0) {
            res.json({
                ok: true,
                strategy: null,
                message: 'No active strategy',
            });
            return;
        }
        // Group by date
        const byDate = new Map();
        plannedSessions.forEach(session => {
            if (!byDate.has(session.date)) {
                byDate.set(session.date, []);
            }
            byDate.get(session.date).push(session);
        });
        const dailyPlan = Array.from(byDate.entries()).map(([date, sessions], index) => ({
            day: index + 1,
            date,
            topics: sessions.map(s => s.topic),
            estimatedHours: Math.round((sessions[0]?.estimatedMinutes || 60) / 60),
            focus: 'Mixed topics',
            tips: sessions[0]?.notes || '',
        }));
        res.json({
            ok: true,
            strategy: {
                summary: 'Current study plan',
                totalDays: dailyPlan.length,
                dailyPlan,
                priorityTopics: plannedSessions
                    .filter((s) => s.priorityLevel === 'high')
                    .map(s => s.topic),
                recommendedActions: [],
                confidenceLevel: 80,
            },
        });
    }
    catch (err) {
        console.error('Get strategy error:', err);
        res.status(500).json({ error: 'Failed to load strategy' });
    }
});
exports.default = router;
