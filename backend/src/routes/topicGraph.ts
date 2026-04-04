import { Router } from 'express';
import { SyllabusModel } from '../models/Syllabus';
import { TopicDependencyModel } from '../models/TopicDependency';

const router = Router();

async function analyzeDependenciesWithClaude(topics: string[]) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || topics.length === 0) {
    return [];
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      temperature: 0,
      system:
        'You are mapping prerequisite relationships between topics in a course. Return ONLY JSON: an array of objects like { "topic": string, "dependsOn": string[] } where dependsOn items come from the same topic list.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Given this list of topics, infer a reasonable prerequisite graph.\n\nTopics:\n${topics
                .map((t, i) => `${i + 1}. ${t}`)
                .join('\n')}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`Claude dependency API error: ${response.status}. Using fallback linear graph.`);
    return topics.map((t, i) => ({ topic: t, dependsOn: i > 0 ? [topics[i - 1]] : [] }));
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
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

      const deps = await analyzeDependenciesWithClaude(topics);

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

