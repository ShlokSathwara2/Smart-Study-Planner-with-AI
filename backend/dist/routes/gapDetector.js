"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Syllabus_1 = require("../models/Syllabus");
const router = (0, express_1.Router)();
router.post('/analyze', async (req, res) => {
    try {
        const { topicTitle, syllabusId, userId = 'anonymous', grade = 'Unknown' } = req.body;
        if (!topicTitle || !syllabusId) {
            res.status(400).json({ error: 'topicTitle and syllabusId are required' });
            return;
        }
        // Try to find context from the syllabus document
        const syllabus = await Syllabus_1.SyllabusModel.findOne({ _id: syllabusId });
        // Determine context for Claude
        let contextString = '';
        if (syllabus) {
            contextString = `The student is studying from a syllabus with these topics: ${syllabus.analysis.topics?.map((t) => t.title || t).join(', ') || 'Unknown'}.\n\n`;
            if (syllabus.rawBookText) {
                contextString += `Some reference text from their book:\n${syllabus.rawBookText.slice(0, 10000)}\n\n`;
            }
        }
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            // Mock fallback if no API key
            res.json({
                ok: true,
                foundations: [
                    `Introduction to ${topicTitle}`,
                    `Core Principles of ${topicTitle}`
                ]
            });
            return;
        }
        // Prompt Claude
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 500,
                temperature: 0.1,
                system: `You are an expert AI tutor. A student (Level: ${grade}) is struggling with the topic: "${topicTitle}". Identify 1-3 foundational or preliminary concepts they MUST understand before grasping this topic. Return them as a flat JSON array of strings. Example: ["Foundational Concept 1", "Foundational Concept 2"]`,
                messages: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: `${contextString}Identify the foundational prerequisites for: ${topicTitle}` }],
                    },
                ],
            }),
        });
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }
        const data = await response.json();
        const content = data?.content?.[0]?.text ?? '';
        try {
            const match = content.match(/\[.*\]/s);
            if (match) {
                const foundations = JSON.parse(match[0]);
                res.json({ ok: true, foundations });
            }
            else {
                const strictParse = JSON.parse(content);
                res.json({ ok: true, foundations: strictParse });
            }
        }
        catch {
            res.status(500).json({ error: 'Failed to parse AI response into foundations array' });
        }
    }
    catch (err) {
        console.error('Gap Detector analysis error', err);
        res.status(500).json({ error: 'Failed to run knowledge gap detection' });
    }
});
exports.default = router;
