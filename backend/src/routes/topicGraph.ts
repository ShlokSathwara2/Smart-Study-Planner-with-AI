import { Router } from 'express';
import { SyllabusModel } from '../models/Syllabus';
import { TopicDependencyModel } from '../models/TopicDependency';
import { askAIForJSON } from '../utils/aiClient';

const router = Router();

async function analyzeDependenciesWithGemini(topics: string[]) {
  if (topics.length === 0) {
    return [];
  }

  const prompt = `You are mapping prerequisite relationships between topics in a course. Return ONLY JSON: an array of objects like { "topic": string, "dependsOn": string[] } where dependsOn items come from the same topic list.

Given this list of topics, infer a reasonable prerequisite graph.

Topics:
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

  try {
    return await askAIForJSON(prompt);
  } catch {
    console.warn('Gemini dependency API error. Using fallback linear graph.');
    return topics.map((t, i) => ({ topic: t, dependsOn: i > 0 ? [topics[i - 1]] : [] }));
  }
}

// POST /api/graph/from-syllabus/:id
router.post(
  '/from-syllabus/:id',
  async (req, res): Promise<void> => {
    try {
      const syllabusId = req.params.id;
      const userId = (req.body.userId as string) || 'anonymous';

      const syllabus = await SyllabusModel.findById(syllabusId).lean();
      if (!syllabus) {
        res.status(404).json({ error: 'Syllabus not found' });
        return;
      }

      const topics: string[] = (syllabus as any).analysis?.topics || [];
      if (!topics.length) {
        res.status(400).json({ error: 'No topics found on syllabus analysis' });
        return;
      }

      const deps = await analyzeDependenciesWithGemini(topics);

      // delete old graph for this syllabus
      await TopicDependencyModel.deleteMany({ userId, syllabusId });

      const docs = await TopicDependencyModel.insertMany(
        deps.map((d: any) => ({
          userId,
          syllabusId,
          topic: d.topic,
          dependsOn: Array.isArray(d.dependsOn) ? d.dependsOn : [],
        })),
      );

      res.json({
        ok: true,
        dependencies: docs,
      });
    } catch (err) {
      console.error('Topic graph error', err);
      res.status(500).json({ error: 'Failed to build topic dependency graph' });
    }
  },
);

// GET /api/graph/by-syllabus/:id
router.get(
  '/by-syllabus/:id',
  async (req, res): Promise<void> => {
    try {
      const syllabusId = req.params.id;
      const userId = (req.query.userId as string) || 'anonymous';

      const deps = await TopicDependencyModel.find({ userId, syllabusId }).lean();
      res.json({ ok: true, dependencies: deps });
    } catch (err) {
      console.error('Get topic graph error', err);
      res.status(500).json({ error: 'Failed to load topic dependency graph' });
    }
  },
);

export default router;

