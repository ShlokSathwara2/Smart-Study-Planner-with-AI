"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const StudyPlan_1 = require("../models/StudyPlan");
const whisperTranscribe_1 = require("../utils/whisperTranscribe");
const router = (0, express_1.Router)();
// Configure multer for file uploads (memory storage)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit (Whisper max is 25MB)
    },
});
// POST /api/voice-input/log-session - Transcribe and log study session
router.post('/log-session', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No audio file provided' });
            return;
        }
        const { userId, syllabusId } = req.body;
        if (!userId || !syllabusId) {
            res.status(400).json({ error: 'userId and syllabusId are required' });
            return;
        }
        // Step 1: Transcribe audio using Whisper
        // Convert Buffer to Blob for FormData
        const uint8Array = Uint8Array.from(req.file.buffer);
        const blob = new Blob([uint8Array], { type: 'audio/webm' });
        const transcription = await (0, whisperTranscribe_1.transcribeAudioBlob)(blob, req.file.originalname);
        console.log('🎤 Transcription:', transcription.text);
        // Step 2: Parse intent using Claude
        const intent = await (0, whisperTranscribe_1.parseSessionIntent)(transcription.text);
        console.log('🧠 Parsed intent:', intent);
        // Step 3: Auto-log the session if we have enough information
        let sessionLogged = false;
        let newSessionId;
        if (intent.topic && intent.confidence > 60) {
            // Get or create study plan
            let plan = await StudyPlan_1.StudyPlanModel.findOne({ userId, syllabusId });
            if (!plan) {
                // Create minimal study plan if none exists
                const examDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                plan = await StudyPlan_1.StudyPlanModel.create({
                    userId,
                    syllabusId,
                    examDate: examDate.toISOString().split('T')[0], // YYYY-MM-DD format
                    dailyHours: 2,
                    sessions: [],
                });
            }
            // Add session to plan
            const durationMinutes = intent.durationMinutes || 30; // Default 30 min
            const newSession = {
                topic: intent.topic,
                date: new Date().toISOString().split('T')[0],
                estimatedMinutes: durationMinutes,
                actualMinutes: durationMinutes,
                status: 'done',
                completedAt: new Date(),
                notes: intent.notes || `Voice logged session: ${transcription.text.substring(0, 100)}`,
            };
            plan.sessions.push(newSession);
            await plan.save();
            sessionLogged = true;
            // Get the index of the newly added session
            const newIndex = plan.sessions.length - 1;
            newSessionId = `${newIndex}`; // Use index as temporary ID
        }
        res.json({
            ok: true,
            transcription: transcription.text,
            intent: {
                topic: intent.topic,
                durationMinutes: intent.durationMinutes,
                notes: intent.notes,
                confidence: intent.confidence,
            },
            sessionLogged,
            newSessionId,
            message: sessionLogged
                ? `Session logged: ${intent.topic} for ${intent.durationMinutes} minutes`
                : 'Transcription complete, but insufficient data to auto-log session',
        });
    }
    catch (error) {
        console.error('Voice input error:', error);
        res.status(500).json({
            error: 'Failed to process voice input',
            details: error.message,
        });
    }
});
// GET /api/voice-input/test - Test endpoint
router.get('/test', (req, res) => {
    res.json({
        ok: true,
        message: 'Voice input API is running',
        supportedFeatures: [
            'Audio transcription via Whisper',
            'Intent parsing via Claude',
            'Auto session logging',
        ],
    });
});
exports.default = router;
