"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FocusSessionModel = void 0;
const mongoose_1 = require("mongoose");
const FocusSessionSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    planSessionId: { type: String },
    startTime: { type: String, required: true },
    endTime: { type: String },
    totalSeconds: { type: Number },
    deepWorkSeconds: { type: Number },
    distractionCount: { type: Number },
    status: {
        type: String,
        enum: ['running', 'paused', 'finished'],
        default: 'running',
    },
    events: [
        {
            type: {
                type: String,
                enum: ['start', 'pause', 'resume', 'end', 'visibility-hidden', 'visibility-visible'],
            },
            at: { type: String, required: true },
        },
    ],
}, { timestamps: true });
exports.FocusSessionModel = (0, mongoose_1.model)('FocusSession', FocusSessionSchema);
