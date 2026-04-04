"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizResultModel = void 0;
const mongoose_1 = require("mongoose");
const QuizResultSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    questions: [{
            question: { type: String, required: true },
            options: { type: [String], required: true },
            correctAnswer: { type: Number, required: true },
            explanation: { type: String },
        }],
    attempts: [{
            questionIndex: { type: Number, required: true },
            selectedAnswer: { type: Number, required: true },
            isCorrect: { type: Boolean, required: true },
            timeSpentSeconds: { type: Number, required: true },
            answeredAt: { type: String, required: true },
        }],
    score: { type: Number, required: true, min: 0, max: 100 },
    totalTimeSeconds: { type: Number, required: true },
    completedAt: { type: String, required: true },
}, { timestamps: true });
// Index for efficient queries
QuizResultSchema.index({ userId: 1, syllabusId: 1, topic: 1, completedAt: -1 });
exports.QuizResultModel = (0, mongoose_1.model)('QuizResult', QuizResultSchema);
