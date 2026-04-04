"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateExamSignals = aggregateExamSignals;
const StudyPlan_1 = require("../models/StudyPlan");
const QuizResult_1 = require("../models/QuizResult");
const FocusSession_1 = require("../models/FocusSession");
const WeakTopic_1 = require("../models/WeakTopic");
const DigitalTwin_1 = require("../models/DigitalTwin");
async function aggregateExamSignals(userId, syllabusId) {
    // Get study plan
    const plan = await StudyPlan_1.StudyPlanModel.findOne({ userId, syllabusId }).lean();
    // Get all quizzes
    const quizzes = await QuizResult_1.QuizResultModel.find({ userId, syllabusId })
        .sort({ completedAt: 1 })
        .lean();
    // Get focus sessions
    const sessions = await FocusSession_1.FocusSessionModel.find({ userId, syllabusId }).lean();
    // Get weak topics
    const weakTopics = await WeakTopic_1.WeakTopicModel.find({ userId, syllabusId, isWeak: true }).lean();
    // Get digital twin for additional context
    const digitalTwin = await DigitalTwin_1.DigitalTwinModel.findOne({ userId, syllabusId })
        .sort({ createdAt: -1 })
        .lean();
    // ===== SYLLABUS COMPLETION =====
    const allSessions = plan?.sessions || [];
    const uniqueTopics = new Set(allSessions.map((s) => s.topic.replace(/\[.*\]\s*/g, '').trim()));
    const completedTopics = new Set(allSessions
        .filter((s) => s.status === 'done')
        .map((s) => s.topic.replace(/\[.*\]\s*/g, '').trim()));
    const remainingTopics = Array.from(uniqueTopics).filter(topic => !completedTopics.has(topic));
    const syllabusCompletion = {
        totalTopics: uniqueTopics.size,
        completedTopics: completedTopics.size,
        completionPercentage: uniqueTopics.size > 0
            ? Math.round((completedTopics.size / uniqueTopics.size) * 100)
            : 0,
        remainingTopics,
    };
    // ===== QUIZ PERFORMANCE =====
    const topicQuizMap = new Map();
    quizzes.forEach(quiz => {
        const topic = quiz.topic;
        if (!topicQuizMap.has(topic)) {
            topicQuizMap.set(topic, { scores: [], attempts: 0 });
        }
        const data = topicQuizMap.get(topic);
        data.scores.push(quiz.score);
        data.attempts++;
    });
    const topicScores = Array.from(topicQuizMap.entries()).map(([topic, data]) => ({
        topic,
        score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        attempts: data.attempts,
    }));
    const averageScore = quizzes.length > 0
        ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length)
        : 0;
    // Calculate trend (last 5 vs first 5)
    let recentTrend = 'stable';
    if (quizzes.length >= 10) {
        const firstHalf = quizzes.slice(0, 5);
        const secondHalf = quizzes.slice(-5);
        const firstAvg = firstHalf.reduce((sum, q) => sum + q.score, 0) / 5;
        const secondAvg = secondHalf.reduce((sum, q) => sum + q.score, 0) / 5;
        if (secondAvg > firstAvg + 8) {
            recentTrend = 'improving';
        }
        else if (secondAvg < firstAvg - 8) {
            recentTrend = 'declining';
        }
    }
    const quizPerformance = {
        totalQuizzes: quizzes.length,
        averageScore,
        recentTrend,
        topicScores,
    };
    // ===== REVISION CYCLES =====
    const revisionMap = new Map();
    quizzes.forEach(quiz => {
        const topic = quiz.topic;
        revisionMap.set(topic, (revisionMap.get(topic) || 0) + 1);
    });
    const totalRevisions = quizzes.length;
    const averageRevisionsPerTopic = topicQuizMap.size > 0
        ? totalRevisions / topicQuizMap.size
        : 0;
    // Revision effectiveness (score improvement on retakes)
    let revisionEffectiveness = 70; // default
    const improvingTopics = Array.from(topicQuizMap.values()).filter(data => data.scores.length >= 2 &&
        data.scores[data.scores.length - 1] > data.scores[0] + 5).length;
    if (topicQuizMap.size > 0) {
        revisionEffectiveness = Math.round((improvingTopics / topicQuizMap.size) * 100);
    }
    // Spaced repetition compliance
    const spacedRepetitionCompliance = digitalTwin?.performance?.retentionRate || 50;
    const revisionCycles = {
        totalRevisions,
        averageRevisionsPerTopic: Math.round(averageRevisionsPerTopic * 10) / 10,
        revisionEffectiveness,
        spacedRepetitionCompliance,
    };
    // ===== TIME INVESTMENT =====
    const totalMinutes = sessions.reduce((sum, s) => sum + Math.floor((s.totalSeconds || 0) / 60), 0);
    const totalHours = Math.round(totalMinutes / 60);
    // Calculate planned hours from study plan
    const plannedMinutes = allSessions.reduce((sum, s) => sum + (s.estimatedMinutes || 60), 0);
    const plannedHours = Math.round(plannedMinutes / 60);
    const actualVsPlannedRatio = plannedHours > 0
        ? Math.min(2, totalHours / plannedHours) // Cap at 2x
        : 0;
    // Weekly trend (last 4 weeks)
    const weeklyTrend = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        const weekHours = sessions
            .filter(s => {
            const sessionDate = new Date(s.startTime);
            return sessionDate >= weekStart && sessionDate < weekEnd;
        })
            .reduce((sum, s) => sum + Math.floor((s.totalSeconds || 0) / 60), 0) / 60;
        weeklyTrend.push(Math.round(weekHours * 10) / 10);
    }
    const timeInvestment = {
        totalHours,
        plannedHours,
        actualVsPlannedRatio: Math.round(actualVsPlannedRatio * 100) / 100,
        weeklyTrend,
    };
    // ===== CONSISTENCY =====
    const studyStreak = digitalTwin?.timePatterns?.streakDays || 0;
    const plannedSessions = allSessions.filter((s) => new Date(s.date) < new Date()).length;
    const completedSessions = allSessions.filter((s) => s.status === 'done').length;
    const missedSessions = Math.max(0, plannedSessions - completedSessions);
    const onTimeCompletionRate = plannedSessions > 0
        ? Math.round((completedSessions / plannedSessions) * 100)
        : 0;
    // Regularity score (based on variance in weekly study time)
    const avgWeekly = weeklyTrend.reduce((a, b) => a + b, 0) / (weeklyTrend.length || 1);
    const variance = weeklyTrend.reduce((sum, h) => sum + Math.pow(h - avgWeekly, 2), 0) / (weeklyTrend.length || 1);
    const stdDev = Math.sqrt(variance);
    const regularityScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev / (avgWeekly || 1)) * 100)));
    const consistency = {
        studyStreak,
        missedSessions,
        onTimeCompletionRate,
        regularityScore,
    };
    // ===== RISK INDICATORS =====
    const lowQuizScoresCount = topicScores.filter(ts => ts.score < 60).length;
    const incompleteTopicsCount = remainingTopics.length;
    const decliningTrendTopics = topicScores.filter(ts => {
        const topicQuizzes = quizzes.filter(q => q.topic === ts.topic);
        if (topicQuizzes.length < 3)
            return false;
        const recent = topicQuizzes.slice(-2);
        const older = topicQuizzes.slice(0, 2);
        const recentAvg = recent.reduce((sum, q) => sum + q.score, 0) / recent.length;
        const olderAvg = older.reduce((sum, q) => sum + q.score, 0) / older.length;
        return recentAvg < olderAvg - 10;
    }).length;
    const riskIndicators = {
        weakTopicsCount: weakTopics.length,
        lowQuizScoresCount,
        incompleteTopicsCount,
        decliningTrendTopics,
    };
    return {
        syllabusCompletion,
        quizPerformance,
        revisionCycles,
        timeInvestment,
        consistency,
        riskIndicators,
    };
}
