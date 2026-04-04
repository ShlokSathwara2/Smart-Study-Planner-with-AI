"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQdrantClient = getQdrantClient;
exports.initializeVectorCollection = initializeVectorCollection;
exports.embedAndStoreTopic = embedAndStoreTopic;
exports.batchEmbedTopics = batchEmbedTopics;
exports.findSimilarTopics = findSimilarTopics;
exports.detectAtRiskTopics = detectAtRiskTopics;
exports.deleteSyllabusVectors = deleteSyllabusVectors;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const TopicVector_1 = require("../models/TopicVector");
const embeddings_1 = require("../utils/embeddings");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'study_topics';
const VECTOR_SIZE = 384; // Xenova/all-MiniLM-L6-v2 produces 384-dimensional vectors
let client = null;
function getQdrantClient() {
    if (!client) {
        client = new js_client_rest_1.QdrantClient({
            url: QDRANT_URL,
        });
    }
    return client;
}
// Initialize collection if it doesn't exist
async function initializeVectorCollection() {
    try {
        const qdrantClient = getQdrantClient();
        // Check if collection exists
        const collections = await qdrantClient.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
        if (!exists) {
            // Create collection with HNSW index for fast similarity search
            await qdrantClient.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: 'Cosine',
                },
                hnsw_config: {
                    m: 16,
                    ef_construct: 100,
                },
            });
            console.log(`✅ Created Qdrant collection: ${COLLECTION_NAME}`);
        }
        else {
            console.log(`✅ Qdrant collection already exists: ${COLLECTION_NAME}`);
        }
    }
    catch (error) {
        console.error('❌ Failed to initialize Qdrant collection:', error);
        throw error;
    }
}
// Embed and store a single topic
async function embedAndStoreTopic(syllabusId, topicName) {
    try {
        // Generate embedding using Xenova
        const embedding = await (0, embeddings_1.generateEmbedding)(topicName);
        // Store in MongoDB for persistence
        await TopicVector_1.TopicVectorModel.findOneAndUpdate({ syllabusId, topicName }, { syllabusId, topicName, embedding }, { upsert: true, new: true });
        // Store in Qdrant for fast similarity search
        const qdrantClient = getQdrantClient();
        // Create point ID from syllabus and topic
        const pointId = `${syllabusId}_${topicName.replace(/\s+/g, '_').toLowerCase()}`;
        await qdrantClient.upsert(COLLECTION_NAME, {
            points: [
                {
                    id: pointId,
                    vector: embedding,
                    payload: {
                        syllabusId,
                        topicName,
                        embeddedAt: new Date().toISOString(),
                    },
                },
            ],
        });
        console.log(`✅ Embedded and stored topic: "${topicName}"`);
    }
    catch (error) {
        console.error(`❌ Failed to embed topic "${topicName}":`, error);
        throw error;
    }
}
// Batch embed multiple topics
async function batchEmbedTopics(syllabusId, topics) {
    try {
        let successCount = 0;
        for (const topic of topics) {
            try {
                await embedAndStoreTopic(syllabusId, topic);
                successCount++;
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            catch (error) {
                console.error(`Failed to embed topic: ${topic}`, error);
            }
        }
        console.log(`✅ Successfully embedded ${successCount}/${topics.length} topics`);
        return successCount;
    }
    catch (error) {
        console.error('❌ Batch embedding failed:', error);
        throw error;
    }
}
// Find semantically similar topics
async function findSimilarTopics(syllabusId, topicName, limit = 5, threshold = 0.6) {
    try {
        // Generate query embedding
        const queryEmbedding = await (0, embeddings_1.generateEmbedding)(topicName);
        // Search in Qdrant
        const qdrantClient = getQdrantClient();
        const searchResults = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryEmbedding,
            limit: limit + 5, // Get extra results to filter by syllabus
            with_payload: true,
            score_threshold: threshold,
        });
        // Filter by syllabusId and exclude the query topic itself
        const filteredResults = searchResults
            .filter(result => result.payload?.syllabusId === syllabusId)
            .filter(result => result.payload?.topicName !== topicName)
            .slice(0, limit)
            .map(result => ({
            topicName: result.payload?.topicName,
            similarity: result.score || 0,
        }));
        return filteredResults;
    }
    catch (error) {
        console.error('❌ Semantic similarity search failed:', error);
        return [];
    }
}
// Detect at-risk topics based on weak topics
async function detectAtRiskTopics(syllabusId, weakTopics) {
    try {
        const atRiskTopics = [];
        for (const weakTopic of weakTopics) {
            // Find semantically similar topics
            const similarTopics = await findSimilarTopics(syllabusId, weakTopic.topic, 3, 0.65);
            // Determine risk level based on weak topic confidence
            const baseRiskLevel = weakTopic.confidenceScore < 40 ? 'high' :
                weakTopic.confidenceScore < 60 ? 'medium' : 'low';
            for (const similar of similarTopics) {
                // Avoid duplicates
                const exists = atRiskTopics.find(a => a.topic === similar.topicName);
                if (!exists) {
                    atRiskTopics.push({
                        topic: similar.topicName,
                        reason: `Semantically related to weak topic "${weakTopic.topic}" (${Math.round(similar.similarity * 100)}% similar)`,
                        riskLevel: baseRiskLevel,
                    });
                }
            }
        }
        return atRiskTopics;
    }
    catch (error) {
        console.error('❌ At-risk topic detection failed:', error);
        return [];
    }
}
// Delete all vectors for a syllabus
async function deleteSyllabusVectors(syllabusId) {
    try {
        const qdrantClient = getQdrantClient();
        // Delete from Qdrant
        await qdrantClient.delete(COLLECTION_NAME, {
            filter: {
                must: [
                    {
                        key: 'syllabusId',
                        match: { value: syllabusId },
                    },
                ],
            },
        });
        // Delete from MongoDB
        await TopicVector_1.TopicVectorModel.deleteMany({ syllabusId });
        console.log(`✅ Deleted all vectors for syllabus: ${syllabusId}`);
    }
    catch (error) {
        console.error('❌ Failed to delete syllabus vectors:', error);
        throw error;
    }
}
