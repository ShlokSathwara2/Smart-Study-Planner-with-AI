import { Schema, model, Document } from 'mongoose';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  explanation?: string;
}

export interface QuizAttempt {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
  answeredAt: string;
}

export interface QuizResultDocument extends Document {
  userId: string;
  syllabusId: string;
  topic: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  score: number; // 0-100
  totalTimeSeconds: number;
  completedAt: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizResultSchema = new Schema<QuizResultDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    questions: [{
      question: { type: String, required: true },
      options: { type: [String], required: true },
      correctAnswer: { type: Number, required: true },
      explanation: { type: String },
    }],
    attempts: [{
      questionIndex: { type: Number, required: true },
      selectedAnswer: { type: Number, required: true },
      isCorrect: { type: Boolean, required: true },
      timeSpentSeconds: { type: Number, required: true },
      answeredAt: { type: String, required: true },
    }],
    score: { type: Number, required: true, min: 0, max: 100 },
    totalTimeSeconds: { type: Number, required: true },
    completedAt: { type: String, required: true },
  },
  { timestamps: true },
);

// Index for efficient queries
QuizResultSchema.index({ userId: 1, syllabusId: 1, topic: 1, completedAt: -1 });

export const QuizResultModel = model<QuizResultDocument>('QuizResult', QuizResultSchema);
