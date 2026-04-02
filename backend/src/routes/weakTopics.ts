import { Router } from 'express';
import { WeakTopicModel } from '../models/WeakTopic';
import { StudyPlanModel } from '../models/StudyPlan';

const router = Router();

// POST /api/weak-topics/auto-adjust-schedule - Increase time for weak topics
router.post('/auto-adjust-schedule', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId, planId } = req.body as {
      userId?: string;
      syllabusId: string;
      planId?: string;
    };

    if (!syllabusId) {
      res.status(400).json({ error: 'syllabusId is required' });
      return;
    }

    // Get all weak topics with their multipliers
    const weakTopics = await WeakTopicModel.find({ 
      userId, 
      syllabusId, 
      isWeak: true 
    });

    if (weakTopics.length === 0) {
      res.json({ 
        ok: true, 
        message: 'No weak topics found - schedule is optimal',
        adjustedSessions: 0 
      });
      return;
    }

    let adjustedSessions = 0;

    if (planId) {
      // Adjust specific plan
      const plan = await StudyPlanModel.findOne({ _id: planId, userId });
      if (plan) {
        adjustedSessions = adjustPlanSessions(plan, weakTopics);
        await plan.save();
      }
    } else {
      // Adjust all plans for this syllabus
      const plans = await StudyPlanModel.find({ userId, syllabusId });
      
      for (const plan of plans) {
        adjustedSessions += adjustPlanSessions(plan, weakTopics);
        await plan.save();
      }
    }

    res.json({
      ok: true,
      message: `Adjusted ${adjustedSessions} sessions for weak topics`,
      adjustedSessions,
      weakTopicsCount: weakTopics.length,
      weakTopics: weakTopics.map(t => ({
        topic: t.topic,
        priority: t.priorityLevel,
        multiplier: t.timeAllocationMultiplier,
      })),
    });
  } catch (err) {
    console.error('Auto-adjust schedule error', err);
    res.status(500).json({ error: 'Failed to auto-adjust schedule' });
  }
});

// Helper function to adjust plan sessions
function adjustPlanSessions(plan: any, weakTopics: any[]): number {
  const sessions = plan.sessions || [];
  let adjustedCount = 0;

  weakTopics.forEach(weakTopic => {
    const multiplier = weakTopic.timeAllocationMultiplier;
    
    // Find sessions matching this topic (including partial matches)
    sessions.forEach((session: any) => {
      const sessionTopic = session.topic || '';
      const parentTopic = session.parentTopic || '';
      
      // Check if session is for this weak topic
      if (
        sessionTopic.toLowerCase().includes(weakTopic.topic.toLowerCase()) ||
        parentTopic.toLowerCase().includes(weakTopic.topic.toLowerCase()) ||
        weakTopic.topic.toLowerCase().includes(sessionTopic.toLowerCase())
      ) {
        // Increase estimated time
        const originalMinutes = session.estimatedMinutes || 60;
        const newMinutes = Math.round(originalMinutes * multiplier);
        
        session.estimatedMinutes = newMinutes;
        session.wasAdjustedForWeakness = true;
        session.originalEstimatedMinutes = originalMinutes;
        session.priorityLevel = weakTopic.priorityLevel;
        
        adjustedCount++;
      }
    });
  });

  plan.sessions = sessions;
  plan.markModified('sessions');
  
  return adjustedCount;
}

// GET /api/weak-topics/by-syllabus/:id - Get all weak topics for a syllabus
router.get('/by-syllabus/:id', async (req, res): Promise<void> => {
  try {
    const syllabusId = req.params.id;
    const userId = (req.query.userId as string) || 'anonymous';

    const weakTopics = await WeakTopicModel.find({ userId, syllabusId })
      .sort({ confidenceScore: 1, priorityLevel: 1 })
      .lean();

    const stats = {
      totalTopics: weakTopics.length,
      criticalCount: weakTopics.filter(t => t.priorityLevel === 'critical').length,
      highCount: weakTopics.filter(t => t.priorityLevel === 'high').length,
      mediumCount: weakTopics.filter(t => t.priorityLevel === 'medium').length,
      lowCount: weakTopics.filter(t => t.priorityLevel === 'low').length,
      averageConfidence: weakTopics.length > 0
        ? Math.round(weakTopics.reduce((sum, t) => sum + t.confidenceScore, 0) / weakTopics.length)
        : 100,
    };

    res.json({
      ok: true,
      weakTopics,
      stats,
    });
  } catch (err) {
    console.error('Get weak topics error', err);
    res.status(500).json({ error: 'Failed to load weak topics' });
  }
});

export default router;
