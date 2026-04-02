import { FocusSessionModel } from '../models/FocusSession';
import { StudyPlanModel } from '../models/StudyPlan';
import { QuizResultModel } from '../models/QuizResult';
import { StudyPatternsModel, WeeklyInsight } from '../models/StudyPatterns';

interface AnalyzedPatterns {
  timePatterns: {
    bestStudyTime: string;
    mostProductiveDay: string;
    averageStartTime: string;
    consistencyScore: number;
  };
  focusPatterns: {
    averageFocusDuration: number;
    optimalSessionLength: number;
    dropOffPoint: number;
    attentionSpanTrend: 'improving' | 'stable' | 'declining';
    deepWorkPercentage: number;
  };
  productivityPatterns: {
    peakProductivityHours: string[];
    lowEnergyHours: string[];
    averageSessionsPerDay: number;
    preferredBreakLength: number;
    workToBreakRatio: number;
  };
  learningPatterns: {
    dominantLearningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic';
    topicSwitchFrequency: number;
    revisionSpacingDays: number;
    masterySpeed: 'fast' | 'moderate' | 'slow';
  };
  weeklyInsights: WeeklyInsight[];
}

export async function analyzeStudyPatterns(
  userId: string,
  syllabusId?: string,
  minDays: number = 14
): Promise<AnalyzedPatterns> {
  // Get all focus sessions
  const sessions = await FocusSessionModel.find({ userId, syllabusId })
    .sort({ startTime: -1 })
    .lean();
  
  // Filter to last N days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - minDays);
  const recentSessions = sessions.filter(s => new Date(s.startTime) >= cutoffDate);
  
  if (recentSessions.length < 5) {
    throw new Error(`Insufficient data. Need at least ${minDays} days of activity.`);
  }
  
  // ===== TIME PATTERNS =====
  const hourPerformance = new Map<number, { total: number; count: number; quality: number }>();
  const dayPerformance = new Map<string, { total: number; count: number; quality: number }>();
  const startTimes: number[] = [];
  
  recentSessions.forEach(session => {
    const startDate = new Date(session.startTime);
    const hour = startDate.getHours();
    const dayName = startDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Calculate session quality from deep work percentage
    const deepWorkPct = session.deepWorkSeconds && session.totalSeconds
      ? (session.deepWorkSeconds / session.totalSeconds) * 100
      : 50;
    const quality = deepWorkPct / 100;
    const durationMinutes = Math.floor((session.totalSeconds || 0) / 60);
    
    // Hour analysis
    if (!hourPerformance.has(hour)) {
      hourPerformance.set(hour, { total: 0, count: 0, quality: 0 });
    }
    const hourData = hourPerformance.get(hour)!;
    hourData.total += durationMinutes;
    hourData.count++;
    hourData.quality += quality;
    
    // Day analysis
    if (!dayPerformance.has(dayName)) {
      dayPerformance.set(dayName, { total: 0, count: 0, quality: 0 });
    }
    const dayData = dayPerformance.get(dayName)!;
    dayData.total += durationMinutes;
    dayData.count++;
    dayData.quality += quality;
    
    // Track start times
    startTimes.push(startDate.getHours() + startDate.getMinutes() / 60);
  });
  
  // Find best study time (highest quality hours)
  let bestHour = 9;
  let bestQuality = 0;
  hourPerformance.forEach((data, hour) => {
    const avgQuality = data.quality / data.count;
    if (avgQuality > bestQuality && data.count >= 3) {
      bestQuality = avgQuality;
      bestHour = hour;
    }
  });
  
  const bestStudyTime = `${bestHour.toString().padStart(2, '0')}:00-${(bestHour + 2).toString().padStart(2, '0')}:00`;
  
  // Find most productive day
  let mostProductiveDay = 'Monday';
  let highestProductivity = 0;
  dayPerformance.forEach((data, day) => {
    const productivity = (data.total / 60) * (data.quality / data.count); // hours * quality
    if (productivity > highestProductivity && data.count >= 2) {
      highestProductivity = productivity;
      mostProductiveDay = day;
    }
  });
  
  // Average start time
  const avgStartTime = startTimes.reduce((a, b) => a + b, 0) / startTimes.length;
  const avgHour = Math.floor(avgStartTime);
  const avgMinute = Math.round((avgStartTime - avgHour) * 60);
  const averageStartTime = `${avgHour.toString().padStart(2, '0')}:${avgMinute.toString().padStart(2, '0')}`;
  
  // Consistency score (variance in start times)
  const variance = startTimes.reduce((sum, t) => sum + Math.pow(t - avgStartTime, 2), 0) / startTimes.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 20)));
  
  // ===== FOCUS PATTERNS =====
  const durations = recentSessions.map(s => Math.floor((s.totalSeconds || 0) / 60));
  const averageFocusDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  
  // Find drop-off point (when deep work typically declines)
  const deepWorkRatios = recentSessions.map(s => {
    if (!s.deepWorkSeconds || !s.totalSeconds) return 50;
    return (s.deepWorkSeconds / s.totalSeconds) * 100;
  });
  const threshold = 60; // Deep work drops below this
  const dropOffIndices = deepWorkRatios.map((ratio, idx) => ratio < threshold ? idx : -1).filter(i => i !== -1);
  
  let dropOffPoint = averageFocusDuration;
  if (dropOffIndices.length > 0) {
    const avgDropOffIndex = Math.round(dropOffIndices.reduce((a, b) => a + b, 0) / dropOffIndices.length);
    // Estimate based on session progression
    dropOffPoint = Math.min(averageFocusDuration, 25 + (avgDropOffIndex * 5));
  }
  
  // Optimal session length (Pomodoro-style based on data)
  const optimalSessionLength = Math.min(45, Math.max(20, averageFocusDuration - 10));
  
  // Attention span trend
  const firstHalf = recentSessions.slice(0, Math.floor(recentSessions.length / 2));
  const secondHalf = recentSessions.slice(-Math.floor(recentSessions.length / 2));
  const firstAvgDuration = firstHalf.reduce((sum, s) => sum + Math.floor((s.totalSeconds || 0) / 60), 0) / firstHalf.length;
  const secondAvgDuration = secondHalf.reduce((sum, s) => sum + Math.floor((s.totalSeconds || 0) / 60), 0) / secondHalf.length;
  
  let attentionSpanTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (secondAvgDuration > firstAvgDuration + 5) {
    attentionSpanTrend = 'improving';
  } else if (secondAvgDuration < firstAvgDuration - 5) {
    attentionSpanTrend = 'declining';
  }
  
  // Deep work percentage (sessions with deep work ratio > 80%)
  const deepWorkSessions = recentSessions.filter(s => {
    if (!s.deepWorkSeconds || !s.totalSeconds) return false;
    return (s.deepWorkSeconds / s.totalSeconds) > 0.8;
  }).length;
  const deepWorkPercentage = Math.round((deepWorkSessions / recentSessions.length) * 100);
  
  // ===== PRODUCTIVITY PATTERNS =====
  // Peak productivity hours (top 3)
  const sortedHours = Array.from(hourPerformance.entries())
    .sort((a, b) => {
      const aProductivity = a[1].total * (a[1].quality / a[1].count);
      const bProductivity = b[1].total * (b[1].quality / b[1].count);
      return bProductivity - aProductivity;
    })
    .slice(0, 3)
    .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);
  
  // Low energy hours (bottom 3)
  const sortedLowHours = Array.from(hourPerformance.entries())
    .sort((a, b) => {
      const aProductivity = a[1].total * (a[1].quality / a[1].count);
      const bProductivity = b[1].total * (b[1].quality / b[1].count);
      return aProductivity - bProductivity;
    })
    .slice(0, 3)
    .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);
  
  // Sessions per day
  const uniqueDays = new Set(recentSessions.map(s => 
    new Date(s.startTime).toDateString()
  ));
  const averageSessionsPerDay = Math.round((recentSessions.length / uniqueDays.size) * 10) / 10;
  
  // Preferred break length (from gaps between sessions)
  const sortedSessions = [...recentSessions].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const breaks: number[] = [];
  for (let i = 1; i < sortedSessions.length; i++) {
    const prevEnd = new Date(sortedSessions[i - 1].startTime).getTime() + (sortedSessions[i - 1].totalSeconds || 0) * 1000;
    const currStart = new Date(sortedSessions[i].startTime).getTime();
    const gapMinutes = (currStart - prevEnd) / 60000;
    if (gapMinutes > 0 && gapMinutes < 120) { // Reasonable break
      breaks.push(gapMinutes);
    }
  }
  const preferredBreakLength = breaks.length > 0 ? Math.round(breaks.reduce((a, b) => a + b, 0) / breaks.length) : 5;
  
  // Work to break ratio
  const totalWorkMinutes = durations.reduce((a, b) => a + b, 0);
  const totalBreakMinutes = breaks.reduce((a, b) => a + b, 0);
  const workToBreakRatio = totalBreakMinutes > 0 ? Math.round(totalWorkMinutes / totalBreakMinutes) : 4;
  
  // ===== LEARNING PATTERNS =====
  // Dominant learning style (from digital twin or infer from session data)
  // For now, default to visual, but could be enhanced with VARK analysis
  const dominantLearningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic' = 'visual';
  
  // Topic switch frequency
  const topicsByDay = new Map<string, Set<string>>();
  recentSessions.forEach(session => {
    const day = new Date(session.startTime).toDateString();
    if (!topicsByDay.has(day)) {
      topicsByDay.set(day, new Set());
    }
    const topic = session.topic.replace(/\[.*\]\s*/g, '').trim();
    topicsByDay.get(day)!.add(topic);
  });
  
  const dailyTopicCounts = Array.from(topicsByDay.values()).map(set => set.size);
  const topicSwitchFrequency = Math.round(dailyTopicCounts.reduce((a, b) => a + b, 0) / dailyTopicCounts.length);
  
  // Revision spacing
  const plan = await StudyPlanModel.findOne({ userId, syllabusId }).lean();
  const completedSessions = plan?.sessions.filter(s => s.status === 'done') || [];
  const revisionGaps: number[] = [];
  
  const topicDates = new Map<string, Date[]>();
  completedSessions.forEach(session => {
    const topic = session.topic.replace(/\[.*\]\s*/g, '').trim();
    if (!topicDates.has(topic)) {
      topicDates.set(topic, []);
    }
    topicDates.get(topic)!.push(new Date(session.date));
  });
  
  topicDates.forEach(dates => {
    if (dates.length > 1) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        const gapDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        revisionGaps.push(gapDays);
      }
    }
  });
  
  const revisionSpacingDays = revisionGaps.length > 0 ? Math.round(revisionGaps.reduce((a, b) => a + b, 0) / revisionGaps.length) : 3;
  
  // Mastery speed (based on quiz improvement rate)
  const quizzes = await QuizResultModel.find({ userId, syllabusId }).sort({ completedAt: 1 }).lean();
  let masterySpeed: 'fast' | 'moderate' | 'slow' = 'moderate';
  
  if (quizzes.length >= 10) {
    const firstQuizAvg = quizzes.slice(0, 5).reduce((sum, q) => sum + q.score, 0) / 5;
    const lastQuizAvg = quizzes.slice(-5).reduce((sum, q) => sum + q.score, 0) / 5;
    const improvementRate = lastQuizAvg - firstQuizAvg;
    
    if (improvementRate > 20) {
      masterySpeed = 'fast';
    } else if (improvementRate > 10) {
      masterySpeed = 'moderate';
    } else {
      masterySpeed = 'slow';
    }
  }
  
  // ===== GENERATE WEEKLY INSIGHTS =====
  const insights: WeeklyInsight[] = [];
  
  // Focus insight
  if (averageFocusDuration > 40) {
    insights.push({
      insight: `Your average focus session is ${averageFocusDuration} minutes`,
      recommendation: `Your focus drops after ${dropOffPoint} mins — switch to ${optimalSessionLength}-min sessions for better retention`,
      confidenceLevel: 85,
      impactPriority: 'high',
      category: 'focus',
    });
  } else if (averageFocusDuration < 25) {
    insights.push({
      insight: `Your study sessions are quite short (${averageFocusDuration} min avg)`,
      recommendation: 'Try extending your sessions to 30-35 minutes for deeper learning',
      confidenceLevel: 80,
      impactPriority: 'medium',
      category: 'focus',
    });
  }
  
  // Time insight
  if (consistencyScore > 75) {
    insights.push({
      insight: `You're most consistent studying around ${averageStartTime}`,
      recommendation: `Keep maintaining this schedule! Your best performance is between ${bestStudyTime}`,
      confidenceLevel: 90,
      impactPriority: 'high',
      category: 'timing',
    });
  } else {
    insights.push({
      insight: 'Your study schedule varies significantly day-to-day',
      recommendation: `Try to study at the same time daily. Your best window appears to be ${bestStudyTime}`,
      confidenceLevel: 75,
      impactPriority: 'high',
      category: 'timing',
    });
  }
  
  // Productivity insight
  if (deepWorkPercentage > 30) {
    insights.push({
      insight: `You achieve deep work in ${deepWorkPercentage}% of sessions`,
      recommendation: 'Excellent! Maintain this by eliminating distractions during peak hours',
      confidenceLevel: 88,
      impactPriority: 'medium',
      category: 'productivity',
    });
  } else {
    insights.push({
      insight: 'Only ${deepWorkPercentage}% of your sessions reach deep work state',
      recommendation: 'Remove phone notifications and use website blockers to improve focus',
      confidenceLevel: 82,
      impactPriority: 'high',
      category: 'productivity',
    });
  }
  
  // Day-specific insight
  insights.push({
    insight: `${mostProductiveDay} is your most productive study day`,
    recommendation: `Schedule your most challenging topics on ${mostProductiveDay} when you're at your best`,
    confidenceLevel: 85,
    impactPriority: 'medium',
    category: 'timing',
  });
  
  return {
    timePatterns: {
      bestStudyTime,
      mostProductiveDay,
      averageStartTime,
      consistencyScore,
    },
    focusPatterns: {
      averageFocusDuration,
      optimalSessionLength,
      dropOffPoint,
      attentionSpanTrend,
      deepWorkPercentage,
    },
    productivityPatterns: {
      peakProductivityHours: sortedHours,
      lowEnergyHours: sortedLowHours,
      averageSessionsPerDay,
      preferredBreakLength,
      workToBreakRatio,
    },
    learningPatterns: {
      dominantLearningStyle,
      topicSwitchFrequency,
      revisionSpacingDays,
      masterySpeed,
    },
    weeklyInsights: insights,
  };
}
