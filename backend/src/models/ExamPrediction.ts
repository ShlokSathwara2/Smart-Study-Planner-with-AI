import { Schema, model, Document } from 'mongoose';

export interface PredictionBreakdown {
  syllabusCompletionScore: number; // 0-100
  quizPerformanceScore: number; // 0-100
  revisionQualityScore: number; // 0-100
  timeInvestmentScore: number; // 0-100
  consistencyScore: number; // 0-100
}

export interface RiskTopic {
  topic: string;
  reason: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  quizScore?: number;
  completionPercentage?: number;
  revisionsCompleted?: number;
}

export interface ReadinessTrend {
  weekNumber: number;
  readinessPercentage: number;
  predictedScore: number;
  trend: 'improving' | 'stable' | 'declining';
  weekLabel: string; // e.g., "Week 1", "Week 2"
}

export interface ExamPredictionDocument extends Document {
  userId: string;
  syllabusId: string;
  
  // Core predictions
  readinessPercentage: number; // 0-100
  predictedScoreRange: {
    min: number;
    max: number;
    mostLikely: number;
  };
  confidenceLevel: number; // 0-100 (how confident is the AI in this prediction)
  
  // Detailed breakdown
  breakdown: PredictionBreakdown;
  
  // Risk analysis
  riskTopics: RiskTopic[];
  strongTopics: string[];
  
  // Trend data
  trend: 'improving' | 'stable' | 'declining';
  weeklyChange: number; // percentage points change from last week
  
  // Historical trends (last 8 weeks)
  historicalTrends: ReadinessTrend[];
  
  // AI-generated insights
  aiAnalysis: string;
  recommendedActions: string[];
  examReadinessLabel: string; // e.g., "Well Prepared", "Needs Attention", "At Risk"
  
  // Metadata
  dataPointsAnalyzed: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExamPredictionSchema = new Schema<ExamPredictionDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    
    // Core predictions
    readinessPercentage: { type: Number, required: true, min: 0, max: 100 },
    predictedScoreRange: {
      min: { type: Number, required: true, min: 0, max: 100 },
      max: { type: Number, required: true, min: 0, max: 100 },
      mostLikely: { type: Number, required: true, min: 0, max: 100 },
    },
    confidenceLevel: { type: Number, required: true, min: 0, max: 100 },
    
    // Detailed breakdown
    breakdown: {
      syllabusCompletionScore: { type: Number, default: 0, min: 0, max: 100 },
      quizPerformanceScore: { type: Number, default: 0, min: 0, max: 100 },
      revisionQualityScore: { type: Number, default: 0, min: 0, max: 100 },
      timeInvestmentScore: { type: Number, default: 0, min: 0, max: 100 },
      consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    
    // Risk analysis
    riskTopics: [{
      topic: { type: String, required: true },
      reason: { type: String, required: true },
      riskLevel: { 
        type: String, 
        enum: ['critical', 'high', 'medium', 'low'],
        required: true 
      },
      quizScore: { type: Number, min: 0, max: 100 },
      completionPercentage: { type: Number, min: 0, max: 100 },
      revisionsCompleted: { type: Number, min: 0 },
    }],
    
    strongTopics: [{ type: String }],
    
    // Trend
    trend: { 
      type: String, 
      enum: ['improving', 'stable', 'declining'],
      required: true,
      default: 'stable'
    },
    weeklyChange: { type: Number, default: 0 },
    
    // Historical trends
    historicalTrends: [{
      weekNumber: { type: Number, required: true },
      readinessPercentage: { type: Number, required: true },
      predictedScore: { type: Number, required: true },
      trend: { type: String, enum: ['improving', 'stable', 'declining'] },
      weekLabel: { type: String, required: true },
    }],
    
    // AI insights
    aiAnalysis: { type: String, required: true },
    recommendedActions: [{ type: String }],
    examReadinessLabel: { type: String, required: true },
    
    // Metadata
    dataPointsAnalyzed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for efficient queries
ExamPredictionSchema.index({ userId: 1, syllabusId: 1, createdAt: -1 });
ExamPredictionSchema.index({ userId: 1, syllabusId: 1, readinessPercentage: -1 });

export const ExamPredictionModel = model<ExamPredictionDocument>('ExamPrediction', ExamPredictionSchema);
