"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamPredictionModel = void 0;
const mongoose_1 = require("mongoose");
const ExamPredictionSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    // Core predictions
    readinessPercentage: { type: Number, required: true, min: 0, max: 100 },
    predictedScoreRange: {
        min: { type: Number, required: true, min: 0, max: 100 },
        max: { type: Number, required: true, min: 0, max: 100 },
        mostLikely: { type: Number, required: true, min: 0, max: 100 },
    },
    confidenceLevel: { type: Number, required: true, min: 0, max: 100 },
    // Detailed breakdown
    breakdown: {
        syllabusCompletionScore: { type: Number, default: 0, min: 0, max: 100 },
        quizPerformanceScore: { type: Number, default: 0, min: 0, max: 100 },
        revisionQualityScore: { type: Number, default: 0, min: 0, max: 100 },
        timeInvestmentScore: { type: Number, default: 0, min: 0, max: 100 },
        consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    // Risk analysis
    riskTopics: [{
            topic: { type: String, required: true },
            reason: { type: String, required: true },
            riskLevel: {
                type: String,
                enum: ['critical', 'high', 'medium', 'low'],
                required: true
            },
            quizScore: { type: Number, min: 0, max: 100 },
            completionPercentage: { type: Number, min: 0, max: 100 },
            revisionsCompleted: { type: Number, min: 0 },
        }],
    strongTopics: [{ type: String }],
    // Trend
    trend: {
        type: String,
        enum: ['improving', 'stable', 'declining'],
        required: true,
        default: 'stable'
    },
    weeklyChange: { type: Number, default: 0 },
    // Historical trends
    historicalTrends: [{
            weekNumber: { type: Number, required: true },
            readinessPercentage: { type: Number, required: true },
            predictedScore: { type: Number, required: true },
            trend: { type: String, enum: ['improving', 'stable', 'declining'] },
            weekLabel: { type: String, required: true },
        }],
    // AI insights
    aiAnalysis: { type: String, required: true },
    recommendedActions: [{ type: String }],
    examReadinessLabel: { type: String, required: true },
    // Metadata
    dataPointsAnalyzed: { type: Number, default: 0 },
}, { timestamps: true });
// Index for efficient queries
ExamPredictionSchema.index({ userId: 1, syllabusId: 1, createdAt: -1 });
ExamPredictionSchema.index({ userId: 1, syllabusId: 1, readinessPercentage: -1 });
exports.ExamPredictionModel = (0, mongoose_1.model)('ExamPrediction', ExamPredictionSchema);
