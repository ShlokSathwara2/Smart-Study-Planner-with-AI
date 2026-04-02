import { ExamPredictionModel } from '../models/ExamPrediction';
import { aggregateExamSignals } from './examSignalAggregator';

interface PredictionResult {
  readinessPercentage: number;
  predictedScoreRange: {
    min: number;
    max: number;
    mostLikely: number;
  };
  confidenceLevel: number;
  breakdown: {
    syllabusCompletionScore: number;
    quizPerformanceScore: number;
    revisionQualityScore: number;
    timeInvestmentScore: number;
    consistencyScore: number;
  };
  riskTopics: Array<{
    topic: string;
    reason: string;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
  }>;
  strongTopics: string[];
  trend: 'improving' | 'stable' | 'declining';
  aiAnalysis: string;
  recommendedActions: string[];
  examReadinessLabel: string;
}

export async function generateExamPrediction(
  userId: string,
  syllabusId: string
): Promise<PredictionResult> {
  // Aggregate all signals
  const signals = await aggregateExamSignals(userId, syllabusId);
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    // Fallback: simple heuristic-based prediction
    return generateFallbackPrediction(signals);
  }
  
  // Prepare data for Claude
  const promptData = {
    syllabusCompletion: signals.syllabusCompletion,
    quizPerformance: signals.quizPerformance,
    revisionCycles: signals.revisionCycles,
    timeInvestment: signals.timeInvestment,
    consistency: signals.consistency,
    riskIndicators: signals.riskIndicators,
  };
  
  const prompt = `You are an expert educational assessor predicting student exam performance. Analyze this comprehensive learning data and provide accurate predictions.

STUDENT LEARNING SIGNALS:

1. SYLLABUS COMPLETION:
   - Total Topics: ${promptData.syllabusCompletion.totalTopics}
   - Completed: ${promptData.syllabusCompletion.completedTopics}
   - Completion Rate: ${promptData.syllabusCompletion.completionPercentage}%
   - Remaining Topics: ${promptData.syllabusCompletion.remainingTopics.slice(0, 5).join(', ') || 'None'}

2. QUIZ PERFORMANCE:
   - Total Quizzes Taken: ${promptData.quizPerformance.totalQuizzes}
   - Average Score: ${promptData.quizPerformance.averageScore}%
   - Recent Trend: ${promptData.quizPerformance.recentTrend}
   - Topic Breakdown: ${promptData.quizPerformance.topicScores.slice(0, 5).map(ts => `${ts.topic} (${ts.score}%)`).join(', ')}

3. REVISION QUALITY:
   - Total Revisions: ${promptData.revisionCycles.totalRevisions}
   - Avg Revisions per Topic: ${promptData.revisionCycles.averageRevisionsPerTopic}
   - Revision Effectiveness: ${promptData.revisionCycles.revisionEffectiveness}%
   - Spaced Repetition Compliance: ${promptData.revisionCycles.spacedRepetitionCompliance}%

4. TIME INVESTMENT:
   - Total Hours Studied: ${promptData.timeInvestment.totalHours}
   - Planned Hours: ${promptData.timeInvestment.plannedHours}
   - Actual vs Planned Ratio: ${promptData.timeInvestment.actualVsPlannedRatio}x
   - Weekly Trend (last 4 weeks): ${promptData.timeInvestment.weeklyTrend.join(', ')} hours

5. CONSISTENCY:
   - Current Streak: ${promptData.consistency.studyStreak} days
   - Missed Sessions: ${promptData.consistency.missedSessions}
   - On-Time Completion Rate: ${promptData.consistency.onTimeCompletionRate}%
   - Regularity Score: ${promptData.consistency.regularityScore}/100

6. RISK INDICATORS:
   - Weak Topics: ${promptData.riskIndicators.weakTopicsCount}
   - Low Quiz Scores (<60%): ${promptData.riskIndicators.lowQuizScoresCount}
   - Incomplete Topics: ${promptData.riskIndicators.incompleteTopicsCount}
   - Declining Trends: ${promptData.riskIndicators.decliningTrendTopics}

Based on this data, provide:

1. **Readiness Percentage** (0-100): Overall exam preparedness
2. **Predicted Score Range**: Min, Max, and Most Likely (all 0-100)
3. **Confidence Level** (0-100): How confident is this prediction
4. **Component Scores** (0-100 each):
   - Syllabus Completion Score
   - Quiz Performance Score
   - Revision Quality Score
   - Time Investment Score
   - Consistency Score
5. **Risk Topics** (up to 5): Topics that pose the highest risk with reason and risk level
6. **Strong Topics** (up to 5): Topics the student has mastered
7. **Trend**: improving, stable, or declining
8. **AI Analysis**: 2-3 sentence natural language summary
9. **Recommended Actions** (3-5): Specific actionable steps
10. **Exam Readiness Label**: "Excellent", "Good", "Fair", "Needs Improvement", or "At Risk"

Respond in JSON format only:
{
  "readinessPercentage": number,
  "predictedScoreRange": { "min": number, "max": number, "mostLikely": number },
  "confidenceLevel": number,
  "breakdown": {
    "syllabusCompletionScore": number,
    "quizPerformanceScore": number,
    "revisionQualityScore": number,
    "timeInvestmentScore": number,
    "consistencyScore": number
  },
  "riskTopics": [{ "topic": string, "reason": string, "riskLevel": "critical|high|medium|low" }],
  "strongTopics": [string],
  "trend": "improving|stable|declining",
  "aiAnalysis": "string",
  "recommendedActions": [string],
  "examReadinessLabel": "string"
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
        max_tokens: 1000,
        temperature: 0.3,
        system: 'You are an expert educational assessor specializing in predicting student exam outcomes based on comprehensive learning analytics.',
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
      
      // Validate and sanitize results
      return {
        readinessPercentage: Math.min(100, Math.max(0, parsed.readinessPercentage || 50)),
        predictedScoreRange: {
          min: Math.min(100, Math.max(0, parsed.predictedScoreRange?.min || 40)),
          max: Math.min(100, Math.max(0, parsed.predictedScoreRange?.max || 80)),
          mostLikely: Math.min(100, Math.max(0, parsed.predictedScoreRange?.mostLikely || 60)),
        },
        confidenceLevel: Math.min(100, Math.max(0, parsed.confidenceLevel || 50)),
        breakdown: {
          syllabusCompletionScore: Math.min(100, Math.max(0, parsed.breakdown?.syllabusCompletionScore || 50)),
          quizPerformanceScore: Math.min(100, Math.max(0, parsed.breakdown?.quizPerformanceScore || 50)),
          revisionQualityScore: Math.min(100, Math.max(0, parsed.breakdown?.revisionQualityScore || 50)),
          timeInvestmentScore: Math.min(100, Math.max(0, parsed.breakdown?.timeInvestmentScore || 50)),
          consistencyScore: Math.min(100, Math.max(0, parsed.breakdown?.consistencyScore || 50)),
        },
        riskTopics: Array.isArray(parsed.riskTopics) ? parsed.riskTopics.slice(0, 5) : [],
        strongTopics: Array.isArray(parsed.strongTopics) ? parsed.strongTopics.slice(0, 5) : [],
        trend: ['improving', 'stable', 'declining'].includes(parsed.trend) ? parsed.trend : 'stable',
        aiAnalysis: parsed.aiAnalysis || 'Analysis not available',
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.slice(0, 5) : [],
        examReadinessLabel: parsed.examReadinessLabel || 'Fair',
      };
    } catch {
      console.error('Failed to parse Claude response, using fallback');
      return generateFallbackPrediction(signals);
    }
  } catch (error) {
    console.error('Exam prediction generation failed:', error);
    return generateFallbackPrediction(signals);
  }
}

function generateFallbackPrediction(signals: any): PredictionResult {
  const { syllabusCompletion, quizPerformance, consistency } = signals;
  
  // Simple weighted calculation
  const completionScore = syllabusCompletion.completionPercentage;
  const quizScore = quizPerformance.averageScore;
  const consistencyScore = consistency.onTimeCompletionRate;
  
  const readinessPercentage = Math.round(
    completionScore * 0.4 +
    quizScore * 0.4 +
    consistencyScore * 0.2
  );
  
  const predictedMostLikely = readinessPercentage;
  const margin = Math.max(10, Math.round((100 - readinessPercentage) * 0.3));
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (quizPerformance.recentTrend === 'improving') {
    trend = 'improving';
  } else if (quizPerformance.recentTrend === 'declining') {
    trend = 'declining';
  }
  
  let examReadinessLabel = 'Fair';
  if (readinessPercentage >= 85) {
    examReadinessLabel = 'Excellent';
  } else if (readinessPercentage >= 70) {
    examReadinessLabel = 'Good';
  } else if (readinessPercentage >= 50) {
    examReadinessLabel = 'Fair';
  } else if (readinessPercentage >= 30) {
    examReadinessLabel = 'Needs Improvement';
  } else {
    examReadinessLabel = 'At Risk';
  }
  
  const riskTopics = syllabusCompletion.remainingTopics.slice(0, 5).map((topic: string) => ({
    topic,
    reason: 'Incomplete syllabus coverage',
    riskLevel: 'medium' as const,
  }));
  
  const strongTopics = quizPerformance.topicScores
    .filter((ts: any) => ts.score >= 80)
    .slice(0, 5)
    .map((ts: any) => ts.topic);
  
  return {
    readinessPercentage,
    predictedScoreRange: {
      min: Math.max(0, predictedMostLikely - margin),
      max: Math.min(100, predictedMostLikely + margin),
      mostLikely: predictedMostLikely,
    },
    confidenceLevel: 60,
    breakdown: {
      syllabusCompletionScore: completionScore,
      quizPerformanceScore: quizScore,
      revisionQualityScore: 60,
      timeInvestmentScore: 60,
      consistencyScore,
    },
    riskTopics,
    strongTopics,
    trend,
    aiAnalysis: `Based on ${syllabusCompletion.completionPercentage}% syllabus completion and ${quizPerformance.averageScore}% average quiz score, your predicted exam performance is ${predictedMostLikely}%.`,
    recommendedActions: [
      'Complete remaining syllabus topics',
      'Focus on weak areas identified in quizzes',
      'Maintain consistent study schedule',
      'Take more practice quizzes',
      'Review incorrect answers thoroughly',
    ].slice(0, 5),
    examReadinessLabel,
  };
}

export async function createOrUpdateExamPrediction(
  userId: string,
  syllabusId: string
): Promise<any> {
  // Aggregate signals first
  const signals = await aggregateExamSignals(userId, syllabusId);
  
  // Generate prediction
  const prediction = await generateExamPrediction(userId, syllabusId);
  
  // Get historical trends
  const existingPredictions = await ExamPredictionModel.find({ userId, syllabusId })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  
  // Build historical trends array
  const historicalTrends = existingPredictions.map((pred, index) => ({
    weekNumber: existingPredictions.length - index,
    readinessPercentage: pred.readinessPercentage,
    predictedScore: pred.predictedScoreRange.mostLikely,
    trend: pred.trend,
    weekLabel: `Week ${existingPredictions.length - index}`,
  })).reverse();
  
  // Calculate weekly change
  const previousPrediction = existingPredictions[0];
  const weeklyChange = previousPrediction
    ? prediction.readinessPercentage - previousPrediction.readinessPercentage
    : 0;
  
  // Calculate data points
  const dataPointsAnalyzed = 
    signals.syllabusCompletion.totalTopics +
    signals.quizPerformance.totalQuizzes +
    signals.revisionCycles.totalRevisions;
  
  // Create or update prediction
  const existingLatest = await ExamPredictionModel.findOne({ userId, syllabusId })
    .sort({ createdAt: -1 });
  
  if (existingLatest) {
    // Update existing
    existingLatest.set({
      ...prediction,
      historicalTrends,
      weeklyChange,
      dataPointsAnalyzed,
    });
    await existingLatest.save();
    return existingLatest;
  } else {
    // Create new
    return await ExamPredictionModel.create({
      ...prediction,
      userId,
      syllabusId,
      historicalTrends,
      weeklyChange,
      dataPointsAnalyzed,
    });
  }
}
