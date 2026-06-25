import { Router } from 'express';
import { TopicDependencyModel } from '../models/TopicDependency';
import { TopicEstimateModel } from '../models/TopicEstimate';
import { StudyPlanModel } from '../models/StudyPlan';
import { callLLM } from '../utils/aiProvider';

const router = Router();

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

async function computeUserPace(userId: string): Promise<{
  paceMinutesPerHour: number | null;
  observedSessions: number;
}> {
  const plans = await StudyPlanModel.find({ userId }).lean();
  let totalActualMinutes = 0;
  let count = 0;

  for (const p of plans as any[]) {
    const sessions = Array.isArray(p.sessions) ? p.sessions : [];
    for (const s of sessions) {
      if (s?.status === 'done' || s?.status === 'partial') {
        const minutes = Number(s?.actualMinutes);
        if (!Number.isNaN(minutes) && minutes > 0) {
          totalActualMinutes += minutes;
          count += 1;
        }
      }
    }
  }

  if (count === 0) return { paceMinutesPerHour: null, observedSessions: 0 };

  const avgMinutesPerSession = totalActualMinutes / count;
  // interpret "pace" as minutes completed per 60-minute planned hour.
  // If user typically does 45 minutes of real work per session, paceMinutesPerHour = 45.
  return {
    paceMinutesPerHour: clamp(avgMinutesPerSession, 15, 60),
    observedSessions: count,
  };
}

async function estimateWithAI(input: {
  topics: string[];
  paceMinutesPerHour: number | null;
  observedSessions: number;
}) {
  const paceLine =
    input.paceMinutesPerHour == null
      ? 'No historical pace yet.'
      : `Historical pace: ~${Math.round(input.paceMinutesPerHour)} focused minutes per hour block (based on ${input.observedSessions} logged sessions).`;

  const system = 'Return JSON only: an array of { "topic": string, "estimatedHours": number, "confidence": number }. Confidence is 0-100. estimatedHours is realistic study time needed for a typical student, adjusted by provided historical pace.';
  const prompt = `Estimate required study time for each topic.\n\n${paceLine}\n\nTopics:\n${input.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

  try {
    const content = await callLLM(system, prompt, { maxTokens: 1200, temperature: 0, jsonMode: true });
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn('AI estimate error, using default estimates');
    return input.topics.map((t) => ({
      topic: t,
      estimatedHours: 2,
      confidence: 30,
    }));
  }
}

// POST /api/estimates/refresh
router.post('/refresh', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId } = req.body as {
      userId?: string;
      syllabusId: string;
    };

    if (!syllabusId) {
      res.status(400).json({ error: 'syllabusId is required' });
      return;
    }

    const deps = await TopicDependencyModel.find({ userId, syllabusId }).lean();
    const topics = Array.from(new Set(deps.map((d: any) => String(d.topic)))).filter(Boolean);
    if (!topics.length) {
      res.status(400).json({ error: 'No topics found. Build topic graph first.' });
      return;
    }

    const pace = await computeUserPace(userId);
    const estimates = await estimateWithAI({
      topics,
      paceMinutesPerHour: pace.paceMinutesPerHour,
      observedSessions: pace.observedSessions,
    });

    // upsert
    const ops = estimates.map((e: any) => ({
      updateOne: {
        filter: { userId, syllabusId, topic: e.topic },
        update: {
          $set: {
            estimatedHours: Number(e.estimatedHours) || 0,
            confidence: clamp(Number(e.confidence) || 0, 0, 100),
            basis: {
              paceMinutesPerHour: pace.paceMinutesPerHour ?? 0,
              observedSessions: pace.observedSessions,
            },
          },
        },
        upsert: true,
      },
    }));

    if (ops.length) {
      await TopicEstimateModel.bulkWrite(ops);
    }

    const saved = await TopicEstimateModel.find({ userId, syllabusId }).lean();
    res.json({ ok: true, pace, estimates: saved });
  } catch (err) {
    console.error('Refresh estimates error', err);
    res.status(500).json({ error: 'Failed to refresh topic estimates' });
  }
});

// GET /api/estimates/by-syllabus/:id?userId=...
router.get('/by-syllabus/:id', async (req, res): Promise<void> => {
  try {
    const syllabusId = req.params.id;
    const userId = (req.query.userId as string) || 'anonymous';
    const estimates = await TopicEstimateModel.find({ userId, syllabusId }).lean();
    res.json({ ok: true, estimates });
  } catch (err) {
    console.error('Get estimates error', err);
    res.status(500).json({ error: 'Failed to load topic estimates' });
  }
});

export default router;

