import { Schema, model, Document } from 'mongoose';

export interface LearningSignal {
  topic: string;
  timeSpentMinutes: number;
  quizAccuracy?: number; // 0-100
  pauseCount?: number;
  rewindCount?: number;
  sessionCount: number;
  lastStudiedAt?: string;
}

export interface CognitiveLoadDocument extends Document {
  userId: string;
  syllabusId: string;
  topic: string;
  signals: LearningSignal[];
  averageTimeOnTopic: number;
  averageQuizAccuracy: number;
  totalPauseCount: number;
  cognitiveLoadScore?: number; // 0-100, calculated by Claude
  difficultyLevel?: 'easy' | 'medium' | 'hard' | 'very-hard';
  shouldSplit?: boolean;
  splitSuggestions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CognitiveLoadSchema = new Schema<CognitiveLoadDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    signals: [{
      timeSpentMinutes: { type: Number, required: true },
      quizAccuracy: { type: Number, min: 0, max: 100 },
      pauseCount: { type: Number, default: 0 },
      rewindCount: { type: Number, default: 0 },
      sessionCount: { type: Number, default: 1 },
      lastStudiedAt: { type: String },
    }],
    averageTimeOnTopic: { type: Number, default: 0 },
    averageQuizAccuracy: { type: Number, default: 0 },
    totalPauseCount: { type: Number, default: 0 },
    cognitiveLoadScore: { type: Number, min: 0, max: 100 },
    difficultyLevel: { 
      type: String, 
      enum: ['easy', 'medium', 'hard', 'very-hard'] 
    },
    shouldSplit: { type: Boolean, default: false },
    splitSuggestions: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Index for efficient queries
CognitiveLoadSchema.index({ userId: 1, syllabusId: 1, topic: 1 });

export const CognitiveLoadModel = model<CognitiveLoadDocument>('CognitiveLoad', CognitiveLoadSchema);
