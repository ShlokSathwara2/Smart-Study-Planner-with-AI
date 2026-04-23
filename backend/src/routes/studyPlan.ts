import { Router } from 'express';
import { TopicDependencyModel } from '../models/TopicDependency';
import { StudyPlanModel } from '../models/StudyPlan';
import { DigitalTwinModel } from '../models/DigitalTwin';
import { getDigitalTwinContext, formatDigitalTwinPrompt } from '../utils/digitalTwinContext';
import { 
  getGoogleAuthUrl, 
  getAccessToken, 
  getCalendarEvents, 
  checkClash, 
  createCalendarEvents,
  findAvailableSlots 
} from '../utils/googleCalendar';

const router = Router();

function isValidYyyyMmDd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayYyyyMmDd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sessionsOverlap(
  a: { date: string; startTime: string; endTime: string },
  b: { date: string; startTime: string; endTime: string },
) {
  if (a.date !== b.date) return false;
  const aStart = a.startTime;
  const aEnd = a.endTime;
  const bStart = b.startTime;
  const bEnd = b.endTime;
  return aStart < bEnd && bStart < aEnd;
}

async function generatePlanWithClaude(input: {
  topics: { topic: string; dependsOn: string[] }[];
  examDate: string;
  dailyHours: number;
  userId?: string;
  syllabusId?: string;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // fallback: simple single-day plan
    return {
      sessions: [
        {
          date: input.examDate,
          startTime: '18:00',
          endTime: '19:00',
          topic: input.topics[0]?.topic || 'Getting started',
          estimatedMinutes: 60,
        },
      ],
    };
  }

  // Get digital twin context if available
  let digitalTwinPrompt = '';
  if (input.userId && input.syllabusId) {
    const twinContext = await getDigitalTwinContext(input.userId, input.syllabusId);
    if (twinContext) {
      digitalTwinPrompt = '\n\n' + formatDigitalTwinPrompt(twinContext);
    }
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
      max_tokens: 1200,
      temperature: 0,
      system:
        'You are an expert study planner. Return JSON only with shape: { "sessions": Array<{ "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "topic": string, "unit"?: string, "estimatedMinutes": number }> }. Ensure sessions do not overlap within the same day, and total per day <= dailyHours.' + digitalTwinPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Create a day-by-day study schedule.\n\nInputs:\n- examDate: ${input.examDate}\n- dailyHours: ${input.dailyHours}\n- topics with prerequisites:\n${input.topics
                .map((t) => `- ${t.topic} (requires: ${t.dependsOn.join(', ') || 'none'})`)
                .join('\n')}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`Claude plan API error: ${response.status}. Using fallback mock plan.`);
    let hour = 18;
    const d = new Date(input.examDate);
    return {
      sessions: input.topics.map((t, idx) => {
        const sessionDate = new Date(d);
        sessionDate.setDate(d.getDate() - (input.topics.length - idx)); // spread backward from exam date
        const yyyy = sessionDate.getFullYear();
        const mm = String(sessionDate.getMonth() + 1).padStart(2, '0');
        const dd = String(sessionDate.getDate()).padStart(2, '0');
        const session = {
          date: `${yyyy}-${mm}-${dd}`,
          startTime: `${String(hour).padStart(2, '0')}:00`,
          endTime: `${String(hour + 1).padStart(2, '0')}:00`,
          topic: t.topic,
          estimatedMinutes: 60,
        };
        hour = (hour + 1) > 22 ? 18 : hour + 1;
        return session;
      })
    };
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;

  try {
    return JSON.parse(content);
  } catch {
    return { sessions: [] };
  }
}

async function rescheduleWithClaude(input: {
  examDate: string;
  dailyHours: number;
  fromDate: string;
  remainingSessions: any[];
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // fallback: keep same sessions
    return { sessions: input.remainingSessions };
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
      max_tokens: 1400,
      temperature: 0,
      system:
        'You are rescheduling a study plan. Return JSON only: { "sessions": Array<{ "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "topic": string, "unit"?: string, "estimatedMinutes": number }> }. Constraints: dates must be between fromDate and examDate inclusive, no overlaps per day, total per day <= dailyHours.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Reschedule remaining sessions into a recovery plan.\n\nfromDate: ${input.fromDate}\nexamDate: ${input.examDate}\ndailyHours: ${input.dailyHours}\n\nRemaining sessions (keep topics, you may adjust time slots):\n${input.remainingSessions
                .map(
                  (s) =>
                    `- ${s.topic} (${s.estimatedMinutes}m) originally ${s.date} ${s.startTime}-${s.endTime}`,
                )
                .join('\n')}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`Claude reschedule API error: ${response.status}. Keeping existing remaining sessions.`);
    return { sessions: input.remainingSessions };
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;
  try {
    return JSON.parse(content);
  } catch {
    return { sessions: input.remainingSessions };
  }
}

