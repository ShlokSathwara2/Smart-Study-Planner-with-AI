"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicVectorModel = void 0;
const mongoose_1 = require("mongoose");
const TopicVectorSchema = new mongoose_1.Schema({
    syllabusId: { type: String, required: true, index: true },
    topicName: { type: String, required: true },
    embedding: { type: [Number], required: true },
}, { timestamps: true });
TopicVectorSchema.index({ syllabusId: 1, topicName: 1 }, { unique: true });
exports.TopicVectorModel = (0, mongoose_1.model)('TopicVector', TopicVectorSchema);
