"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WeakTopic_1 = require("../models/WeakTopic");
const StudyPlan_1 = require("../models/StudyPlan");
const TopicVector_1 = require("../models/TopicVector");
const embeddings_1 = require("../utils/embeddings");
const vectorService_1 = require("../utils/vectorService");
const router = (0, express_1.Router)();
// POST /api/weak-topics/auto-adjust-schedule - Increase time for weak topics
router.post('/auto-adjust-schedule', async (req, res) => {
    try {
        const { userId = 'anonymous', syllabusId, planId } = req.body;
        if (!syllabusId) {
            res.status(400).json({ error: 'syllabusId is required' });
            return;
        }
        // Get all weak topics with their multipliers
        const weakTopics = await WeakTopic_1.WeakTopicModel.find({
            userId,
            syllabusId,
            isWeak: true
        });
        if (weakTopics.length === 0) {
            res.json({
                ok: true,
                message: 'No weak topics found - schedule is optimal',
                adjustedSessions: 0
            });
            return;
        }
        let adjustedSessions = 0;
        if (planId) {
            // Adjust specific plan
            const plan = await StudyPlan_1.StudyPlanModel.findOne({ _id: planId, userId });
            if (plan) {
                adjustedSessions = adjustPlanSessions(plan, weakTopics);
                await plan.save();
            }
        }
        else {
            // Adjust all plans for this syllabus
            const plans = await StudyPlan_1.StudyPlanModel.find({ userId, syllabusId });
            for (const plan of plans) {
                adjustedSessions += adjustPlanSessions(plan, weakTopics);
                await plan.save();
            }
        }
        res.json({
            ok: true,
            message: `Adjusted ${adjustedSessions} sessions for weak topics`,
            adjustedSessions,
            weakTopicsCount: weakTopics.length,
            weakTopics: weakTopics.map(t => ({
                topic: t.topic,
                priority: t.priorityLevel,
                multiplier: t.timeAllocationMultiplier,
            })),
        });
    }
    catch (err) {
        console.error('Auto-adjust schedule error', err);
        res.status(500).json({ error: 'Failed to auto-adjust schedule' });
    }
});
// Helper function to adjust plan sessions
function adjustPlanSessions(plan, weakTopics) {
    const sessions = plan.sessions || [];
    let adjustedCount = 0;
    weakTopics.forEach(weakTopic => {
        const multiplier = weakTopic.timeAllocationMultiplier;
        // Find sessions matching this topic (including partial matches)
        sessions.forEach((session) => {
            const sessionTopic = session.topic || '';
            const parentTopic = session.parentTopic || '';
            // Check if session is for this weak topic
            if (sessionTopic.toLowerCase().includes(weakTopic.topic.toLowerCase()) ||
                parentTopic.toLowerCase().includes(weakTopic.topic.toLowerCase()) ||
                weakTopic.topic.toLowerCase().includes(sessionTopic.toLowerCase())) {
                // Increase estimated time
                const originalMinutes = session.estimatedMinutes || 60;
                const newMinutes = Math.round(originalMinutes * multiplier);
                session.estimatedMinutes = newMinutes;
                session.wasAdjustedForWeakness = true;
                session.originalEstimatedMinutes = originalMinutes;
                session.priorityLevel = weakTopic.priorityLevel;
                adjustedCount++;
            }
        });
    });
    plan.sessions = sessions;
    plan.markModified('sessions');
    return adjustedCount;
}
// GET /api/weak-topics/by-syllabus/:id - Get all weak topics for a syllabus
router.get('/by-syllabus/:id', async (req, res) => {
    try {
        const syllabusId = req.params.id;
        const userId = req.query.userId || 'anonymous';
        const weakTopics = await WeakTopic_1.WeakTopicModel.find({ userId, syllabusId })
            .sort({ confidenceScore: 1, priorityLevel: 1 })
            .lean();
        const stats = {
            totalTopics: weakTopics.length,
            criticalCount: weakTopics.filter(t => t.priorityLevel === 'critical').length,
            highCount: weakTopics.filter(t => t.priorityLevel === 'high').length,
            mediumCount: weakTopics.filter(t => t.priorityLevel === 'medium').length,
            lowCount: weakTopics.filter(t => t.priorityLevel === 'low').length,
            averageConfidence: weakTopics.length > 0
                ? Math.round(weakTopics.reduce((sum, t) => sum + t.confidenceScore, 0) / weakTopics.length)
                : 100,
        };
        res.json({
            ok: true,
            weakTopics,
            stats,
        });
    }
    catch (err) {
        console.error('Get weak topics error', err);
        res.status(500).json({ error: 'Failed to load weak topics' });
    }
});
// POST /api/weak-topics/flag-semantic - Semantic similarity weak-topic detection (Qdrant-powered)
router.post('/flag-semantic', async (req, res) => {
    try {
        const { syllabusId, topicTitle } = req.body;
        if (!syllabusId || !topicTitle) {
            res.status(400).json({ error: 'syllabusId and topicTitle are required' });
            return;
        }
        // 1. Fetch all topics from user's latest study plan for this syllabus
        const plan = await StudyPlan_1.StudyPlanModel.findOne({ syllabusId });
        if (!plan) {
            res.status(404).json({ error: 'Study plan not found to extract topics' });
            return;
        }
        const allSessionTopics = [...new Set(plan.sessions.map((s) => s.topic.replace(/\[.*\]\s*/g, '').trim()))];
        // 2. Ensure all session topics are embedded in Qdrant
        for (const t of allSessionTopics) {
            if (!t)
                continue;
            let vecDoc = await TopicVector_1.TopicVectorModel.findOne({ syllabusId, topicName: t });
            if (!vecDoc) {
                // Offline generation
                const emb = await (0, embeddings_1.generateEmbedding)(t);
                await TopicVector_1.TopicVectorModel.create({
                    syllabusId,
                    topicName: t,
                    embedding: emb
                });
            }
        }
        // 3. Find the embedding for the weak topic specifically
        const weakCleanName = topicTitle.replace(/\[.*\]\s*/g, '').trim();
        let weakVec = await TopicVector_1.TopicVectorModel.findOne({ syllabusId, topicName: weakCleanName });
        if (!weakVec) {
            // It might not exist in the plan explicitly, build it dynamically
            const emb = await (0, embeddings_1.generateEmbedding)(weakCleanName);
            weakVec = await TopicVector_1.TopicVectorModel.create({
                syllabusId,
                topicName: weakCleanName,
                embedding: emb
            });
        }
        // 4. Compare all other topic vectors using pure cosine math
        const allVectors = await TopicVector_1.TopicVectorModel.find({ syllabusId });
        const atRiskTopics = [];
        for (const v of allVectors) {
            if (v.topicName === weakCleanName)
                continue;
            const similarity = (0, embeddings_1.cosineSimilarity)(weakVec.embedding, v.embedding);
            // If highly semantically related, they are explicitly at risk of failing too!
            if (similarity > 0.70) {
                atRiskTopics.push({
                    topic: v.topicName,
                    similarity: parseFloat((similarity * 100).toFixed(1))
                });
            }
        }
        // Sort by highest similarity
        atRiskTopics.sort((a, b) => b.similarity - a.similarity);
        res.json({
            ok: true,
            weakTopic: weakCleanName,
            atRisk: atRiskTopics
        });
    }
    catch (err) {
        console.error('Semantic detection error:', err);
        res.status(500).json({ error: 'Failed to process semantic vector queries' });
    }
});
// POST /api/weak-topics/embed-syllabus - Batch embed all topics for a syllabus
router.post('/embed-syllabus', async (req, res) => {
    try {
        const { syllabusId } = req.body;
        if (!syllabusId) {
            res.status(400).json({ error: 'syllabusId is required' });
            return;
        }
        // Initialize Qdrant collection
        try {
            await (0, vectorService_1.initializeVectorCollection)();
        }
        catch (initError) {
            console.warn('Qdrant initialization failed, falling back to MongoDB-only storage:', initError);
        }
        // Extract all unique topics from study plan
        const plan = await StudyPlan_1.StudyPlanModel.findOne({ syllabusId });
        if (!plan) {
            res.status(404).json({ error: 'Study plan not found' });
            return;
        }
        const allTopics = [...new Set(plan.sessions.map((s) => s.topic.replace(/\[.*\]\s*/g, '').trim()))].filter(Boolean);
        if (allTopics.length === 0) {
            res.json({
                ok: true,
                message: 'No topics found to embed',
                embeddedCount: 0,
            });
            return;
        }
        // Batch embed all topics
        const embeddedCount = await (0, vectorService_1.batchEmbedTopics)(syllabusId, allTopics);
        res.json({
            ok: true,
            message: `Successfully embedded ${embeddedCount}/${allTopics.length} topics`,
            embeddedCount,
            totalTopics: allTopics.length,
        });
    }
    catch (err) {
        console.error('Syllabus embedding error:', err);
        res.status(500).json({ error: 'Failed to embed syllabus topics' });
    }
});
// GET /api/weak-topics/detect-at-risk - Detect semantically at-risk topics
router.get('/detect-at-risk', async (req, res) => {
    try {
        const syllabusId = req.query.syllabusId;
        const userId = req.query.userId || 'anonymous';
        if (!syllabusId) {
            res.status(400).json({ error: 'syllabusId is required' });
            return;
        }
        // Get all weak topics
        const weakTopics = await WeakTopic_1.WeakTopicModel.find({ userId, syllabusId, isWeak: true })
            .lean();
        if (weakTopics.length === 0) {
            res.json({
                ok: true,
                atRisk: [],
                message: 'No weak topics found - no at-risk topics to detect',
            });
            return;
        }
        // Use vector service to detect at-risk topics
        const atRiskTopics = await (0, vectorService_1.detectAtRiskTopics)(syllabusId, weakTopics.map(w => ({ topic: w.topic, confidenceScore: w.confidenceScore })));
        res.json({
            ok: true,
            weakTopicsCount: weakTopics.length,
            atRisk: atRiskTopics,
        });
    }
    catch (err) {
        console.error('At-risk detection error:', err);
        res.status(500).json({ error: 'Failed to detect at-risk topics' });
    }
});
exports.default = router;
