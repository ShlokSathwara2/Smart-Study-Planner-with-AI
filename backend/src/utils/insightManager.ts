import { StudyPatternsModel } from '../models/StudyPatterns';
import { analyzeStudyPatterns } from './patternAnalyzer';
import { generateDailyCoachMessage, saveDailyCoachMessage } from './dailyStudyCoach';

export async function updateStudyPatterns(
  userId: string,
  syllabusId?: string,
  minDays: number = 14
): Promise<any> {
  try {
    // Analyze patterns
    const analyzed = await analyzeStudyPatterns(userId, syllabusId, minDays);
    
    // Get or create patterns document
    let patterns = await StudyPatternsModel.findOne({ userId, syllabusId });
    
    if (!patterns) {
      // Create new
      patterns = await StudyPatternsModel.create({
        userId,
        syllabusId,
        ...analyzed,
        analysisStartDate: new Date(Date.now() - minDays * 24 * 60 * 60 * 1000),
        totalSessionsAnalyzed: 0,
        totalHoursTracked: 0,
        dataQualityScore: Math.min(100, (analyzed.weeklyInsights.length / 4) * 100),
      });
    } else {
      // Update existing
      patterns.set(analyzed);
      patterns.lastUpdated = new Date();
      
      // Update data quality score based on amount of data
      const sessionsCount = analyzed.weeklyInsights.length;
      patterns.dataQualityScore = Math.min(100, Math.round((sessionsCount / 10) * 100));
      
      await patterns.save();
    }
    
    return patterns;
  } catch (error: any) {
    if (error.message.includes('Insufficient data')) {
      throw error;
    }
    throw error;
  }
}

export async function getOrCreateDailyMessage(
  userId: string,
  syllabusId?: string
): Promise<any> {
  // Check if we already have a message for today
  const patterns = await StudyPatternsModel.findOne({ userId, syllabusId }).lean();
  
  if (!patterns) {
    // No patterns yet, generate fresh message
    const coachMessage = await generateDailyCoachMessage(userId, syllabusId);
    await saveDailyCoachMessage(userId, syllabusId, coachMessage);
    return coachMessage;
  }
  
  // Check for today's message
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayMessage = patterns.dailyCoachMessages?.find(m => {
    const msgDate = new Date(m.date);
    msgDate.setHours(0, 0, 0, 0);
    return msgDate.getTime() === today.getTime();
  });
  
  if (todayMessage) {
    return todayMessage;
  }
  
  // Generate new message for today
  const coachMessage = await generateDailyCoachMessage(userId, syllabusId);
  await saveDailyCoachMessage(userId, syllabusId, coachMessage);
  
  return coachMessage;
}
