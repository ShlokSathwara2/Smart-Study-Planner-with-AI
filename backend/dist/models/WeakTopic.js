"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeakTopicModel = void 0;
const mongoose_1 = require("mongoose");
const WeakTopicSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    // Confidence metrics
    averageQuizScore: { type: Number, default: 0, min: 0, max: 100 },
    totalAttempts: { type: Number, default: 0 },
    lastAttemptedAt: { type: String },
    daysSinceLastAttempt: { type: Number, default: 0 },
    // Calculated confidence score (0-100)
    confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
    // Weak topic flags
    isWeak: { type: Boolean, default: false },
    weakReason: { type: String },
    recommendedActions: { type: [String], default: [] },
    // Schedule adjustments
    timeAllocationMultiplier: { type: Number, default: 1.0 },
    priorityLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low'
    },
}, { timestamps: true });
// Indexes for efficient queries
WeakTopicSchema.index({ userId: 1, syllabusId: 1, isWeak: 1 });
WeakTopicSchema.index({ userId: 1, syllabusId: 1, confidenceScore: 1 });
WeakTopicSchema.index({ userId: 1, syllabusId: 1, priorityLevel: 1 });
exports.WeakTopicModel = (0, mongoose_1.model)('WeakTopic', WeakTopicSchema);
