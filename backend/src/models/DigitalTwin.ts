import { Schema, model, Document } from 'mongoose';

export interface LearningStyleProfile {
  visualLearner: number; // 0-100
  auditoryLearner: number; // 0-100
  kinestheticLearner: number; // 0-100
  readingWritingLearner: number; // 0-100
  preferredSessionLength: number; // in minutes
  breakFrequency: number; // every X minutes
}

export interface PerformanceMetrics {
  averageQuizScore: number; // 0-100
  retentionRate: number; // 0-100 (based on spaced repetition performance)
  focusScore: number; // 0-100
  completionRate: number; // 0-100
  averageStudySpeed: number; // topics per hour
  accuracyTrend: 'improving' | 'stable' | 'declining';
  consistencyScore: number; // 0-100
}

export interface TimePatterns {
  bestStudyHours: number[]; // array of hours (0-23)
  mostProductiveDay: string; // e.g., 'Monday'
  leastProductiveDay: string;
  averageSessionDuration: number; // minutes
  typicalStartTime: string; // e.g., '09:00'
  streakDays: number;
}

export interface PredictiveInsights {
  predictedExamScore: number; // 0-100
  confidenceLevel: number; // 0-100
  readinessTrend: 'increasing' | 'stable' | 'decreasing';
  estimatedPreparationTime: number; // hours remaining
  weakAreas: string[];
  strongAreas: string[];
  recommendedFocus: string[];
}

export interface RevisionPatterns {
  averageRevisionsPerTopic: number;
  timeBeforeReview: number; // days
  revisionEffectiveness: number; // 0-100
  spacedRepetitionCompliance: number; // 0-100
  commonMistakeTypes: string[];
}

export interface DigitalTwinDocument extends Document {
  userId: string;
  syllabusId?: string;
  
  // Core metrics
  learningStyle: LearningStyleProfile;
  performance: PerformanceMetrics;
  timePatterns: TimePatterns;
  predictiveInsights: PredictiveInsights;
  revisionPatterns: RevisionPatterns;
  
  // Raw aggregated data
  totalStudyMinutes: number;
  totalSessionsCompleted: number;
  totalQuizzesTaken: number;
  topicsMastered: number;
  topicsInProgress: number;
  
  // AI-generated summary
  aiSummary: string;
  learningPersonality: string; // e.g., "Visual Quick-Starter", "Methodical Deep-Learner"
  
  // Metadata
  dataPointsAnalyzed: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DigitalTwinSchema = new Schema<DigitalTwinDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, index: true },
    
    learningStyle: {
      visualLearner: { type: Number, default: 50, min: 0, max: 100 },
      auditoryLearner: { type: Number, default: 50, min: 0, max: 100 },
      kinestheticLearner: { type: Number, default: 50, min: 0, max: 100 },
      readingWritingLearner: { type: Number, default: 50, min: 0, max: 100 },
      preferredSessionLength: { type: Number, default: 45 },
      breakFrequency: { type: Number, default: 25 },
    },
    
    performance: {
      averageQuizScore: { type: Number, default: 0, min: 0, max: 100 },
      retentionRate: { type: Number, default: 0, min: 0, max: 100 },
      focusScore: { type: Number, default: 0, min: 0, max: 100 },
      completionRate: { type: Number, default: 0, min: 0, max: 100 },
      averageStudySpeed: { type: Number, default: 0 },
      accuracyTrend: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
      consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    
    timePatterns: {
      bestStudyHours: { type: [Number], default: [9, 10, 11] },
      mostProductiveDay: { type: String, default: 'Monday' },
      leastProductiveDay: { type: String, default: 'Friday' },
      averageSessionDuration: { type: Number, default: 45 },
      typicalStartTime: { type: String, default: '09:00' },
      streakDays: { type: Number, default: 0 },
    },
    
    predictiveInsights: {
      predictedExamScore: { type: Number, default: 0, min: 0, max: 100 },
      confidenceLevel: { type: Number, default: 0, min: 0, max: 100 },
      readinessTrend: { type: String, enum: ['increasing', 'stable', 'decreasing'], default: 'stable' },
      estimatedPreparationTime: { type: Number, default: 0 },
      weakAreas: { type: [String], default: [] },
      strongAreas: { type: [String], default: [] },
      recommendedFocus: { type: [String], default: [] },
    },
    
    revisionPatterns: {
      averageRevisionsPerTopic: { type: Number, default: 0 },
      timeBeforeReview: { type: Number, default: 3 },
      revisionEffectiveness: { type: Number, default: 0, min: 0, max: 100 },
      spacedRepetitionCompliance: { type: Number, default: 0, min: 0, max: 100 },
      commonMistakeTypes: { type: [String], default: [] },
    },
    
    totalStudyMinutes: { type: Number, default: 0 },
    totalSessionsCompleted: { type: Number, default: 0 },
    totalQuizzesTaken: { type: Number, default: 0 },
    topicsMastered: { type: Number, default: 0 },
    topicsInProgress: { type: Number, default: 0 },
    
    aiSummary: { type: String, default: '' },
    learningPersonality: { type: String, default: 'Balanced Learner' },
    
    dataPointsAnalyzed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Index for efficient queries
DigitalTwinSchema.index({ userId: 1, syllabusId: 1, createdAt: -1 });

export const DigitalTwinModel = model<DigitalTwinDocument>('DigitalTwin', DigitalTwinSchema);
