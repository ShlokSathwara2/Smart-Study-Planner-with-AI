"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveLoadModel = void 0;
const mongoose_1 = require("mongoose");
const CognitiveLoadSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    signals: [{
            topic: { type: String },
            timeSpentMinutes: { type: Number, required: true },
            quizAccuracy: { type: Number, min: 0, max: 100 },
            pauseCount: { type: Number, default: 0 },
            rewindCount: { type: Number, default: 0 },
            sessionCount: { type: Number, default: 1 },
            lastStudiedAt: { type: String },
        }],
    averageTimeOnTopic: { type: Number, default: 0 },
    averageQuizAccuracy: { type: Number, default: 0 },
    totalPauseCount: { type: Number, default: 0 },
    cognitiveLoadScore: { type: Number, min: 0, max: 100 },
    difficultyLevel: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'very-hard']
    },
    shouldSplit: { type: Boolean, default: false },
    splitSuggestions: { type: [String], default: [] },
}, { timestamps: true });
// Index for efficient queries
CognitiveLoadSchema.index({ userId: 1, syllabusId: 1, topic: 1 });
exports.CognitiveLoadModel = (0, mongoose_1.model)('CognitiveLoad', CognitiveLoadSchema);