router.post('/generate', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId, examDate, dailyHours } = req.body as {
      userId?: string;
      syllabusId: string;
      examDate: string;
      dailyHours: number;
    };

    if (!syllabusId) {
      res.status(400).json({ error: 'syllabusId is required' });
      return;
    }
    if (!isValidYyyyMmDd(examDate)) {
      res.status(400).json({ error: 'examDate must be YYYY-MM-DD' });
      return;
    }
    if (!dailyHours || Number.isNaN(Number(dailyHours)) || Number(dailyHours) <= 0 || Number(dailyHours) > 16) {
      res.status(400).json({ error: 'dailyHours must be between 0 and 16' });
      return;
    }

    const deps = await TopicDependencyModel.find({ userId, syllabusId }).lean();
    const topics = deps.map((d) => ({ topic: (d as any).topic, dependsOn: (d as any).dependsOn || [] }));
    if (!topics.length) {
      res.status(400).json({ error: 'No topic graph found for this syllabus. Build Phase 4 graph first.' });
      return;
    }

    const planJson = await generatePlanWithClaude({ 
      topics, 
      examDate, 
      dailyHours: Number(dailyHours),
      userId,
      syllabusId
    });
    const sessions = Array.isArray((planJson as any).sessions) ? (planJson as any).sessions : [];

    // basic validation & internal clash detection
    const clashes: Array<{ a: any; b: any }> = [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s?.date || !s?.startTime || !s?.endTime || !s?.topic) continue;
      for (let j = i + 1; j < sessions.length; j++) {
        const t = sessions[j];
        if (!t?.date || !t?.startTime || !t?.endTime) continue;
        if (sessionsOverlap(s, t)) {
          clashes.push({ a: s, b: t });
        }
      }
    }

    const saved = await StudyPlanModel.create({
      userId,
      syllabusId,
      examDate,
      dailyHours: Number(dailyHours),
      sessions,
    });

    res.json({ ok: true, plan: saved, clashes });
  } catch (err) {
    console.error('Generate plan error', err);
    res.status(500).json({ error: 'Failed to generate study plan' });
  }
});

// GET /api/plan/latest - Get latest plan for user/syllabus
// IMPORTANT: Must be declared BEFORE /:planId routes to avoid shadowing
router.get('/latest', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId } = req.query as any;
    if (!syllabusId) {
      res.status(400).json({ error: 'syllabusId is required' });
      return;
    }
    const plan = await StudyPlanModel.findOne({ userId, syllabusId }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, plan });
  } catch (err) {
    console.error('Get plan error', err);
    res.status(500).json({ error: 'Failed to load study plan' });
  }
});

