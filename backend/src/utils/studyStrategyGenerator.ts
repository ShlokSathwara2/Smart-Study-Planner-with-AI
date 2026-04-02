import { StudyPlanModel } from '../models/StudyPlan';
import { SyllabusModel } from '../models/Syllabus';
import { DigitalTwinModel } from '../models/DigitalTwin';

export interface DayPlan {
  day: number;
  date: string;
  topics: string[];
  estimatedHours: number;
  focus: string;
  tips: string;
}

export interface GeneratedStrategy {
  summary: string;
  totalDays: number;
  dailyPlan: DayPlan[];
  priorityTopics: string[];
  recommendedActions: string[];
  confidenceLevel: number;
}

export interface StrategyRequest {
  userId: string;
  syllabusId: string;
  query: string;
  examDate?: string;
  availableHoursPerDay?: number;
}

export async function generateStudyStrategy(
  request: StrategyRequest
): Promise<GeneratedStrategy> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // Get user's data
  const plan = await StudyPlanModel.findOne({ 
    userId: request.userId, 
    syllabusId: request.syllabusId 
  }).lean();
  
  const syllabus = await SyllabusModel.findById(request.syllabusId).lean();
  const digitalTwin = await DigitalTwinModel.findOne({ 
    userId: request.userId, 
    syllabusId: request.syllabusId 
  }).sort({ createdAt: -1 }).lean();
  
  // Extract topic tree
  const topics = (syllabus as any)?.analysis?.topics || [];
  const completedTopics = plan?.sessions
    .filter((s: any) => s.status === 'done')
    .map((s: any) => s.topic.replace(/\[.*\]\s*/g, '').trim()) || [];
  
  const remainingTopics = topics.filter(
    t => !completedTopics.includes(t)
  );
  
  // Calculate days available
  let daysAvailable = 10;
  if (request.examDate) {
    const exam = new Date(request.examDate);
    const now = new Date();
    const diffTime = exam.getTime() - now.getTime();
    daysAvailable = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  // Prepare context for Claude
  const prompt = `You are an expert study planner creating a customized strategy.

STUDENT PROFILE:
${digitalTwin ? `- Learning Style: Visual ${digitalTwin.learningStyle?.visualLearner}%, Auditory ${digitalTwin.learningStyle?.auditoryLearner}%
- Average Quiz Score: ${digitalTwin.performance?.averageQuizScore}%
- Best Study Hours: ${digitalTwin.timePatterns?.bestStudyHours?.join(', ') || 'Not specified'}
- Focus Score: ${digitalTwin.performance?.focusScore || 50}/100
- Study Personality: ${digitalTwin.learningPersonality || 'Not specified'}` : '- No learning profile available'}

CURRENT STATUS:
- Total Topics: ${topics.length}
- Completed: ${completedTopics.length}
- Remaining: ${remainingTopics.length}
- Remaining Topics: ${remainingTopics.slice(0, 10).join(', ')}${remainingTopics.length > 10 ? '...' : ''}

USER REQUEST:
"${request.query}"

CONSTRAINTS:
- Days Available: ${daysAvailable}
- Hours Per Day: ${request.availableHoursPerDay || 2}

Create a detailed day-by-day study strategy that:
1. Prioritizes high-yield topics based on learning style
2. Schedules difficult topics during peak performance hours
3. Includes spaced repetition for previously completed topics
4. Balances depth vs coverage given time constraints
5. Provides actionable daily goals

Respond in JSON format:
{
  "summary": "2-3 sentence overview of the strategy",
  "totalDays": number,
  "dailyPlan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "topics": ["Topic 1", "Topic 2"],
      "estimatedHours": 2.5,
      "focus": "Main focus area",
      "tips": "Specific study tip"
    }
  ],
  "priorityTopics": ["High priority topic 1", "topic 2"],
  "recommendedActions": ["Action 1", "Action 2"],
  "confidenceLevel": number (0-100)
}`;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

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
        max_tokens: 2000,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;

    try {
      const parsed: GeneratedStrategy = JSON.parse(content);
      
      // Validate and sanitize
      return {
        summary: parsed.summary || 'Strategy generated successfully',
        totalDays: parsed.totalDays || daysAvailable,
        dailyPlan: Array.isArray(parsed.dailyPlan) ? parsed.dailyPlan : [],
        priorityTopics: Array.isArray(parsed.priorityTopics) ? parsed.priorityTopics : [],
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
        confidenceLevel: Math.min(100, Math.max(0, parsed.confidenceLevel || 70)),
      };
    } catch (parseError) {
      console.error('Failed to parse strategy from Claude:', parseError);
      throw new Error('Failed to parse strategy response');
    }
  } catch (error: any) {
    console.error('Strategy generation error:', error);
    throw error;
  }
}
