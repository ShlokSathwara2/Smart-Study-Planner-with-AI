import { Router } from 'express';
import multer from 'multer';
import { StudyPlanModel } from '../models/StudyPlan';
import { transcribeAudioBlob, parseSessionIntent } from '../utils/whisperTranscribe';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (Whisper max is 25MB)
  },
});

// POST /api/voice-input/log-session - Transcribe and log study session
router.post('/log-session', upload.single('audio'), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const { userId, syllabusId } = req.body as { userId?: string; syllabusId?: string };
    
    if (!userId || !syllabusId) {
      res.status(400).json({ error: 'userId and syllabusId are required' });
      return;
    }

    // Step 1: Transcribe audio using Whisper
    // Convert Buffer to Blob for FormData
    const uint8Array = Uint8Array.from(req.file.buffer);
    const blob = new Blob([uint8Array], { type: 'audio/webm' });
    const transcription = await transcribeAudioBlob(blob, req.file.originalname);
    
    console.log('🎤 Transcription:', transcription.text);

    // Step 2: Parse intent using Claude
    const intent = await parseSessionIntent(transcription.text);
    
    console.log('🧠 Parsed intent:', intent);

    // Step 3: Auto-log the session if we have enough information
    let sessionLogged = false;
    let newSessionId: string | undefined;

    if (intent.topic && intent.confidence > 60) {
      // Get or create study plan
      let plan = await StudyPlanModel.findOne({ userId, syllabusId });
      
      if (!plan) {
        // Create minimal study plan if none exists
        const examDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        plan = await StudyPlanModel.create({
          userId,
          syllabusId,
          examDate: examDate.toISOString().split('T')[0], // YYYY-MM-DD format
          dailyHours: 2,
          sessions: [],
        });
      }

      // Add session to plan
      const durationMinutes = intent.durationMinutes || 30; // Default 30 min
      const newSession = {
        topic: intent.topic,
        date: new Date().toISOString().split('T')[0],
        estimatedMinutes: durationMinutes,
        actualMinutes: durationMinutes,
        status: 'done' as const,
        completedAt: new Date(),
        notes: intent.notes || `Voice logged session: ${transcription.text.substring(0, 100)}`,
      };

      plan.sessions.push(newSession);
      await plan.save();
      
      sessionLogged = true;
      // Get the index of the newly added session
      const newIndex = plan.sessions.length - 1;
      newSessionId = `${newIndex}`; // Use index as temporary ID
    }

    res.json({
      ok: true,
      transcription: transcription.text,
      intent: {
        topic: intent.topic,
        durationMinutes: intent.durationMinutes,
        notes: intent.notes,
        confidence: intent.confidence,
      },
      sessionLogged,
      newSessionId,
      message: sessionLogged 
        ? `Session logged: ${intent.topic} for ${intent.durationMinutes} minutes`
        : 'Transcription complete, but insufficient data to auto-log session',
    });
  } catch (error: any) {
    console.error('Voice input error:', error);
    res.status(500).json({ 
      error: 'Failed to process voice input',
      details: error.message,
    });
  }
});

// GET /api/voice-input/test - Test endpoint
router.get('/test', (req, res): void => {
  res.json({
    ok: true,
    message: 'Voice input API is running',
    supportedFeatures: [
      'Audio transcription via Whisper',
      'Intent parsing via Claude',
      'Auto session logging',
    ],
  });
});

export default router;
