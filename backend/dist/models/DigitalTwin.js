"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalTwinModel = void 0;
const mongoose_1 = require("mongoose");
const DigitalTwinSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, index: true },
    learningStyle: {
        visualLearner: { type: Number, default: 50, min: 0, max: 100 },
        auditoryLearner: { type: Number, default: 50, min: 0, max: 100 },
        kinestheticLearner: { type: Number, default: 50, min: 0, max: 100 },
        readingWritingLearner: { type: Number, default: 50, min: 0, max: 100 },
        preferredSessionLength: { type: Number, default: 45 },
        breakFrequency: { type: Number, default: 25 },
    },
    performance: {
        averageQuizScore: { type: Number, default: 0, min: 0, max: 100 },
        retentionRate: { type: Number, default: 0, min: 0, max: 100 },
        focusScore: { type: Number, default: 0, min: 0, max: 100 },
        completionRate: { type: Number, default: 0, min: 0, max: 100 },
        averageStudySpeed: { type: Number, default: 0 },
        accuracyTrend: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
        consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    timePatterns: {
        bestStudyHours: { type: [Number], default: [9, 10, 11] },
        mostProductiveDay: { type: String, default: 'Monday' },
        leastProductiveDay: { type: String, default: 'Friday' },
        averageSessionDuration: { type: Number, default: 45 },
        typicalStartTime: { type: String, default: '09:00' },
        streakDays: { type: Number, default: 0 },
    },
    predictiveInsights: {
        predictedExamScore: { type: Number, default: 0, min: 0, max: 100 },
        confidenceLevel: { type: Number, default: 0, min: 0, max: 100 },
        readinessTrend: { type: String, enum: ['increasing', 'stable', 'decreasing'], default: 'stable' },
        estimatedPreparationTime: { type: Number, default: 0 },
        weakAreas: { type: [String], default: [] },
        strongAreas: { type: [String], default: [] },
        recommendedFocus: { type: [String], default: [] },
    },
    revisionPatterns: {
        averageRevisionsPerTopic: { type: Number, default: 0 },
        timeBeforeReview: { type: Number, default: 3 },
        revisionEffectiveness: { type: Number, default: 0, min: 0, max: 100 },
        spacedRepetitionCompliance: { type: Number, default: 0, min: 0, max: 100 },
        commonMistakeTypes: { type: [String], default: [] },
    },
    totalStudyMinutes: { type: Number, default: 0 },
    totalSessionsCompleted: { type: Number, default: 0 },
    totalQuizzesTaken: { type: Number, default: 0 },
    topicsMastered: { type: Number, default: 0 },
    topicsInProgress: { type: Number, default: 0 },
    aiSummary: { type: String, default: '' },
    learningPersonality: { type: String, default: 'Balanced Learner' },
    dataPointsAnalyzed: { type: Number, default: 0 },
}, { timestamps: true });
// Index for efficient queries
DigitalTwinSchema.index({ userId: 1, syllabusId: 1, createdAt: -1 });
exports.DigitalTwinModel = (0, mongoose_1.model)('DigitalTwin', DigitalTwinSchema);
