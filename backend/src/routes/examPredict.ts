import { Router } from 'express';
import { ExamPredictionModel } from '../models/ExamPrediction';
import { createOrUpdateExamPrediction } from '../utils/examPredictor';

const router = Router();

// GET /api/exam-predict/:syllabusId - Get exam prediction
router.get('/:syllabusId', async (req, res): Promise<void> => {
  try {
    const { syllabusId } = req.params;
    const userId = (req.query.userId as string) || 'anonymous';

    const prediction = await ExamPredictionModel.findOne({ userId, syllabusId })
      .sort({ createdAt: -1 })
      .lean();

    if (!prediction) {
      res.json({
        ok: true,
        message: 'No prediction found. Generate one first.',
        requiresGeneration: true,
      });
      return;
    }

    res.json({
      ok: true,
      prediction,
    });
  } catch (err) {
    console.error('Get exam prediction error:', err);
    res.status(500).json({ error: 'Failed to load exam prediction' });
  }
});

// POST /api/exam-predict/:syllabusId/generate - Generate/update exam prediction
router.post('/:syllabusId/generate', async (req, res): Promise<void> => {
  try {
    const { syllabusId } = req.params;
    const { userId = 'anonymous' } = req.body as { userId?: string };

    // Generate new prediction
    const prediction = await createOrUpdateExamPrediction(userId, syllabusId);

    res.json({
      ok: true,
      prediction,
      message: 'Exam prediction generated successfully',
    });
  } catch (err) {
    console.error('Generate exam prediction error:', err);
    res.status(500).json({ error: 'Failed to generate exam prediction' });
  }
});

// GET /api/exam-predict/:syllabusId/quick-stats - Get quick readiness stats
router.get('/:syllabusId/quick-stats', async (req, res): Promise<void> => {
  try {
    const { syllabusId } = req.params;
    const userId = (req.query.userId as string) || 'anonymous';

    const prediction = await ExamPredictionModel.findOne({ userId, syllabusId })
      .sort({ createdAt: -1 })
      .select('readinessPercentage predictedScoreRange trend confidenceLevel examReadinessLabel')
      .lean();

    if (!prediction) {
      res.json({
        ok: true,
        stats: {
          readinessPercentage: 0,
          predictedScoreRange: { min: 0, max: 0, mostLikely: 0 },
          trend: 'stable' as const,
          confidenceLevel: 0,
          examReadinessLabel: 'Not Available',
        },
      });
      return;
    }

    res.json({
      ok: true,
      stats: {
        readinessPercentage: prediction.readinessPercentage,
        predictedScoreRange: prediction.predictedScoreRange,
        trend: prediction.trend,
        confidenceLevel: prediction.confidenceLevel,
        examReadinessLabel: prediction.examReadinessLabel,
      },
    });
  } catch (err) {
    console.error('Get quick stats error:', err);
    res.status(500).json({ error: 'Failed to load quick stats' });
  }
});

// GET /api/exam-predict/:syllabusId/trend - Get readiness trend history
router.get('/:syllabusId/trend', async (req, res): Promise<void> => {
  try {
    const { syllabusId } = req.params;
    const userId = (req.query.userId as string) || 'anonymous';
    const limit = parseInt(req.query.limit as string) || 8;

    const predictions = await ExamPredictionModel.find({ userId, syllabusId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('readinessPercentage predictedScoreRange trend historicalTrends createdAt')
      .lean();

    if (!predictions.length) {
      res.json({
        ok: true,
        trend: [],
        count: 0,
      });
      return;
    }

    // Extract trend data points
    const trendData = predictions.map((pred, index) => ({
      weekNumber: predictions.length - index,
      readinessPercentage: pred.readinessPercentage,
      predictedScore: pred.predictedScoreRange.mostLikely,
      trend: pred.trend,
      date: pred.createdAt,
      weekLabel: `Week ${predictions.length - index}`,
    })).reverse();

    res.json({
      ok: true,
      trend: trendData,
      count: trendData.length,
      currentReadiness: predictions[0].readinessPercentage,
      weeklyChange: predictions.length > 1 
        ? predictions[0].readinessPercentage - predictions[1].readinessPercentage 
        : 0,
    });
  } catch (err) {
    console.error('Get trend error:', err);
    res.status(500).json({ error: 'Failed to load trend data' });
  }
});

export default router;
