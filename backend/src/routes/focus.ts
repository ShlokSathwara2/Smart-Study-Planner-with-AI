import { Router } from 'express';
import { FocusSessionModel } from '../models/FocusSession';

const router = Router();

// POST /api/focus/start
router.post('/start', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', topic, planSessionId } = req.body as {
      userId?: string;
      topic: string;
      planSessionId?: string;
    };

    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ error: 'topic is required' });
      return;
    }

    const now = new Date().toISOString();
    const session = await FocusSessionModel.create({
      userId,
      topic,
      planSessionId,
      startTime: now,
      status: 'running',
      events: [{ type: 'start', at: now }],
    });

    res.json({ ok: true, session });
  } catch (err) {
    console.error('Focus start error', err);
    res.status(500).json({ error: 'Failed to start focus session' });
  }
});

// PATCH /api/focus/:id
router.patch('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      userId = 'anonymous',
      status,
      totalSeconds,
      deepWorkSeconds,
      distractionCount,
      eventType,
    } = req.body as {
      userId?: string;
      status?: 'running' | 'paused' | 'finished';
      totalSeconds?: number;
      deepWorkSeconds?: number;
      distractionCount?: number;
      eventType?: 'pause' | 'resume' | 'end' | 'visibility-hidden' | 'visibility-visible';
    };

    const session = await FocusSessionModel.findOne({ _id: id, userId });
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const now = new Date().toISOString();
    if (typeof totalSeconds === 'number') session.totalSeconds = totalSeconds;
    if (typeof deepWorkSeconds === 'number') session.deepWorkSeconds = deepWorkSeconds;
    if (typeof distractionCount === 'number') session.distractionCount = distractionCount;
    if (status) {
      session.status = status;
      if (status === 'finished') {
        session.endTime = now;
      }
    }
    if (eventType) {
      session.events.push({ type: eventType, at: now });
    }

    await session.save();
    res.json({ ok: true, session });
  } catch (err) {
    console.error('Focus update error', err);
    res.status(500).json({ error: 'Failed to update focus session' });
  }
});

// GET /api/focus/:id
router.get('/:id', async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId = 'anonymous' } = req.query as { userId?: string };
    const session = await FocusSessionModel.findOne({ _id: id, userId }).lean();
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ ok: true, session });
  } catch (err) {
    console.error('Focus get error', err);
    res.status(500).json({ error: 'Failed to load focus session' });
  }
});

export default router;

