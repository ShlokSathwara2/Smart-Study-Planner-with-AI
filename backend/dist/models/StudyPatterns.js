"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyPatternsModel = void 0;
const mongoose_1 = require("mongoose");
const StudyPatternsSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, index: true },
    // Time patterns
    timePatterns: {
        bestStudyTime: { type: String, default: '09:00-11:00' },
        mostProductiveDay: { type: String, default: 'Monday' },
        averageStartTime: { type: String, default: '09:00' },
        consistencyScore: { type: Number, default: 50, min: 0, max: 100 },
    },
    // Focus patterns
    focusPatterns: {
        averageFocusDuration: { type: Number, default: 30, min: 0 },
        optimalSessionLength: { type: Number, default: 25, min: 0 },
        dropOffPoint: { type: Number, default: 40, min: 0 },
        attentionSpanTrend: {
            type: String,
            enum: ['improving', 'stable', 'declining'],
            default: 'stable'
        },
        deepWorkPercentage: { type: Number, default: 0, min: 0, max: 100 },
    },
    // Productivity patterns
    productivityPatterns: {
        peakProductivityHours: [{ type: String }],
        lowEnergyHours: [{ type: String }],
        averageSessionsPerDay: { type: Number, default: 0 },
        preferredBreakLength: { type: Number, default: 5 },
        workToBreakRatio: { type: Number, default: 4 },
    },
    // Learning patterns
    learningPatterns: {
        dominantLearningStyle: {
            type: String,
            enum: ['visual', 'auditory', 'reading', 'kinesthetic'],
            default: 'visual'
        },
        topicSwitchFrequency: { type: Number, default: 0 },
        revisionSpacingDays: { type: Number, default: 3 },
        masterySpeed: {
            type: String,
            enum: ['fast', 'moderate', 'slow'],
            default: 'moderate'
        },
    },
    // Weekly insights
    weeklyInsights: [{
            insight: { type: String, required: true },
            recommendation: { type: String, required: true },
            confidenceLevel: { type: Number, min: 0, max: 100 },
            impactPriority: {
                type: String,
                enum: ['high', 'medium', 'low'],
                default: 'medium'
            },
            category: {
                type: String,
                enum: ['timing', 'focus', 'productivity', 'learning_style', 'habits']
            },
        }],
    // Daily coach messages
    dailyCoachMessages: [{
            date: { type: Date, required: true },
            message: { type: String, required: true },
            suggestion: { type: String, required: true },
            basedOnData: { type: String, required: true },
            motivationQuote: { type: String },
        }],
    // Raw metrics
    totalSessionsAnalyzed: { type: Number, default: 0 },
    totalHoursTracked: { type: Number, default: 0 },
    dataQualityScore: { type: Number, default: 0, min: 0, max: 100 },
    // Analysis period
    analysisStartDate: { type: Date, required: true },
}, { timestamps: true });
// Indexes for efficient queries
StudyPatternsSchema.index({ userId: 1, syllabusId: 1, lastUpdated: -1 });
StudyPatternsSchema.index({ userId: 1, createdAt: -1 });
exports.StudyPatternsModel = (0, mongoose_1.model)('StudyPatterns', StudyPatternsSchema);
