import { Router } from 'express';
import { QuizResultModel } from '../models/QuizResult';
import { WeakTopicModel } from '../models/WeakTopic';
import { TopicEstimateModel } from '../models/TopicEstimate';
import { StudyPlanModel } from '../models/StudyPlan';
import { calculateNextReview } from '../utils/sm2';

const router = Router();

// POST /api/quiz/generate - Generate quiz questions for a topic using Claude
router.post('/generate', async (req, res): Promise<void> => {
  try {
    const { userId = 'anonymous', syllabusId, topic, numQuestions = 5 } = req.body as {
      userId?: string;
      syllabusId: string;
      topic: string;
      numQuestions?: number;
    };

    if (!syllabusId || !topic) {
      res.status(400).json({ error: 'syllabusId and topic are required' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      // Fallback: simple placeholder questions
      const questions = generateFallbackQuestions(topic, numQuestions);
      res.json({ ok: true, questions, note: 'Using fallback questions (no API key)' });
      return;
    }

    // Get topic context from estimates if available
    const estimate = await TopicEstimateModel.findOne({ userId, syllabusId, topic }).lean();
    const topicContext = estimate ? `Topic estimated to take ${estimate.estimatedHours} hours with ${estimate.confidence}% confidence.` : '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.7,
        system:
          'You are creating quiz questions for students. Return JSON only with shape: { "questions": Array<{ "question": string, "options": string[4], "correctAnswer": number (0-3), "explanation": string }>. Questions should test understanding, not just recall. Vary difficulty.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Generate ${numQuestions} multiple-choice quiz questions about: ${topic}\n\n${topicContext}\n\nEach question should have:\n- Clear, unambiguous question\n- 4 options (A, B, C, D)\n- One correct answer (specify index 0-3)\n- Brief explanation of why it's correct`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text ?? data?.content?.[0]?.[0]?.text;

    try {
      const parsed = JSON.parse(content);
      const questions = parsed.questions || [];
      
      res.json({ ok: true, questions });
    } catch {
      res.status(500).json({ error: 'Failed to parse Claude response' });
    }
  } catch (err) {
    console.error('Quiz generation error', err);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// POST /api/quiz/submit - Submit quiz answers and calculate score
router.post('/submit', async (req, res): Promise<void> => {
  try {
    const { 
      userId = 'anonymous', 
      syllabusId,
      planId,
      topic, 
      questions, 
      attempts 
    } = req.body as {
      userId?: string;
      syllabusId: string;
      planId?: string;
      topic: string;
      questions: any[];
      attempts: any[];
    };

    if (!syllabusId || !topic || !questions || !attempts) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Calculate score
    const correctCount = attempts.filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const totalTimeSeconds = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);

    // Save quiz result
    const quizResult = await QuizResultModel.create({
      userId,
      syllabusId,
      topic,
      questions,
      attempts,
      score,
      totalTimeSeconds,
      completedAt: new Date().toISOString(),
    });

    // Update weak topic detection
    await updateWeakTopicDetection(userId, syllabusId, topic, score, quizResult._id.toString());

    // Phase 12 - SM-2 Spaced Repetition Auto-Scheduling
    let nextReviewDate: string | null = null;
    if (planId) {
      // Map 0-100 score to 0-5 quality scale
      const quality = Math.max(0, Math.floor(score / 20));
      const sm2Result = calculateNextReview(quality);
      // Format as YYYY-MM-DD to match StudySession.date type
      const d = sm2Result.nextReviewDate;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      nextReviewDate = `${yyyy}-${mm}-${dd}`;

      try {
        const plan = await StudyPlanModel.findById(planId);
        if (plan) {
          (plan.sessions as any[]).push({
            date: nextReviewDate,
            startTime: '20:00',
            endTime: '20:30',
            topic: `[Review] ${topic}`,
            estimatedMinutes: 30,
            status: 'planned',
            isReview: true,
          });
          
          // Sort timeline chronologically
          plan.sessions.sort((a: any, b: any) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          await plan.save();
        }
      } catch (scheduleErr) {
        console.error('Failed to auto-schedule SM2 review', scheduleErr);
      }
    }

    res.json({ 
      ok: true, 
      score, 
      correctCount, 
      totalQuestions: questions.length,
      quizId: quizResult._id,
      nextReviewScheduled: nextReviewDate
    });
  } catch (err) {
    console.error('Quiz submission error', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// GET /api/quiz/by-topic/:topic - Get quiz history for a topic
router.get('/by-topic/:topic', async (req, res): Promise<void> => {
  try {
    const topic = req.params.topic;
    const syllabusId = req.query.syllabusId as string;
    const userId = (req.query.userId as string) || 'anonymous';

    const quizzes = await QuizResultModel.find({ userId, syllabusId, topic })
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    res.json({ ok: true, quizzes });
  } catch (err) {
    console.error('Get quiz history error', err);
    res.status(500).json({ error: 'Failed to load quiz history' });
  }
});

// Helper function to update weak topic detection
async function updateWeakTopicDetection(
  userId: string,
  syllabusId: string,
  topic: string,
  latestScore: number,
  quizId: string
) {
  // Get all quiz attempts for this topic, sorted by most recent first
  const allQuizzes = await QuizResultModel.find({ userId, syllabusId, topic })
    .sort({ completedAt: -1 })
    .lean();
  
  if (allQuizzes.length === 0) return;

  // Calculate metrics
  const averageScore = allQuizzes.reduce((sum, q) => sum + q.score, 0) / allQuizzes.length;
  const totalAttempts = allQuizzes.length;
  const lastAttempt = allQuizzes[0].completedAt; // Most recent
  const daysSinceLastAttempt = Math.floor(
    (Date.now() - new Date(lastAttempt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate confidence score (0-100)
  // Factors: average score (60%), recency (20%), number of attempts (20%)
  const scoreComponent = averageScore * 0.6;
  const recencyComponent = Math.max(0, (30 - daysSinceLastAttempt) / 30) * 100 * 0.2; // Decay over 30 days
  const attemptsComponent = Math.min(totalAttempts / 5, 1) * 100 * 0.2; // Max benefit at 5 attempts
  
  const confidenceScore = Math.round(scoreComponent + recencyComponent + attemptsComponent);

  // Determine if topic is weak (threshold: confidence < 60 OR average score < 70)
  const isWeak = confidenceScore < 60 || averageScore < 70;
  
  let weakReason = '';
  let recommendedActions: string[] = [];
  let timeAllocationMultiplier = 1.0;
  let priorityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (isWeak) {
    // Determine reason and priority
    if (averageScore < 50) {
      weakReason = 'Low quiz scores indicate poor understanding';
      priorityLevel = 'critical';
      timeAllocationMultiplier = 2.0; // Double time
      recommendedActions = [
        'Review foundational concepts',
        'Watch video tutorials',
        'Practice with more examples',
        'Seek help from instructor or peers',
      ];
    } else if (averageScore < 70) {
      weakReason = 'Below average quiz performance';
      priorityLevel = 'high';
      timeAllocationMultiplier = 1.5; // 50% more time
      recommendedActions = [
        'Re-read study materials',
        'Create summary notes',
        'Take additional practice quizzes',
      ];
    } else if (daysSinceLastAttempt > 14) {
      weakReason = 'Knowledge may be stale due to lack of recent practice';
      priorityLevel = 'medium';
      timeAllocationMultiplier = 1.3; // 30% more time
      recommendedActions = [
        'Quick review of key concepts',
        'Spaced repetition practice',
        'Flashcard review',
      ];
    } else if (totalAttempts < 3) {
      weakReason = 'Insufficient practice attempts';
      priorityLevel = 'low';
      timeAllocationMultiplier = 1.2; // 20% more time
      recommendedActions = [
        'Take more practice quizzes',
        'Review incorrect answers',
      ];
    }
  }

  // Upsert weak topic record
  await WeakTopicModel.findOneAndUpdate(
    { userId, syllabusId, topic },
    {
      $set: {
        averageQuizScore: Math.round(averageScore),
        totalAttempts,
        lastAttemptedAt: lastAttempt,
        daysSinceLastAttempt,
        confidenceScore,
        isWeak,
        weakReason,
        recommendedActions,
        timeAllocationMultiplier,
        priorityLevel,
      },
    },
    { upsert: true, new: true }
  );
}

// Fallback question generator (no API key)
function generateFallbackQuestions(topic: string, numQuestions: number) {
  return Array.from({ length: numQuestions }).map((_, i) => ({
    question: `Question ${i + 1} about ${topic}: What is the correct understanding?`,
    options: [
      'Correct answer option',
      'Common misconception',
      'Partially correct but incomplete',
      'Incorrect option',
    ],
    correctAnswer: 0,
    explanation: 'This is the correct answer based on fundamental understanding of the topic.',
  }));
}

export default router;
