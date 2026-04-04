"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateUserBehavior = aggregateUserBehavior;
exports.calculateLearningStyle = calculateLearningStyle;
exports.calculatePerformanceMetrics = calculatePerformanceMetrics;
exports.calculateTimePatterns = calculateTimePatterns;
const FocusSession_1 = require("../models/FocusSession");
const QuizResult_1 = require("../models/QuizResult");
const StudyPlan_1 = require("../models/StudyPlan");
const CognitiveLoad_1 = require("../models/CognitiveLoad");
async function aggregateUserBehavior(userId, syllabusId) {
    const query = { userId };
    if (syllabusId) {
        query.syllabusId = syllabusId;
    }
    // Aggregate focus sessions
    const focusSessions = await FocusSession_1.FocusSessionModel.find(query).lean();
    const totalStudyMinutes = focusSessions.reduce((sum, s) => sum + Math.floor((s.totalSeconds || 0) / 60), 0);
    // Aggregate quiz results
    const quizzes = await QuizResult_1.QuizResultModel.find(query).sort({ completedAt: 1 }).lean();
    const quizScores = quizzes.map(q => q.score);
    const averageQuizScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;
    // Get study plans
    const plans = await StudyPlan_1.StudyPlanModel.find(query).lean();
    let totalSessionsCompleted = 0;
    let topicsMastered = 0;
    let topicsInProgress = 0;
    plans.forEach(plan => {
        const sessions = plan.sessions || [];
        totalSessionsCompleted += sessions.filter((s) => s.status === 'done').length;
        const uniqueTopics = new Set(sessions.map((s) => s.topic.replace(/\[.*\]\s*/g, '').trim()));
        const doneTopics = new Set(sessions
            .filter((s) => s.status === 'done')
            .map((s) => s.topic.replace(/\[.*\]\s*/g, '').trim()));
        topicsMastered = Math.max(topicsMastered, doneTopics.size);
        topicsInProgress = Math.max(topicsInProgress, uniqueTopics.size - doneTopics.size);
    });
    // Analyze time patterns
    const studyByHour = {};
    const studyByDayOfWeek = {};
    focusSessions.forEach(session => {
        const startTime = new Date(session.startTime);
        const hour = startTime.getHours();
        const dayOfWeek = startTime.getDay();
        studyByHour[hour] = (studyByHour[hour] || 0) + 1;
        studyByDayOfWeek[dayOfWeek] = (studyByDayOfWeek[dayOfWeek] || 0) + 1;
    });
    // Analyze revision patterns
    const revisionMap = new Map();
    quizzes.forEach(quiz => {
        const key = quiz.topic;
        if (!revisionMap.has(key)) {
            revisionMap.set(key, { attempts: 0, scores: [], dates: [] });
        }
        const data = revisionMap.get(key);
        data.attempts++;
        data.scores.push(quiz.score);
        data.dates.push(new Date(quiz.completedAt));
    });
    const revisionHistory = Array.from(revisionMap.entries()).map(([topic, data]) => {
        const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
        let totalTimeBetweenReviews = 0;
        for (let i = 1; i < sortedDates.length; i++) {
            totalTimeBetweenReviews += (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        }
        return {
            topic,
            attempts: data.attempts,
            scores: data.scores,
            timeBetweenReviews: sortedDates.length > 1 ? totalTimeBetweenReviews / (sortedDates.length - 1) : 0,
        };
    });
    // Get cognitive load data
    const cognitiveLoadDocs = await CognitiveLoad_1.CognitiveLoadModel.find(query).lean();
    const cognitiveLoadData = cognitiveLoadDocs.map(doc => ({
        topic: doc.topic,
        timeSpent: doc.averageTimeOnTopic,
        difficulty: doc.difficultyLevel || 'medium',
    }));
    return {
        totalStudyMinutes,
        totalSessionsCompleted,
        totalQuizzesTaken: quizzes.length,
        topicsMastered,
        topicsInProgress,
        averageQuizScore,
        quizScores,
        focusSessions: focusSessions.map(s => ({
            deepWorkSeconds: s.deepWorkSeconds || 0,
            distractionCount: s.distractionCount || 0,
            duration: Math.floor((s.totalSeconds || 0) / 60),
        })),
        studyByHour,
        studyByDayOfWeek,
        revisionHistory,
        cognitiveLoadData,
    };
}
function calculateLearningStyle(focusSessions) {
    // Calculate preferred session length
    const avgSessionLength = focusSessions.length > 0
        ? Math.round(focusSessions.reduce((sum, s) => sum + s.duration, 0) /
            focusSessions.length)
        : 45;
    // Calculate consistency (proxy for learning style indicators)
    const sessionLengths = focusSessions.map(s => s.duration);
    const variance = sessionLengths.length > 1
        ? sessionLengths.reduce((sum, len) => sum + Math.pow(len - avgSessionLength, 2), 0) /
            sessionLengths.length
        : 0;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - (stdDev / avgSessionLength) * 100);
    // Infer learning style from focus patterns
    // High focus + low distractions = likely reading/writing or visual
    const avgFocusScore = focusSessions.length > 0
        ? focusSessions.reduce((sum, s) => sum +
            (s.duration > 0
                ? Math.round((s.deepWorkSeconds / (s.duration * 60)) * 100)
                : 0), 0) / focusSessions.length
        : 50;
    const avgDistractions = focusSessions.length > 0
        ? focusSessions.reduce((sum, s) => sum + s.distractionCount, 0) /
            focusSessions.length
        : 0;
    // Heuristic scoring
    const readingWritingLearner = Math.min(100, Math.round(avgFocusScore + consistency * 0.3));
    const visualLearner = Math.min(100, Math.round(avgFocusScore + (100 - consistency) * 0.2));
    const kinestheticLearner = Math.min(100, Math.round(50 + avgDistractions * 5));
    const auditoryLearner = 50; // Hard to infer without audio data
    return {
        visualLearner,
        auditoryLearner,
        kinestheticLearner,
        readingWritingLearner,
        preferredSessionLength: avgSessionLength,
        breakFrequency: avgSessionLength > 60 ? 45 : 25,
    };
}
function calculatePerformanceMetrics(quizScores, focusSessions, totalSessionsCompleted, totalTopics) {
    // Average quiz score
    const averageQuizScore = quizScores.length > 0
        ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
        : 0;
    // Retention rate (based on quiz improvement over time)
    let retentionRate = 70; // default
    if (quizScores.length >= 3) {
        const recentAvg = quizScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const overallAvg = quizScores.reduce((a, b) => a + b, 0) / quizScores.length;
        retentionRate = Math.min(100, Math.round((recentAvg / overallAvg) * 100));
    }
    // Focus score
    const focusScore = focusSessions.length > 0
        ? Math.round(focusSessions.reduce((sum, s) => sum +
            (s.duration > 0
                ? (s.deepWorkSeconds / (s.duration * 60)) * 100
                : 0), 0) / focusSessions.length)
        : 0;
    // Completion rate
    const completionRate = totalTopics > 0
        ? Math.round((totalSessionsCompleted / totalTopics) * 100)
        : 0;
    // Study speed (topics per hour)
    const totalHours = focusSessions.reduce((sum, s) => sum + s.duration, 0) / 60;
    const averageStudySpeed = totalHours > 0 ? totalTopics / totalHours : 0;
    // Accuracy trend
    let accuracyTrend = 'stable';
    if (quizScores.length >= 5) {
        const firstHalf = quizScores.slice(0, Math.floor(quizScores.length / 2));
        const secondHalf = quizScores.slice(Math.floor(quizScores.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (secondAvg > firstAvg + 5) {
            accuracyTrend = 'improving';
        }
        else if (secondAvg < firstAvg - 5) {
            accuracyTrend = 'declining';
        }
    }
    // Consistency score
    const consistencyScore = Math.min(100, Math.round(completionRate * 0.5 + focusScore * 0.5));
    return {
        averageQuizScore,
        retentionRate,
        focusScore: Math.round(focusScore),
        completionRate: Math.min(100, completionRate),
        averageStudySpeed: Math.round(averageStudySpeed * 10) / 10,
        accuracyTrend,
        consistencyScore,
    };
}
function calculateTimePatterns(studyByHour, studyByDayOfWeek, focusSessions) {
    // Find peak hours
    const sortedHours = Object.entries(studyByHour)
        .sort(([, a], [, b]) => b - a)
        .map(([hour]) => parseInt(hour));
    const bestStudyHours = sortedHours.slice(0, 3);
    // Find productive days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sortedDays = Object.entries(studyByDayOfWeek)
        .sort(([, a], [, b]) => b - a)
        .map(([day]) => dayNames[parseInt(day)]);
    const mostProductiveDay = sortedDays[0] || 'Monday';
    const leastProductiveDay = sortedDays[sortedDays.length - 1] || 'Friday';
    // Average session duration
    const averageSessionDuration = focusSessions.length > 0
        ? Math.round(focusSessions.reduce((sum, s) => sum + s.duration, 0) /
            focusSessions.length)
        : 45;
    // Typical start time
    const typicalStartTime = bestStudyHours.length > 0
        ? `${String(bestStudyHours[0]).padStart(2, '0')}:00`
        : '09:00';
    // Calculate streak
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const uniqueDays = new Set(focusSessions.map(s => {
        const d = new Date(s.startTime);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }));
    let currentDate = new Date(today);
    while (uniqueDays.has(currentDate.getTime())) {
        streakDays++;
        currentDate.setDate(currentDate.getDate() - 1);
    }
    return {
        bestStudyHours,
        mostProductiveDay,
        leastProductiveDay,
        averageSessionDuration,
        typicalStartTime,
        streakDays,
    };
}
