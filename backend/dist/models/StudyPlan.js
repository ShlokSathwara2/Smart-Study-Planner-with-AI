"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyPlanModel = void 0;
const mongoose_1 = require("mongoose");
const StudySessionSchema = new mongoose_1.Schema({
    date: { type: String, required: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '10:00' },
    topic: { type: String, required: true },
    unit: { type: String },
    estimatedMinutes: { type: Number, default: 60 },
    status: { type: String, default: 'planned' },
    actualMinutes: { type: Number },
    loggedAt: { type: String },
    // Phase 9 — cognitive load auto-split
    isSubModule: { type: Boolean, default: false },
    parentTopic: { type: String },
    // Phase 10 — weak topic time adjustment
    wasAdjustedForWeakness: { type: Boolean, default: false },
    originalEstimatedMinutes: { type: Number },
    priorityLevel: { type: String },
    // Phase 12 — spaced repetition review
    isReview: { type: Boolean, default: false },
}, { _id: false });
const StudyPlanSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    examDate: { type: String, required: true },
    dailyHours: { type: Number, required: true },
    sessions: { type: [StudySessionSchema], default: [] },
}, { timestamps: true });
StudyPlanSchema.index({ userId: 1, syllabusId: 1, examDate: 1 });
exports.StudyPlanModel = (0, mongoose_1.model)('StudyPlan', StudyPlanSchema);
