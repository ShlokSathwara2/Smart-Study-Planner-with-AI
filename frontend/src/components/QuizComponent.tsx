"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";

interface QuizComponentProps {
  userId?: string;
  syllabusId?: string;
  topic: string;
  onComplete?: (score: number) => void;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Attempt {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
  answeredAt: string;
}

export function QuizComponent({ userId, syllabusId, topic, onComplete }: QuizComponentProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [quizComplete, setQuizComplete] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    generateQuestions();
  }, [topic]);

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          syllabusId,
          topic,
          numQuestions: 5,
        }),
      });

      const data = await response.json();
      if (data.ok && data.questions) {
        setQuestions(data.questions);
        setCurrentQuestion(0);
        setAttempts([]);
        setQuizComplete(false);
        setQuestionStartTime(Date.now());
      }
    } catch (error) {
      console.error("Failed to generate questions:", error);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !questions[currentQuestion]) return;

    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    const attempt: Attempt = {
      questionIndex: currentQuestion,
      selectedAnswer,
      isCorrect,
      timeSpentSeconds: timeSpent,
      answeredAt: new Date().toISOString(),
    };

    setAttempts([...attempts, attempt]);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuestionStartTime(Date.now());
    } else {
      // Quiz complete - submit results
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          syllabusId,
          topic,
          questions,
          attempts,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setScore(data.score);
        setQuizComplete(true);
        onComplete?.(data.score);
      }
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    }
  };

  if (loading || generating) {
    return (
      <GlassCard className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📝</div>
          <p className="text-slate-400">
            {generating ? "Generating AI questions..." : "Loading quiz..."}
          </p>
        </div>
      </GlassCard>
    );
  }

  if (quizComplete) {
    const correctCount = attempts.filter(a => a.isCorrect).length;
    return (
      <GlassCard className="w-full max-w-2xl mx-auto">
        <div className="text-center py-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl mb-6"
          >
            {score >= 80 ? "🎉" : score >= 60 ? "👍" : "📚"}
          </motion.div>
          
          <h2 className="text-2xl font-bold text-slate-50 mb-2">
            Quiz Complete!
          </h2>
          <p className="text-slate-400 mb-6">{topic}</p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-white/[0.02] rounded-lg p-4">
              <p className="text-3xl font-bold text-indigo-400">{score}%</p>
              <p className="text-xs text-slate-400 mt-1">Score</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <p className="text-3xl font-bold text-green-400">{correctCount}/{questions.length}</p>
              <p className="text-xs text-slate-400 mt-1">Correct</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-4">
              <p className="text-3xl font-bold text-emerald-400">
                {Math.floor((Date.now() - startTime) / 60000)}m
              </p>
              <p className="text-xs text-slate-400 mt-1">Time</p>
            </div>
          </div>

          {score < 70 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6"
            >
              <p className="text-sm text-orange-300">
                ⚠️ This topic may need additional review
              </p>
            </motion.div>
          )}

          <div className="flex gap-4 justify-center">
            <GradientButton
              label="Retake Quiz"
              onClick={generateQuestions}
            />
          </div>
        </div>
      </GlassCard>
    );
  }

  const question = questions[currentQuestion];

  return (
    <GlassCard className="w-full max-w-2xl mx-auto">
      <div className="p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion) / questions.length) * 100)}% complete</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h3 className="text-xl font-semibold text-slate-100 mb-6">
              {question.question}
            </h3>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {question.options.map((option, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  disabled={showExplanation}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedAnswer === idx
                      ? showExplanation
                        ? idx === question.correctAnswer
                          ? "bg-green-500/20 border-green-500 text-green-300"
                          : "bg-red-500/20 border-red-500 text-red-300"
                        : "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                      : showExplanation && idx === question.correctAnswer
                        ? "bg-green-500/20 border-green-500 text-green-300"
                        : "bg-white/5 border-white/10 hover:border-indigo-400/50 text-slate-200"
                  }`}
                  whileHover={!showExplanation ? { scale: 1.01 } : {}}
                  whileTap={!showExplanation ? { scale: 0.99 } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      selectedAnswer === idx
                        ? "bg-indigo-500 text-white"
                        : "bg-white/10 text-slate-400"
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Explanation */}
            {showExplanation && question.explanation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className={`mb-6 p-4 rounded-lg ${
                  attempts[attempts.length - 1]?.isCorrect
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <p className="text-sm text-slate-300">
                  <span className="font-bold mb-2 block">
                    {attempts[attempts.length - 1]?.isCorrect ? "✅ Correct!" : "❌ Incorrect"}
                  </span>
                  {question.explanation}
                </p>
              </motion.div>
            )}

            {/* Action Button */}
            {!showExplanation ? (
              <GradientButton
                label="Submit Answer"
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="w-full"
              />
            ) : (
              <GradientButton
                label={currentQuestion < questions.length - 1 ? "Next Question →" : "Finish Quiz"}
                onClick={handleNextQuestion}
                className="w-full"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
