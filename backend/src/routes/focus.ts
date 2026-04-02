import { Router } from 'express';
import { FocusSessionModel } from '../models/FocusSession';

const router = Router();

// POST /api/focus - Log completed session
router.post('/', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', planId, topic, startTime, endTime, actualMinutes, distractions, deepWorkSeconds } = req.body as {
      userId?: string;
      planId: string;
      topic: string;
      startTime: string;
      endTime: string;
      actualMinutes: number;
      distractions?: number;
      deepWorkSeconds?: number;
    };

    if (!topic || !planId) {
      res.status(400).json({ error: 'topic and planId are required' });
      return;
    }

    const session = await FocusSessionModel.create({
      userId,
      planSessionId: planId,
      topic,
      startTime,
      endTime,
      totalSeconds: actualMinutes * 60,
      distractionCount: distractions || 0,
      deepWorkSeconds: deepWorkSeconds || 0,
      status: 'finished',
      events: [
        { type: 'start', at: startTime },
        { type: 'end', at: endTime },
      ],
    });

    res.json({ ok: true, session });
  } catch (err) {
    console.error('Focus log error', err);
    res.status(500).json({ error: 'Failed to log focus session' });
  }
});

// GET /api/focus/analytics - Get user analytics
router.get('/analytics', async (req, res): Promise<void> => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const sessions = await FocusSessionModel.find({ userId, status: 'finished' }).lean();
    
    if (!sessions.length) {
      res.json({ ok: true, stats: {
        totalSessions: 0,
        completedSessions: 0,
        totalMinutes: 0,
        averageFocusScore: 0,
        totalDistractions: 0,
        weeklyTrend: [],
      }});
      return;
    }

    // Calculate stats
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'finished').length;
    const totalMinutes = sessions.reduce((sum, s) => sum + Math.floor((s.totalSeconds || 0) / 60), 0);
    const totalDistractions = sessions.reduce((sum, s) => sum + (s.distractionCount || 0), 0);
    
    // Calculate average focus score
    const focusScores = sessions.map(s => {
      const deepWork = s.deepWorkSeconds || 0;
      const totalTime = deepWork + ((s.distractionCount || 0) * 60);
      return totalTime > 0 ? Math.round((deepWork / totalTime) * 100) : 0;
    });
    const averageFocusScore = Math.round(
      focusScores.reduce((a, b) => a + b, 0) / focusScores.length
    );

    // Weekly trend
    const weeklyData: { [key: string]: any } = {};
    sessions.forEach(session => {
      const date = new Date(session.startTime);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { sessions: 0, minutes: 0, focusScores: [] };
      }
      
      weeklyData[weekKey].sessions += 1;
      weeklyData[weekKey].minutes += Math.floor((session.totalSeconds || 0) / 60);
      const deepWork = session.deepWorkSeconds || 0;
      const totalTime = deepWork + ((session.distractionCount || 0) * 60);
      weeklyData[weekKey].focusScores.push(
        totalTime > 0 ? Math.round((deepWork / totalTime) * 100) : 0
      );
    });

    const weeklyTrend = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, data]: [string, any]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: data.sessions,
        minutes: Math.round(data.minutes),
        focusScore: Math.round(data.focusScores.reduce((a: number, b: number) => a + b, 0) / data.focusScores.length),
      }));

    res.json({ ok: true, stats: {
      totalSessions,
      completedSessions,
      totalMinutes,
      averageFocusScore,
      totalDistractions,
      weeklyTrend,
    }});
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

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

