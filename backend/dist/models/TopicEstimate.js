"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicEstimateModel = void 0;
const mongoose_1 = require("mongoose");
const TopicEstimateSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    estimatedHours: { type: Number, required: true },
    confidence: { type: Number, required: true },
    basis: {
        paceMinutesPerHour: { type: Number },
        observedSessions: { type: Number },
    },
}, { timestamps: true });
TopicEstimateSchema.index({ userId: 1, syllabusId: 1, topic: 1 }, { unique: true });
exports.TopicEstimateModel = (0, mongoose_1.model)('TopicEstimate', TopicEstimateSchema);
