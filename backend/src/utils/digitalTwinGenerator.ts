import { DigitalTwinModel } from '../models/DigitalTwin';
import { aggregateUserBehavior, calculateLearningStyle, calculatePerformanceMetrics, calculateTimePatterns } from './behaviorAggregator';

interface PredictiveInsights {
  predictedExamScore: number;
  confidenceLevel: number;
  readinessTrend: 'increasing' | 'stable' | 'decreasing';
  estimatedPreparationTime: number;
  weakAreas: string[];
  strongAreas: string[];
  recommendedFocus: string[];
}

export async function generatePredictiveInsights(
  userId: string,
  syllabusId: string,
  aggregatedData: any
): Promise<PredictiveInsights> {
  const {
    averageQuizScore,
    quizScores,
    retentionRate,
    focusScore,
    completionRate,
    topicsMastered,
    topicsInProgress,
    revisionHistory,
    cognitiveLoadData,
  } = aggregatedData;

  // Calculate base predicted score
  let predictedExamScore = Math.round(
    averageQuizScore * 0.4 +
    retentionRate * 0.25 +
    focusScore * 0.2 +
    completionRate * 0.15
  );

  // Adjust based on trend
  if (quizScores.length >= 3) {
    const recentTrend =
      quizScores[quizScores.length - 1] - quizScores[0];
    if (recentTrend > 10) {
      predictedExamScore += 5;
    } else if (recentTrend < -10) {
      predictedExamScore -= 10;
    }
  }

  predictedExamScore = Math.min(100, Math.max(0, predictedExamScore));

  // Confidence level based on data volume and consistency
  const dataPoints =
    quizScores.length +
    (revisionHistory?.length || 0) +
    (cognitiveLoadData?.length || 0);
  let confidenceLevel = Math.min(100, Math.round(dataPoints * 5));

  if (completionRate > 70 && focusScore > 70) {
    confidenceLevel = Math.min(100, confidenceLevel + 15);
  }

  // Readiness trend
  let readinessTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (quizScores.length >= 5) {
    const firstHalf = quizScores.slice(0, Math.floor(quizScores.length / 2));
    const secondHalf = quizScores.slice(Math.floor(quizScores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 8) {
      readinessTrend = 'increasing';
    } else if (secondAvg < firstAvg - 8) {
      readinessTrend = 'decreasing';
    }
  }

  // Identify weak and strong areas
  const weakAreas: string[] = [];
  const strongAreas: string[] = [];

  revisionHistory?.forEach((rev: any) => {
    const avgScore = rev.scores.reduce((a, b) => a + b, 0) / rev.scores.length;
    if (avgScore < 60 && rev.attempts >= 2) {
      weakAreas.push(rev.topic);
    } else if (avgScore > 85 && rev.attempts >= 2) {
      strongAreas.push(rev.topic);
    }
  });

  // Add high cognitive load topics to weak areas
  cognitiveLoadData?.forEach((cog: any) => {
    if (
      cog.difficulty === 'hard' ||
      cog.difficulty === 'very-hard'
    ) {
      if (!weakAreas.includes(cog.topic)) {
        weakAreas.push(cog.topic);
      }
    }
  });

  // Recommended focus areas
  const recommendedFocus = [
    ...weakAreas.slice(0, 3),
    ...(completionRate < 50 ? ['Complete remaining topics'] : []),
    ...(retentionRate < 70 ? ['Spaced repetition review'] : []),
  ];

  // Estimated preparation time
  const remainingTopics = topicsInProgress;
  const studySpeed = aggregatedData.averageStudySpeed || 1; // topics per hour
  const estimatedPreparationTime =
    studySpeed > 0 ? Math.ceil(remainingTopics / studySpeed) : 20;

  return {
    predictedExamScore,
    confidenceLevel,
    readinessTrend,
    estimatedPreparationTime,
    weakAreas,
    strongAreas,
    recommendedFocus,
  };
}

export async function generateAISummary(
  userId: string,
  syllabusId: string,
  digitalTwinData: any
): Promise<{ aiSummary: string; learningPersonality: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback: generate simple summary without Claude
    return generateFallbackSummary(digitalTwinData);
  }

  const prompt = `You are an expert educational psychologist analyzing a student's learning patterns. Based on the following data, create:

1. A concise 2-3 sentence summary of their learning profile
2. A 2-4 word "learning personality" label that captures their style

Data:
- Total Study Time: ${digitalTwinData.totalStudyMinutes} minutes (${Math.round(digitalTwinData.totalStudyMinutes / 60)} hours)
- Sessions Completed: ${digitalTwinData.totalSessionsCompleted}
- Quizzes Taken: ${digitalTwinData.totalQuizzesTaken}
- Average Quiz Score: ${digitalTwinData.performance.averageQuizScore}%
- Retention Rate: ${digitalTwinData.performance.retentionRate}%
- Focus Score: ${digitalTwinData.performance.focusScore}/100
- Completion Rate: ${digitalTwinData.performance.completionRate}%
- Study Speed: ${digitalTwinData.performance.averageStudySpeed} topics/hour
- Accuracy Trend: ${digitalTwinData.performance.accuracyTrend}
- Best Study Hours: ${digitalTwinData.timePatterns.bestStudyHours.join(', ')}:00
- Most Productive Day: ${digitalTwinData.timePatterns.mostProductiveDay}
- Current Streak: ${digitalTwinData.timePatterns.streakDays} days
- Topics Mastered: ${digitalTwinData.topicsMastered}
- Topics In Progress: ${digitalTwinData.topicsInProgress}
- Weak Areas: ${digitalTwinData.predictiveInsights.weakAreas.join(', ') || 'None identified'}
- Strong Areas: ${digitalTwinData.predictiveInsights.strongAreas.join(', ') || 'None identified'}
- Learning Style: Visual ${digitalTwinData.learningStyle.visualLearner}%, Auditory ${digitalTwinData.learningStyle.auditoryLearner}%, Kinesthetic ${digitalTwinData.learningStyle.kinestheticLearner}%, Reading/Writing ${digitalTwinData.learningStyle.readingWritingLearner}%
- Preferred Session Length: ${digitalTwinData.learningStyle.preferredSessionLength} minutes

Respond in this exact JSON format:
{
  "summary": "Your 2-3 sentence analysis here",
  "personality": "2-4 word label"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.7,
        system:
          'You are an encouraging educational psychologist who provides insightful, actionable feedback to students.',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;

    try {
      const parsed = JSON.parse(content);
      return {
        aiSummary: parsed.summary || generateFallbackSummary(digitalTwinData).aiSummary,
        learningPersonality:
          parsed.personality || generateFallbackSummary(digitalTwinData).learningPersonality,
      };
    } catch {
      return generateFallbackSummary(digitalTwinData);
    }
  } catch (error) {
    console.error('AI summary generation failed:', error);
    return generateFallbackSummary(digitalTwinData);
  }
}

function generateFallbackSummary(data: any): {
  aiSummary: string;
  learningPersonality: string;
} {
  const { performance, timePatterns, predictiveInsights } = data;

  let personality = 'Balanced Learner';
  
  if (performance.focusScore > 80) {
    personality = 'Focused Achiever';
  } else if (performance.retentionRate > 80) {
    personality = 'Strong Retainer';
  } else if (timePatterns.streakDays > 7) {
    personality = 'Consistent Studier';
  } else if (performance.accuracyTrend === 'improving') {
    personality = 'Rapid Improver';
  }

  const summary = `You've studied for ${Math.round(data.totalStudyMinutes / 60)} hours across ${data.totalSessionsCompleted} sessions, achieving an average quiz score of ${performance.averageQuizScore}%. Your focus score is ${performance.focusScore}/100, and you're on a ${timePatterns.streakDays}-day streak. Your predicted exam score is ${predictiveInsights.predictedExamScore}%, with ${predictiveInsights.weakAreas.length} areas needing attention and ${predictiveInsights.strongAreas.length} strong areas.`;

  return {
    aiSummary: summary,
    learningPersonality: personality,
  };
}

export async function createOrUpdateDigitalTwin(
  userId: string,
  syllabusId: string
): Promise<any> {
  // Aggregate all user behavior
  const aggregatedData = await aggregateUserBehavior(userId, syllabusId);

  // Calculate learning style
  const learningStyle = calculateLearningStyle(
    aggregatedData.focusSessions
  );

  // Calculate performance metrics
  const totalTopics =
    aggregatedData.topicsMastered + aggregatedData.topicsInProgress;
  const performance = calculatePerformanceMetrics(
    aggregatedData.quizScores,
    aggregatedData.focusSessions,
    aggregatedData.totalSessionsCompleted,
    totalTopics
  );

  // Calculate time patterns
  const timePatterns = calculateTimePatterns(
    aggregatedData.studyByHour,
    aggregatedData.studyByDayOfWeek,
    aggregatedData.focusSessions
  );

  // Generate predictive insights
  const predictiveInsights = await generatePredictiveInsights(
    userId,
    syllabusId,
    aggregatedData
  );

  // Build digital twin data object
  const digitalTwinData = {
    userId,
    syllabusId,
    totalStudyMinutes: aggregatedData.totalStudyMinutes,
    totalSessionsCompleted: aggregatedData.totalSessionsCompleted,
    totalQuizzesTaken: aggregatedData.totalQuizzesTaken,
    topicsMastered: aggregatedData.topicsMastered,
    topicsInProgress: aggregatedData.topicsInProgress,
    learningStyle,
    performance,
    timePatterns,
    predictiveInsights,
    dataPointsAnalyzed:
      aggregatedData.focusSessions.length +
      aggregatedData.quizScores.length +
      (aggregatedData.revisionHistory?.length || 0),
    aiSummary: '', // Will be populated after AI generation
    learningPersonality: '', // Will be populated after AI generation
  };

  // Generate AI summary
  const { aiSummary, learningPersonality } = await generateAISummary(
    userId,
    syllabusId,
    digitalTwinData
  );

  (digitalTwinData as any).aiSummary = aiSummary;
  (digitalTwinData as any).learningPersonality = learningPersonality;

  // Upsert digital twin
  const existingTwin = await DigitalTwinModel.findOne({ userId, syllabusId }).sort({ createdAt: -1 });

  if (existingTwin) {
    // Update existing
    existingTwin.set(digitalTwinData);
    await existingTwin.save();
    return existingTwin;
  } else {
    // Create new
    return await DigitalTwinModel.create(digitalTwinData);
  }
}
