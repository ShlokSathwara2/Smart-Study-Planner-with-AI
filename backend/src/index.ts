import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import syllabusRouter from './routes/syllabus';
import topicGraphRouter from './routes/topicGraph';
import studyPlanRouter from './routes/studyPlan';
import estimatesRouter from './routes/estimates';
import focusRouter from './routes/focus';
import cognitiveLoadRouter from './routes/cognitiveLoad';
import cognitiveLoadAutoSplitRouter from './routes/cognitiveLoadAutoSplit';
import quizRouter from './routes/quiz';
import weakTopicsRouter from './routes/weakTopics';
import gapDetectorRouter from './routes/gapDetector';
import digitalTwinRouter from './routes/digitalTwin';
import examPredictRouter from './routes/examPredict';
import studyInsightsRouter from './routes/studyInsights';
import voiceInputRouter from './routes/voiceInput';
import studyStrategyRouter from './routes/studyStrategy';
import userResetRouter from './routes/userReset';
import { initializeVectorCollection } from './utils/vectorService';
import { scheduleWeeklyDigitalTwinJob } from './utils/weeklyScheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  }),
);
app.use(express.json());

app.use('/api/syllabus', syllabusRouter);
app.use('/api/graph', topicGraphRouter);
app.use('/api/plan', studyPlanRouter);
app.use('/api/estimates', estimatesRouter);
app.use('/api/focus', focusRouter);
app.use('/api/cognitive-load', cognitiveLoadRouter);
app.use('/api/cognitive-load/auto-split', cognitiveLoadAutoSplitRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/weak-topics', weakTopicsRouter);
app.use('/api/gap-detector', gapDetectorRouter);
app.use('/api/digital-twin', digitalTwinRouter);
app.use('/api/exam-predict', examPredictRouter);
app.use('/api/study-insights', studyInsightsRouter);
app.use('/api/voice-input', voiceInputRouter);
app.use('/api/study-strategy', studyStrategyRouter);
app.use('/api/user', userResetRouter);

// Initialize vector database (Qdrant)
async function initializeServer() {
  try {
    await connectDB();
    
    // Initialize Qdrant vector collection in background
    initializeVectorCollection().catch(err => {
      console.warn('⚠️  Qdrant initialization failed - falling back to MongoDB-only vector storage');
    });

    // Schedule weekly digital twin updates
    scheduleWeeklyDigitalTwinJob();

    app.get('/health', (_req, res) => {
      res.json({ ok: true, message: 'Smart Study Planner API is running 🚀' });
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📍 Vector embeddings powered by Xenova + Qdrant`);
      console.log(`🧠 AI Digital Twin weekly updates scheduled`);
    });
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

initializeServer();

 
