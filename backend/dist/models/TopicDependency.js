"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicDependencyModel = void 0;
const mongoose_1 = require("mongoose");
const TopicDependencySchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    dependsOn: [{ type: String, required: true }],
}, { timestamps: true });
TopicDependencySchema.index({ userId: 1, syllabusId: 1 });
exports.TopicDependencyModel = (0, mongoose_1.model)('TopicDependency', TopicDependencySchema);