// PATCH /api/plan/:planId/session
// Update session status / actual minutes by index (calendar UI)
router.patch('/:planId/session', async (req, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const { userId = 'anonymous', sessionIndex, status, actualMinutes } = req.body as any;

    if (typeof sessionIndex !== 'number' || sessionIndex < 0) {
      res.status(400).json({ error: 'sessionIndex must be a non-negative number' });
      return;
    }
    if (status && !['planned', 'pending', 'done', 'skipped', 'partial'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const plan = await StudyPlanModel.findOne({ _id: planId, userId });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const s = (plan as any).sessions?.[sessionIndex];
    if (!s) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (status) s.status = status;
    if (typeof actualMinutes === 'number') s.actualMinutes = actualMinutes;
    s.loggedAt = new Date().toISOString();

    await plan.save();
    res.json({ ok: true, plan });
  } catch (err) {
    console.error('Log session error', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// PUT /api/plan/:planId/sessions
// Save drag/drop edits to the session list
router.put('/:planId/sessions', async (req, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const { userId = 'anonymous', sessions } = req.body as any;

    if (!Array.isArray(sessions)) {
      res.status(400).json({ error: 'sessions must be an array' });
      return;
    }

    const plan = await StudyPlanModel.findOne({ _id: planId, userId });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    (plan as any).sessions = sessions;
    await plan.save();

    // report internal overlaps
    const clashes: Array<{ a: any; b: any }> = [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s?.date || !s?.startTime || !s?.endTime || !s?.topic) continue;
      for (let j = i + 1; j < sessions.length; j++) {
        const t = sessions[j];
        if (!t?.date || !t?.startTime || !t?.endTime) continue;
        if (sessionsOverlap(s, t)) clashes.push({ a: s, b: t });
      }
    }

    res.json({ ok: true, plan, clashes });
  } catch (err) {
    console.error('Save sessions error', err);
    res.status(500).json({ error: 'Failed to save sessions' });
  }
});

// GET /api/plan/:planId/progress?userId=...
router.get('/:planId/progress', async (req, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const userId = (req.query.userId as string) || 'anonymous';

    const plan = await StudyPlanModel.findOne({ _id: planId, userId }).lean();
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const sessions = Array.isArray((plan as any).sessions) ? (plan as any).sessions : [];
    const today = todayYyyyMmDd();

    const overdue = sessions.filter(
      (s: any) => s?.date < today && (s?.status === 'planned' || !s?.status),
    );

    const overdueDays = Array.from(new Set(overdue.map((s: any) => s.date))).length;

    const doneCount = sessions.filter((s: any) => s?.status === 'done').length;
    const totalCount = sessions.length;

    res.json({
      ok: true,
      behindDays: overdueDays,
      overdueCount: overdue.length,
      doneCount,
      totalCount,
    });
  } catch (err) {
    console.error('Progress error', err);
    res.status(500).json({ error: 'Failed to compute progress' });
  }
});

// POST /api/plan/:planId/reschedule
router.post('/:planId/reschedule', async (req, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const { userId = 'anonymous', fromDate } = req.body as any;

    const plan = await StudyPlanModel.findOne({ _id: planId, userId });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const startFrom = isValidYyyyMmDd(fromDate) ? fromDate : todayYyyyMmDd();
    const sessions = Array.isArray((plan as any).sessions) ? (plan as any).sessions : [];

    // Keep completed/skipped sessions as-is; reschedule planned/partial from startFrom onward + overdue planned
    const fixed = sessions.filter((s: any) => s?.status === 'done' || s?.status === 'skipped');
    const remaining = sessions.filter((s: any) => {
      const status = s?.status ?? 'planned';
      return status !== 'done' && status !== 'skipped';
    });

    const rescheduled = await rescheduleWithClaude({
      examDate: (plan as any).examDate,
      dailyHours: Number((plan as any).dailyHours),
      fromDate: startFrom,
      remainingSessions: remaining.map((s: any) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        topic: s.topic,
        unit: s.unit,
        estimatedMinutes: s.estimatedMinutes,
      })),
    });

    const newSessions = Array.isArray((rescheduled as any).sessions)
      ? (rescheduled as any).sessions
      : remaining;

    // Merge: fixed + new planned sessions
    (plan as any).sessions = [
      ...fixed,
      ...newSessions.map((s: any) => ({
        ...s,
        status: 'planned',
      })),
    ];

    await plan.save();

    res.json({ ok: true, plan });
  } catch (err) {
    console.error('Reschedule error', err);
    res.status(500).json({ error: 'Failed to reschedule plan' });
  }
});

// ========================================
// Phase 5 — Google Calendar Integration
// ========================================

// GET /api/plan/calendar/auth-url?userId=...
// Generate Google OAuth2 authorization URL
router.get('/calendar/auth-url', async (req, res): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'anonymous';
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(500).json({ error: 'Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' });
      return;
    }

    const authUrl = getGoogleAuthUrl(userId);
    res.json({ ok: true, authUrl });
  } catch (err) {
    console.error('Google auth URL error:', err);
    res.status(500).json({ error: 'Failed to generate Google auth URL' });
  }
});

// POST /api/plan/calendar/callback
// Exchange OAuth code for tokens
router.post('/calendar/callback', async (req, res): Promise<void> => {
  try {
    const { code, userId = 'anonymous' } = req.body as any;

    if (!code) {
      res.status(400).json({ error: 'Authorization code required' });
      return;
    }

    const tokens = await getAccessToken(code);
    
    // Store tokens in user's latest plan (or create a settings record)
    const plan = await StudyPlanModel.findOne({ userId }).sort({ createdAt: -1 });
    if (plan) {
      (plan as any).googleCalendarAccessToken = tokens.access_token;
      (plan as any).googleCalendarRefreshToken = tokens.refresh_token || (plan as any).googleCalendarRefreshToken;
      await plan.save();
    }

    res.json({ ok: true, message: 'Google Calendar connected successfully' });
  } catch (err) {
    console.error('Google callback error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google Calendar' });
  }
});

