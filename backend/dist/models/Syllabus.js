"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyllabusModel = void 0;
const mongoose_1 = require("mongoose");
const SyllabusSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    sourceFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    rawText: { type: String, required: true },
    rawBookText: { type: String },
    grade: { type: String },
    analysis: {
        topics: [{ type: String }],
        chapters: [
            {
                title: { type: String },
                pages: { type: Number },
            },
        ],
        units: [{ type: String }],
        difficulty: { type: String, default: 'medium' },
        estimatedHours: { type: Number, default: 0 },
    },
}, { timestamps: true });
exports.SyllabusModel = (0, mongoose_1.model)('Syllabus', SyllabusSchema);
