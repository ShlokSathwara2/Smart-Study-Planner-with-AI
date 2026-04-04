import { Router } from 'express';
import { SyllabusModel } from '../models/Syllabus';
import { StudyPlanModel } from '../models/StudyPlan';
import { TopicDependencyModel } from '../models/TopicDependency';
import { QuizResultModel } from '../models/QuizResult';
import { WeakTopicModel } from '../models/WeakTopic';

const router = Router();

// DELETE /api/user/reset  — wipes all data for a userId
router.delete('/reset', async (req, res): Promise<void> => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  try {
    const [syllabi, plans, deps, quizzes, weakTopics] = await Promise.allSettled([
      SyllabusModel.deleteMany({ userId }),
      StudyPlanModel.deleteMany({ userId }),
      TopicDependencyModel.deleteMany({ userId }),
      QuizResultModel.deleteMany({ userId }),
      WeakTopicModel.deleteMany({ userId }),
    ]);

    console.log(`🗑️  Reset all data for user: ${userId}`);
    res.json({ ok: true, message: 'All user data has been reset.' });
  } catch (err) {
    console.error('User reset error', err);
    res.status(500).json({ error: 'Failed to reset user data' });
  }
});

export default router;
