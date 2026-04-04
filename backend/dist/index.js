"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const syllabus_1 = __importDefault(require("./routes/syllabus"));
const topicGraph_1 = __importDefault(require("./routes/topicGraph"));
const studyPlan_1 = __importDefault(require("./routes/studyPlan"));
const estimates_1 = __importDefault(require("./routes/estimates"));
const focus_1 = __importDefault(require("./routes/focus"));
const cognitiveLoad_1 = __importDefault(require("./routes/cognitiveLoad"));
const cognitiveLoadAutoSplit_1 = __importDefault(require("./routes/cognitiveLoadAutoSplit"));
const quiz_1 = __importDefault(require("./routes/quiz"));
const weakTopics_1 = __importDefault(require("./routes/weakTopics"));
const gapDetector_1 = __importDefault(require("./routes/gapDetector"));
const digitalTwin_1 = __importDefault(require("./routes/digitalTwin"));
const examPredict_1 = __importDefault(require("./routes/examPredict"));
const studyInsights_1 = __importDefault(require("./routes/studyInsights"));
const voiceInput_1 = __importDefault(require("./routes/voiceInput"));
const studyStrategy_1 = __importDefault(require("./routes/studyStrategy"));
const vectorService_1 = require("./utils/vectorService");
const weeklyScheduler_1 = require("./utils/weeklyScheduler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
app.use(express_1.default.json());
app.use('/api/syllabus', syllabus_1.default);
app.use('/api/graph', topicGraph_1.default);
app.use('/api/plan', studyPlan_1.default);
app.use('/api/estimates', estimates_1.default);
app.use('/api/focus', focus_1.default);
app.use('/api/cognitive-load', cognitiveLoad_1.default);
app.use('/api/cognitive-load/auto-split', cognitiveLoadAutoSplit_1.default);
app.use('/api/quiz', quiz_1.default);
app.use('/api/weak-topics', weakTopics_1.default);
app.use('/api/gap-detector', gapDetector_1.default);
app.use('/api/digital-twin', digitalTwin_1.default);
app.use('/api/exam-predict', examPredict_1.default);
app.use('/api/study-insights', studyInsights_1.default);
app.use('/api/voice-input', voiceInput_1.default);
app.use('/api/study-strategy', studyStrategy_1.default);
// Initialize vector database (Qdrant)
async function initializeServer() {
    try {
        await (0, db_1.connectDB)();
        // Initialize Qdrant vector collection in background
        (0, vectorService_1.initializeVectorCollection)().catch(err => {
            console.warn('⚠️  Qdrant initialization failed - falling back to MongoDB-only vector storage');
        });
        // Schedule weekly digital twin updates
        (0, weeklyScheduler_1.scheduleWeeklyDigitalTwinJob)();
        app.get('/health', (_req, res) => {
            res.json({ ok: true, message: 'Smart Study Planner API is running 🚀' });
        });
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📍 Vector embeddings powered by Xenova + Qdrant`);
            console.log(`🧠 AI Digital Twin weekly updates scheduled`);
        });
    }
    catch (error) {
        console.error('❌ Server initialization failed:', error);
        process.exit(1);
    }
}
initializeServer();
