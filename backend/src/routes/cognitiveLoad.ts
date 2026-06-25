import { Router } from 'express';
import { CognitiveLoadModel } from '../models/CognitiveLoad';
import { callLLM } from '../utils/aiProvider';

const router = Router();

// POST /api/cognitive-load/track - Log learning signals for a topic
router.post('/track', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId, topic, timeSpentMinutes, quizAccuracy, pauseCount, rewindCount } = req.body as {
      userId?: string;
      syllabusId: string;
      topic: string;
      timeSpentMinutes: number;
      quizAccuracy?: number;
      pauseCount?: number;
      rewindCount?: number;
    };

    if (!syllabusId || !topic) {
      res.status(400).json({ error: 'syllabusId and topic are required' });
      return;
    }

    // Find or create cognitive load record
    let record = await CognitiveLoadModel.findOne({ userId, syllabusId, topic });

    if (!record) {
      record = await CognitiveLoadModel.create({
        userId,
        syllabusId,
        topic,
        signals: [],
        averageTimeOnTopic: 0,
        averageQuizAccuracy: 0,
        totalPauseCount: 0,
      });
    }

    // Add new signal
    const newSignal = {
      topic,
      timeSpentMinutes,
      quizAccuracy: quizAccuracy || 0,
      pauseCount: pauseCount || 0,
      rewindCount: rewindCount || 0,
      sessionCount: 1,
      lastStudiedAt: new Date().toISOString(),
    };

    record.signals.push(newSignal);

    // Update averages
    const totalSessions = record.signals.length;
    record.averageTimeOnTopic = record.signals.reduce((sum, s) => sum + s.timeSpentMinutes, 0) / totalSessions;
    
    const accuracySignals = record.signals.filter(s => s.quizAccuracy !== undefined && s.quizAccuracy > 0);
    record.averageQuizAccuracy = accuracySignals.length > 0 
      ? accuracySignals.reduce((sum, s) => sum + (s.quizAccuracy || 0), 0) / accuracySignals.length 
      : 0;
    
    record.totalPauseCount = record.signals.reduce((sum, s) => sum + (s.pauseCount || 0), 0);

    await record.save();

    res.json({ ok: true, record });
  } catch (err) {
    console.error('Cognitive load track error', err);
    res.status(500).json({ error: 'Failed to track cognitive load' });
  }
});

// GET /api/cognitive-load/by-syllabus/:id - Get all cognitive load data for a syllabus
router.get('/by-syllabus/:id', async (req, res): Promise<void> => {
  try {
    const syllabusId = req.params.id;
    const userId = (req.query.userId as string) || 'anonymous';

    const records = await CognitiveLoadModel.find({ userId, syllabusId }).lean();
    
    // Calculate overall stats
    const totalTopics = records.length;
    const highLoadTopics = records.filter(r => (r.cognitiveLoadScore || 0) > 75).length;
    const averageLoad = records.length > 0 
      ? records.reduce((sum, r) => sum + (r.cognitiveLoadScore || 0), 0) / records.length 
      : 0;

    res.json({ 
      ok: true, 
      records,
      stats: {
        totalTopics,
        highLoadTopics,
        averageLoad: Math.round(averageLoad),
      }
    });
  } catch (err) {
    console.error('Get cognitive load error', err);
    res.status(500).json({ error: 'Failed to load cognitive load data' });
  }
});

// POST /api/cognitive-load/analyze - Trigger Claude AI analysis
router.post('/analyze', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId } = req.body as {
      userId?: string;
      syllabusId: string;
    };

    if (!syllabusId) {
      res.status(400).json({ error: 'syllabusId is required' });
      return;
    }

    const records = await CognitiveLoadModel.find({ userId, syllabusId });
    
    if (records.length === 0) {
      res.status(400).json({ error: 'No cognitive load data found' });
      return;
    }

    // Prepare data for Claude
    const topicsData = records.map(r => ({
      topic: r.topic,
      avgTimeMinutes: Math.round(r.averageTimeOnTopic),
      avgAccuracy: Math.round(r.averageQuizAccuracy),
      totalPauses: r.totalPauseCount,
      sessions: r.signals.length,
    }));

    // Call AI provider
    try {
      const system = 'You are an educational psychologist analyzing cognitive load. Return JSON only with shape: { "topics": Array<{ "topic": string, "cognitiveLoadScore": number (0-100), "difficultyLevel": "easy|medium|hard|very-hard", "shouldSplit": boolean, "splitSuggestions": string[] }> }';
      const prompt = `Analyze cognitive load for these study topics:\n\n${JSON.stringify(topicsData, null, 2)}\n\nConsider:\n- High time + low accuracy = high cognitive load\n- Many pauses = confusion/difficulty\n- Multiple sessions needed = complexity\n\nReturn detailed analysis with recommendations for splitting difficult topics.`;
      const content = await callLLM(system, prompt, { maxTokens: 1500, temperature: 0, jsonMode: true });
      const analysis = JSON.parse(content);
      const topicsAnalysis = analysis.topics || [];

      const updatePromises = records.map(async (record) => {
        const topicAnalysis = topicsAnalysis.find((t: any) => t.topic === record.topic);
        if (topicAnalysis) {
          record.cognitiveLoadScore = topicAnalysis.cognitiveLoadScore;
          record.difficultyLevel = topicAnalysis.difficultyLevel;
          record.shouldSplit = topicAnalysis.shouldSplit;
          record.splitSuggestions = topicAnalysis.splitSuggestions || [];
        }
        return record.save();
      });

      await Promise.all(updatePromises);
      res.json({ ok: true, records });
    } catch {
      // Fallback: simple heuristic-based analysis
      records.forEach(record => {
        const score = calculateHeuristicScore(record);
        record.cognitiveLoadScore = score;
        record.difficultyLevel = getDifficultyLevel(score);
        record.shouldSplit = score > 75;
        record.splitSuggestions = score > 75 ? [`Break ${record.topic} into smaller sub-topics`] : [];
      });
      await Promise.all(records.map(r => r.save()));
      res.json({ ok: true, records, note: 'Used heuristic analysis (AI unavailable)' });
    }
  } catch (err) {
    console.error('Cognitive load analyze error', err);
    res.status(500).json({ error: 'Failed to analyze cognitive load' });
  }
});

// Helper functions for fallback
function calculateHeuristicScore(record: any): number {
  const timeFactor = Math.min(record.averageTimeOnTopic / 60, 1) * 30; // Max 30 points
  const accuracyFactor = (100 - record.averageQuizAccuracy) / 100 * 40; // Max 40 points
  const pauseFactor = Math.min(record.totalPauseCount / 10, 1) * 30; // Max 30 points
  
  return Math.round(timeFactor + accuracyFactor + pauseFactor);
}

function getDifficultyLevel(score: number): 'easy' | 'medium' | 'hard' | 'very-hard' {
  if (score <= 25) return 'easy';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'hard';
  return 'very-hard';
}

export default router;