// POST /api/plan/:planId/calendar/sync
// Sync study plan sessions to Google Calendar
router.post('/:planId/calendar/sync', async (req, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const { userId = 'anonymous' } = req.body as any;

    const plan = await StudyPlanModel.findOne({ _id: planId, userId });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const accessToken = (plan as any).googleCalendarAccessToken;
    if (!accessToken) {
      res.status(400).json({ error: 'Google Calendar not connected. Authenticate first.' });
      return;
    }

    const sessions = Array.isArray((plan as any).sessions) ? (plan as any).sessions : [];
    const plannedSessions = sessions.filter((s: any) => s?.date && s?.startTime && s?.endTime && s?.topic);

    // Phase 5: Check for clashes with existing Google Calendar events
    if (plannedSessions.length > 0) {
      const firstDate = plannedSessions[0].date;
      const lastDate = plannedSessions[plannedSessions.length - 1].date;

      try {
        const existingEvents = await getCalendarEvents(accessToken, firstDate, lastDate);
        
        const clashes: Array<{ session: any; clashingEvents: any[] }> = [];
        
        for (const session of plannedSessions) {
          const clash = checkClash(
            { date: session.date, startTime: session.startTime, endTime: session.endTime },
            existingEvents
          );
          
          if (clash.hasClash) {
            clashes.push({ session, clashingEvents: clash.clashingEvents });
          }
        }

        // If clashes found, suggest alternative time slots
        if (clashes.length > 0) {
          const suggestions = clashes.map((clash) => {
            const availableSlots = findAvailableSlots(
              clash.session.date,
              existingEvents,
              Math.ceil(clash.session.estimatedMinutes / 60)
            );
            return {
              topic: clash.session.topic,
              originalTime: `${clash.session.startTime} - ${clash.session.endTime}`,
              clashingWith: clash.clashingEvents.map((e) => e.summary),
              suggestedSlots: availableSlots.slice(0, 2), // Suggest top 2 alternatives
            };
          });

          res.json({
            ok: true,
            hasClashes: true,
            clashCount: clashes.length,
            clashes,
            suggestions,
            message: `${clashes.length} session(s) clash with existing calendar events`,
          });
          return;
        }
      } catch (calendarErr) {
        console.warn('Could not fetch calendar events for clash detection:', calendarErr);
        // Continue with sync even if clash detection fails
      }
    }

    // Create Google Calendar events for all planned sessions
    const results = await createCalendarEvents(
      accessToken,
      plannedSessions.map((s: any) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        topic: s.topic,
      }))
    );

    const eventIds = results
      .filter((r) => r.success && r.eventId)
      .map((r) => r.eventId!);

    (plan as any).googleCalendarEventIds = eventIds;
    (plan as any).calendarSynced = true;
    await plan.save();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({
      ok: true,
      message: `Synced ${successCount} sessions to Google Calendar${failCount > 0 ? ` (${failCount} failed)` : ''}`,
      results,
      eventIds,
    });
  } catch (err) {
    console.error('Calendar sync error:', err);
    res.status(500).json({ error: 'Failed to sync with Google Calendar' });
  }
});

// GET /api/plan/:planId/calendar/clashes
// Check for scheduling clashes without syncing
router.get('/:planId/calendar/clashes', async (req, res): Promise<void> => {
  try {
    const { planId } = req.params;
    const userId = (req.query.userId as string) || 'anonymous';

    const plan = await StudyPlanModel.findOne({ _id: planId, userId });
    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const accessToken = (plan as any).googleCalendarAccessToken;
    if (!accessToken) {
      res.status(400).json({ error: 'Google Calendar not connected' });
      return;
    }

    const sessions = Array.isArray((plan as any).sessions) ? (plan as any).sessions : [];
    
    if (sessions.length === 0) {
      res.json({ ok: true, hasClashes: false, clashes: [] });
      return;
    }

    const firstDate = sessions[0].date;
    const lastDate = sessions[sessions.length - 1].date;

    const existingEvents = await getCalendarEvents(accessToken, firstDate, lastDate);
    
    const clashes: Array<{ session: any; clashingEvents: any[] }> = [];
    
    for (const session of sessions) {
      if (!session?.date || !session?.startTime || !session?.endTime) continue;
      
      const clash = checkClash(
        { date: session.date, startTime: session.startTime, endTime: session.endTime },
        existingEvents
      );
      
      if (clash.hasClash) {
        clashes.push({ session, clashingEvents: clash.clashingEvents });
      }
    }

    // Generate suggestions for clashing sessions
    const suggestions = clashes.map((clash) => {
      const availableSlots = findAvailableSlots(
        clash.session.date,
        existingEvents,
        Math.ceil((clash.session.estimatedMinutes || 60) / 60)
      );
      return {
        topic: clash.session.topic,
        originalTime: `${clash.session.startTime} - ${clash.session.endTime}`,
        clashingWith: clash.clashingEvents.map((e) => e.summary),
        suggestedSlots: availableSlots.slice(0, 3),
      };
    });

    res.json({
      ok: true,
      hasClashes: clashes.length > 0,
      clashCount: clashes.length,
      clashes,
      suggestions,
    });
  } catch (err) {
    console.error('Calendar clash check error:', err);
    res.status(500).json({ error: 'Failed to check calendar clashes' });
  }
});

export default router;

