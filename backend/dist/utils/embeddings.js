"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.cosineSimilarity = cosineSimilarity;
const transformers_1 = require("@xenova/transformers");
let extractorPipeline = null;
// Initialize standard Xenova/all-MiniLM-L6-v2 directly in memory
async function getPipeline() {
    if (!extractorPipeline) {
        // using feature-extraction
        extractorPipeline = await (0, transformers_1.pipeline)('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            quantized: true,
        });
    }
    return extractorPipeline;
}
async function generateEmbedding(text) {
    try {
        const extractor = await getPipeline();
        // Return array of floats
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
    catch (error) {
        console.error("Text embedding generation failed", error);
        // fallback if model fails to load
        return new Array(384).fill(0);
    }
}
// Compute standard cosine similarity between two numeric arrays
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
