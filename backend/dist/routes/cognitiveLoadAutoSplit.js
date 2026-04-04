"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CognitiveLoad_1 = require("../models/CognitiveLoad");
const StudyPlan_1 = require("../models/StudyPlan");
const router = (0, express_1.Router)();
// POST /api/cognitive-load/auto-split - Auto-split high-load topics in schedule
router.post('/', async (req, res) => {
    try {
        const { userId = 'anonymous', syllabusId, planId } = req.body;
        if (!syllabusId) {
            res.status(400).json({ error: 'syllabusId is required' });
            return;
        }
        // Get all high-load topics
        const highLoadTopics = await CognitiveLoad_1.CognitiveLoadModel.find({
            userId,
            syllabusId,
            shouldSplit: true,
        });
        if (highLoadTopics.length === 0) {
            res.json({ ok: true, message: 'No high-load topics to split', modifiedPlans: 0 });
            return;
        }
        // Call Claude to suggest sub-modules for each high-load topic
        const apiKey = process.env.ANTHROPIC_API_KEY;
        const topicsToSplit = highLoadTopics.map(t => t.topic);
        let subModuleSuggestions = {};
        if (apiKey) {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 1200,
                        temperature: 0.3,
                        system: 'You are breaking down complex topics into smaller, manageable sub-modules. Return JSON only: { "topics": Array<{ "topic": string, "subModules": string[] }> } where subModules are 2-4 smaller learning units.',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Break these high cognitive load topics into 2-4 smaller sub-modules:\n\n${topicsToSplit.join('\n')}`,
                                    },
                                ],
                            },
                        ],
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;
                    const parsed = JSON.parse(content);
                    if (parsed.topics) {
                        parsed.topics.forEach((t) => {
                            subModuleSuggestions[t.topic] = t.subModules || [];
                        });
                    }
                }
            }
            catch (error) {
                console.error('Claude sub-module suggestion error:', error);
            }
        }
        // If Claude failed or no API key, use simple heuristic
        if (Object.keys(subModuleSuggestions).length === 0) {
            highLoadTopics.forEach(topic => {
                subModuleSuggestions[topic.topic] = [
                    `${topic.topic} - Part 1: Fundamentals`,
                    `${topic.topic} - Part 2: Applications`,
                ];
            });
        }
        // Update study plans with split topics
        let modifiedPlans = 0;
        if (planId) {
            // Update specific plan
            const plan = await StudyPlan_1.StudyPlanModel.findOne({ _id: planId, userId });
            if (plan) {
                await updatePlanWithSubModules(plan, highLoadTopics, subModuleSuggestions);
                await plan.save();
                modifiedPlans++;
            }
        }
        else {
            // Update all plans for this syllabus
            const plans = await StudyPlan_1.StudyPlanModel.find({ userId, syllabusId });
            for (const plan of plans) {
                await updatePlanWithSubModules(plan, highLoadTopics, subModuleSuggestions);
                await plan.save();
                modifiedPlans++;
            }
        }
        res.json({
            ok: true,
            message: `Auto-split ${highLoadTopics.length} topics across ${modifiedPlans} plans`,
            modifiedPlans,
            splitTopics: highLoadTopics.map(t => ({
                topic: t.topic,
                subModules: subModuleSuggestions[t.topic],
            })),
        });
    }
    catch (err) {
        console.error('Auto-split error', err);
        res.status(500).json({ error: 'Failed to auto-split topics' });
    }
});
// Helper function to update plan sessions with sub-modules
async function updatePlanWithSubModules(plan, highLoadTopics, subModuleSuggestions) {
    const sessions = plan.sessions || [];
    highLoadTopics.forEach(highLoadTopic => {
        const subModules = subModuleSuggestions[highLoadTopic.topic] || [];
        if (subModules.length === 0)
            return;
        // Find sessions for this topic
        const topicSessionIndices = [];
        sessions.forEach((s, idx) => {
            if (s.topic === highLoadTopic.topic) {
                topicSessionIndices.push(idx);
            }
        });
        if (topicSessionIndices.length === 0)
            return;
        // Replace topic with sub-modules in sessions
        const originalSession = sessions[topicSessionIndices[0]];
        const durationPerModule = Math.floor(originalSession.estimatedMinutes / subModules.length);
        // Remove old sessions and add new ones for sub-modules
        topicSessionIndices.reverse().forEach((idx) => {
            sessions.splice(idx, 1);
        });
        subModules.forEach((subModule, idx) => {
            const newSession = {
                ...originalSession,
                topic: subModule,
                estimatedMinutes: durationPerModule,
                isSubModule: true,
                parentTopic: highLoadTopic.topic,
            };
            // Insert at the position of the first original session
            sessions.splice(topicSessionIndices[topicSessionIndices.length - 1] || 0, 0, newSession);
        });
    });
    plan.sessions = sessions;
    plan.markModified('sessions');
}
exports.default = router;
