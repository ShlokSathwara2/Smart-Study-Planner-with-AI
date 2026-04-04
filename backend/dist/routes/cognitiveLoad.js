"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CognitiveLoad_1 = require("../models/CognitiveLoad");
const router = (0, express_1.Router)();
// POST /api/cognitive-load/track - Log learning signals for a topic
router.post('/track', async (req, res) => {
    try {
        const { userId = 'anonymous', syllabusId, topic, timeSpentMinutes, quizAccuracy, pauseCount, rewindCount } = req.body;
        if (!syllabusId || !topic) {
            res.status(400).json({ error: 'syllabusId and topic are required' });
            return;
        }
        // Find or create cognitive load record
        let record = await CognitiveLoad_1.CognitiveLoadModel.findOne({ userId, syllabusId, topic });
        if (!record) {
            record = await CognitiveLoad_1.CognitiveLoadModel.create({
                userId,
                syllabusId,
                topic,
                signals: [],
                averageTimeOnTopic: 0,
                averageQuizAccuracy: 0,
                totalPauseCount: 0,
            });
        }
        // Add new signal
        const newSignal = {
            topic,
            timeSpentMinutes,
            quizAccuracy: quizAccuracy || 0,
            pauseCount: pauseCount || 0,
            rewindCount: rewindCount || 0,
            sessionCount: 1,
            lastStudiedAt: new Date().toISOString(),
        };
        record.signals.push(newSignal);
        // Update averages
        const totalSessions = record.signals.length;
        record.averageTimeOnTopic = record.signals.reduce((sum, s) => sum + s.timeSpentMinutes, 0) / totalSessions;
        const accuracySignals = record.signals.filter(s => s.quizAccuracy !== undefined && s.quizAccuracy > 0);
        record.averageQuizAccuracy = accuracySignals.length > 0
            ? accuracySignals.reduce((sum, s) => sum + (s.quizAccuracy || 0), 0) / accuracySignals.length
            : 0;
        record.totalPauseCount = record.signals.reduce((sum, s) => sum + (s.pauseCount || 0), 0);
        await record.save();
        res.json({ ok: true, record });
    }
    catch (err) {
        console.error('Cognitive load track error', err);
        res.status(500).json({ error: 'Failed to track cognitive load' });
    }
});
// GET /api/cognitive-load/by-syllabus/:id - Get all cognitive load data for a syllabus
router.get('/by-syllabus/:id', async (req, res) => {
    try {
        const syllabusId = req.params.id;
        const userId = req.query.userId || 'anonymous';
        const records = await CognitiveLoad_1.CognitiveLoadModel.find({ userId, syllabusId }).lean();
        // Calculate overall stats
        const totalTopics = records.length;
        const highLoadTopics = records.filter(r => (r.cognitiveLoadScore || 0) > 75).length;
        const averageLoad = records.length > 0
            ? records.reduce((sum, r) => sum + (r.cognitiveLoadScore || 0), 0) / records.length
            : 0;
        res.json({
            ok: true,
            records,
            stats: {
                totalTopics,
                highLoadTopics,
                averageLoad: Math.round(averageLoad),
            }
        });
    }
    catch (err) {
        console.error('Get cognitive load error', err);
        res.status(500).json({ error: 'Failed to load cognitive load data' });
    }
});
// POST /api/cognitive-load/analyze - Trigger Claude AI analysis
router.post('/analyze', async (req, res) => {
    try {
        const { userId = 'anonymous', syllabusId } = req.body;
        if (!syllabusId) {
            res.status(400).json({ error: 'syllabusId is required' });
            return;
        }
        const records = await CognitiveLoad_1.CognitiveLoadModel.find({ userId, syllabusId });
        if (records.length === 0) {
            res.status(400).json({ error: 'No cognitive load data found' });
            return;
        }
        // Prepare data for Claude
        const topicsData = records.map(r => ({
            topic: r.topic,
            avgTimeMinutes: Math.round(r.averageTimeOnTopic),
            avgAccuracy: Math.round(r.averageQuizAccuracy),
            totalPauses: r.totalPauseCount,
            sessions: r.signals.length,
        }));
        // Call Claude API
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            // Fallback: simple heuristic-based analysis
            records.forEach(record => {
                const score = calculateHeuristicScore(record);
                record.cognitiveLoadScore = score;
                record.difficultyLevel = getDifficultyLevel(score);
                record.shouldSplit = score > 75;
                record.splitSuggestions = score > 75 ? [`Break ${record.topic} into smaller sub-topics`] : [];
            });
            await Promise.all(records.map(r => r.save()));
            res.json({ ok: true, records });
            return;
        }
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1500,
                temperature: 0,
                system: 'You are an educational psychologist analyzing cognitive load for students. Return JSON only with shape: { "topics": Array<{ "topic": string, "cognitiveLoadScore": number (0-100), "difficultyLevel": "easy|medium|hard|very-hard", "shouldSplit": boolean, "splitSuggestions": string[] }>. Score > 75 means topic should be split.',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analyze cognitive load for these study topics:\n\n${JSON.stringify(topicsData, null, 2)}\n\nConsider:\n- High time + low accuracy = high cognitive load\n- Many pauses = confusion/difficulty\n- Multiple sessions needed = complexity\n\nReturn detailed analysis with recommendations for splitting difficult topics.`,
                            },
                        ],
                    },
                ],
            }),
        });
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }
        const data = await response.json();
        const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;
        try {
            const analysis = JSON.parse(content);
            const topicsAnalysis = analysis.topics || [];
            // Update records with Claude's analysis
            const updatePromises = records.map(async (record) => {
                const topicAnalysis = topicsAnalysis.find((t) => t.topic === record.topic);
                if (topicAnalysis) {
                    record.cognitiveLoadScore = topicAnalysis.cognitiveLoadScore;
                    record.difficultyLevel = topicAnalysis.difficultyLevel;
                    record.shouldSplit = topicAnalysis.shouldSplit;
                    record.splitSuggestions = topicAnalysis.splitSuggestions || [];
                }
                return record.save();
            });
            await Promise.all(updatePromises);
            res.json({ ok: true, records });
        }
        catch {
            res.status(500).json({ error: 'Failed to parse Claude response' });
        }
    }
    catch (err) {
        console.error('Cognitive load analyze error', err);
        res.status(500).json({ error: 'Failed to analyze cognitive load' });
    }
});
// Helper functions for fallback
function calculateHeuristicScore(record) {
    const timeFactor = Math.min(record.averageTimeOnTopic / 60, 1) * 30; // Max 30 points
    const accuracyFactor = (100 - record.averageQuizAccuracy) / 100 * 40; // Max 40 points
    const pauseFactor = Math.min(record.totalPauseCount / 10, 1) * 30; // Max 30 points
    return Math.round(timeFactor + accuracyFactor + pauseFactor);
}
function getDifficultyLevel(score) {
    if (score <= 25)
        return 'easy';
    if (score <= 50)
        return 'medium';
    if (score <= 75)
        return 'hard';
    return 'very-hard';
}
exports.default = router;
