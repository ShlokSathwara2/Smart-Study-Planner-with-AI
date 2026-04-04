"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDigitalTwinContext = getDigitalTwinContext;
exports.formatDigitalTwinPrompt = formatDigitalTwinPrompt;
exports.getDefaultDigitalTwinContext = getDefaultDigitalTwinContext;
const DigitalTwin_1 = require("../models/DigitalTwin");
/**
 * Get digital twin context for a user and format it for AI prompts
 */
async function getDigitalTwinContext(userId, syllabusId) {
    try {
        const digitalTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
            .sort({ createdAt: -1 })
            .lean();
        if (!digitalTwin) {
            return null;
        }
        return {
            learningPersonality: digitalTwin.learningPersonality,
            aiSummary: digitalTwin.aiSummary,
            performance: {
                averageQuizScore: digitalTwin.performance.averageQuizScore,
                retentionRate: digitalTwin.performance.retentionRate,
                focusScore: digitalTwin.performance.focusScore,
                completionRate: digitalTwin.performance.completionRate,
                accuracyTrend: digitalTwin.performance.accuracyTrend,
            },
            timePatterns: {
                bestStudyHours: digitalTwin.timePatterns.bestStudyHours,
                mostProductiveDay: digitalTwin.timePatterns.mostProductiveDay,
                averageSessionDuration: digitalTwin.timePatterns.averageSessionDuration,
            },
            predictiveInsights: {
                predictedExamScore: digitalTwin.predictiveInsights.predictedExamScore,
                weakAreas: digitalTwin.predictiveInsights.weakAreas,
                strongAreas: digitalTwin.predictiveInsights.strongAreas,
                recommendedFocus: digitalTwin.predictiveInsights.recommendedFocus,
            },
        };
    }
    catch (error) {
        console.error('Failed to get digital twin context:', error);
        return null;
    }
}
/**
 * Format digital twin context as a prompt snippet for Claude
 */
function formatDigitalTwinPrompt(context) {
    return `
STUDENT LEARNING PROFILE (Digital Twin):
- Learning Personality: ${context.learningPersonality}
- Profile Summary: ${context.aiSummary}

PERFORMANCE METRICS:
- Average Quiz Score: ${context.performance.averageQuizScore}%
- Retention Rate: ${context.performance.retentionRate}%
- Focus Score: ${context.performance.focusScore}/100
- Completion Rate: ${context.performance.completionRate}%
- Accuracy Trend: ${context.performance.accuracyTrend}

TIME PATTERNS:
- Best Study Hours: ${context.timePatterns.bestStudyHours.map(h => `${h}:00`).join(', ')}
- Most Productive Day: ${context.timePatterns.mostProductiveDay}
- Average Session Duration: ${context.timePatterns.averageSessionDuration} minutes

PREDICTIVE INSIGHTS:
- Predicted Exam Score: ${context.predictiveInsights.predictedExamScore}%
- Strong Areas: ${context.predictiveInsights.strongAreas.join(', ') || 'None identified'}
- Weak Areas: ${context.predictiveInsights.weakAreas.join(', ') || 'None identified'}
- Recommended Focus: ${context.predictiveInsights.recommendedFocus.join(', ') || 'Continue current plan'}

Use this profile to personalize your response to this student's learning style, pace, and needs.
`.trim();
}
/**
 * Get or create default context when no digital twin exists
 */
function getDefaultDigitalTwinContext() {
    return {
        learningPersonality: 'New Learner',
        aiSummary: 'Just starting their learning journey. Building initial performance baseline.',
        performance: {
            averageQuizScore: 0,
            retentionRate: 0,
            focusScore: 0,
            completionRate: 0,
            accuracyTrend: 'stable',
        },
        timePatterns: {
            bestStudyHours: [9, 10, 11],
            mostProductiveDay: 'Monday',
            averageSessionDuration: 45,
        },
        predictiveInsights: {
            predictedExamScore: 0,
            weakAreas: [],
            strongAreas: [],
            recommendedFocus: ['Complete initial assessments'],
        },
    };
}
