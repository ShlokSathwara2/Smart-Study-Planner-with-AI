import { StudyPatternsModel } from '../models/StudyPatterns';
import { FocusSessionModel } from '../models/FocusSession';
import { QuizResultModel } from '../models/QuizResult';

interface YesterdayData {
  totalSessions: number;
  totalMinutes: number;
  averageDeepWorkRatio: number;
  quizScores: number[];
  topicsStudied: string[];
  bestSession: {
    topic: string;
    deepWorkRatio: number;
    duration: number;
  } | null;
}

export async function generateDailyCoachMessage(
  userId: string,
  syllabusId?: string
): Promise<{
  message: string;
  suggestion: string;
  basedOnData: string;
  motivationQuote?: string;
}> {
  // Get yesterday's date range
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  // Get yesterday's sessions
  const sessions = await FocusSessionModel.find({
    userId,
    syllabusId,
    startTime: { $gte: yesterday.toISOString(), $lte: today.toISOString() },
  }).lean();
  
  // Get yesterday's quizzes
  const quizzes = await QuizResultModel.find({
    userId,
    syllabusId,
    completedAt: { $gte: yesterday.toISOString(), $lte: today.toISOString() },
  }).lean();
  
  // Analyze yesterday
  const yesterdayData: YesterdayData = {
    totalSessions: sessions.length,
    totalMinutes: Math.floor(sessions.reduce((sum, s) => sum + (s.totalSeconds || 0), 0) / 60),
    averageDeepWorkRatio: 0,
    quizScores: quizzes.map(q => q.score),
    topicsStudied: [...new Set(sessions.map(s => s.topic.replace(/\[.*\]\s*/g, '').trim()))],
    bestSession: null,
  };
  
  if (sessions.length > 0) {
    const deepWorkRatios = sessions
      .filter(s => s.deepWorkSeconds && s.totalSeconds)
      .map(s => s.deepWorkSeconds! / s.totalSeconds!);
    
    yesterdayData.averageDeepWorkRatio = deepWorkRatios.length > 0
      ? Math.round((deepWorkRatios.reduce((a, b) => a + b, 0) / deepWorkRatios.length) * 100)
      : 0;
    
    // Find best session
    let bestRatio = 0;
    let bestSessionData = null;
    sessions.forEach(s => {
      if (s.deepWorkSeconds && s.totalSeconds) {
        const ratio = s.deepWorkSeconds / s.totalSeconds;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestSessionData = {
            topic: s.topic.replace(/\[.*\]\s*/g, '').trim(),
            deepWorkRatio: Math.round(ratio * 100),
            duration: Math.floor((s.totalSeconds || 0) / 60),
          };
        }
      }
    });
    yesterdayData.bestSession = bestSessionData;
  }
  
  // Get existing patterns for context
  const patterns = await StudyPatternsModel.findOne({ userId, syllabusId })
    .sort({ lastUpdated: -1 })
    .lean();
  
  // Generate message based on data
  let message = '';
  let suggestion = '';
  let basedOnData = '';
  let motivationQuote: string | undefined;
  
  const motivationalQuotes = [
    "Small progress every day adds up to big results.",
    "Consistency is the key to mastery.",
    "Every expert was once a beginner.",
    "The secret of getting ahead is getting started.",
    "Believe you can and you're halfway there.",
    "Success is the sum of small efforts repeated day in and day out.",
    "Don't watch the clock; do what it does. Keep going.",
    "The future depends on what you do today.",
  ];
  
  if (yesterdayData.totalSessions === 0) {
    // No study activity
    message = "You took a rest day yesterday. That's okay! Rest is important for learning.";
    suggestion = "Today, try to study for just 25 minutes. Pick your easiest topic to get back into the flow.";
    basedOnData = 'No study sessions recorded yesterday';
    motivationQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  } else if (yesterdayData.totalMinutes < 30) {
    // Very short study time
    message = `You studied for only ${yesterdayData.totalMinutes} minutes yesterday.`;
    suggestion = "Aim for at least one 45-minute focused session today. Break it into two 25-min blocks with a 5-min break.";
    basedOnData = `Total study time: ${yesterdayData.totalMinutes} min`;
  } else if (yesterdayData.averageDeepWorkRatio < 50) {
    // Low deep work
    message = `Your focus wasn't optimal yesterday (${yesterdayData.averageDeepWorkRatio}% deep work).`;
    suggestion = "Try eliminating distractions: put your phone in another room and use website blockers during study time.";
    basedOnData = `Average deep work ratio: ${yesterdayData.averageDeepWorkRatio}%`;
  } else if (yesterdayData.quizScores.length > 0 && yesterdayData.quizScores.every(s => s < 70)) {
    // Poor quiz performance
    const avgScore = Math.round(yesterdayData.quizScores.reduce((a, b) => a + b, 0) / yesterdayData.quizScores.length);
    message = `Your quiz scores averaged ${avgScore}% yesterday. Don't be discouraged—struggling is part of learning!`;
    suggestion = "Review the questions you got wrong before moving to new material. Understanding mistakes is powerful.";
    basedOnData = `Average quiz score: ${avgScore}%`;
  } else if (yesterdayData.bestSession) {
    // Good session to highlight
    message = `Great job on your ${yesterdayData.bestSession.topic} session! You maintained ${yesterdayData.bestSession.deepWorkRatio}% deep work for ${yesterdayData.bestSession.duration} minutes.`;
    suggestion = `Schedule more sessions like this. Your peak hours are ${patterns?.timePatterns.bestStudyTime || 'mid-morning'}. Use that time for challenging topics.`;
    basedOnData = `Best session: ${yesterdayData.bestSession.topic} (${yesterdayData.bestSession.duration} min, ${yesterdayData.bestSession.deepWorkRatio}% deep work)`;
    motivationQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  } else {
    // Default positive message
    message = `You studied ${yesterdayData.topicsStudied.length} topic${yesterdayData.topicsStudied.length > 1 ? 's' : ''} yesterday: ${yesterdayData.topicsStudied.slice(0, 3).join(', ')}. Keep building momentum!`;
    suggestion = "Today, review what you learned yesterday for 10 minutes before starting new material. Spaced repetition boosts retention.";
    basedOnData = `Topics covered: ${yesterdayData.topicsStudied.join(', ')}`;
  }
  
  // Add pattern-based suggestions if available
  if (patterns && yesterdayData.totalSessions > 0) {
    const { focusPatterns, timePatterns } = patterns;
    
    // Session length optimization
    if (yesterdayData.totalMinutes > focusPatterns.dropOffPoint + 10) {
      suggestion += ` Consider breaking long sessions into ${focusPatterns.optimalSessionLength}-minute blocks.`;
    }
    
    // Timing optimization
    const studyHour = new Date(sessions[0]?.startTime || new Date()).getHours();
    const bestHour = parseInt(timePatterns.bestStudyTime.split('-')[0]);
    if (Math.abs(studyHour - bestHour) > 2 && sessions.length > 0) {
      suggestion += ` You perform best around ${timePatterns.bestStudyTime}. Try shifting your schedule closer to that window.`;
    }
  }
  
  return {
    message,
    suggestion,
    basedOnData,
    motivationQuote,
  };
}

export async function saveDailyCoachMessage(
  userId: string,
  syllabusId: string | undefined,
  coachMessage: {
    message: string;
    suggestion: string;
    basedOnData: string;
    motivationQuote?: string;
  }
): Promise<void> {
  let patterns = await StudyPatternsModel.findOne({ userId, syllabusId });
  
  if (!patterns) {
    // Create new patterns document
    patterns = await StudyPatternsModel.create({
      userId,
      syllabusId,
      analysisStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
      dailyCoachMessages: [{
        date: new Date(),
        ...coachMessage,
      }],
      totalSessionsAnalyzed: 0,
      totalHoursTracked: 0,
      dataQualityScore: 50,
    });
  } else {
    // Add to existing messages, keep last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMessages = (patterns.dailyCoachMessages || [])
      .filter(m => new Date(m.date) >= thirtyDaysAgo);
    
    recentMessages.push({
      date: new Date(),
      ...coachMessage,
    });
    
    // Keep only last 30
    if (recentMessages.length > 30) {
      recentMessages.shift();
    }
    
    patterns.dailyCoachMessages = recentMessages;
    await patterns.save();
  }
}
