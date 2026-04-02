import { Schema, model, Document } from 'mongoose';

export interface WeakTopicDocument extends Document {
  userId: string;
  syllabusId: string;
  topic: string;
  
  // Confidence metrics
  averageQuizScore: number; // 0-100
  totalAttempts: number;
  lastAttemptedAt?: string;
  daysSinceLastAttempt: number;
  
  // Calculated confidence score (0-100)
  confidenceScore: number;
  
  // Weak topic flags
  isWeak: boolean;
  weakReason?: string;
  recommendedActions?: string[];
  
  // Schedule adjustments
  timeAllocationMultiplier: number; // e.g., 1.5 = 50% more time
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  
  createdAt: Date;
  updatedAt: Date;
}

const WeakTopicSchema = new Schema<WeakTopicDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    
    // Confidence metrics
    averageQuizScore: { type: Number, default: 0, min: 0, max: 100 },
    totalAttempts: { type: Number, default: 0 },
    lastAttemptedAt: { type: String },
    daysSinceLastAttempt: { type: Number, default: 0 },
    
    // Calculated confidence score (0-100)
    confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
    
    // Weak topic flags
    isWeak: { type: Boolean, default: false },
    weakReason: { type: String },
    recommendedActions: { type: [String], default: [] },
    
    // Schedule adjustments
    timeAllocationMultiplier: { type: Number, default: 1.0 },
    priorityLevel: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
WeakTopicSchema.index({ userId: 1, syllabusId: 1, isWeak: 1 });
WeakTopicSchema.index({ userId: 1, syllabusId: 1, confidenceScore: 1 });
WeakTopicSchema.index({ userId: 1, syllabusId: 1, priorityLevel: 1 });

export const WeakTopicModel = model<WeakTopicDocument>('WeakTopic', WeakTopicSchema);
