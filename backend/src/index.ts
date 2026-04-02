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

connectDB();

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Smart Study Planner API is running 🚀' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

 
