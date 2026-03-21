import { Schema, model, Document } from 'mongoose';

export interface TopicEstimateDocument extends Document {
  userId: string;
  syllabusId: string;
  topic: string;
  estimatedHours: number;
  confidence: number; // 0-100
  basis: {
    paceMinutesPerHour?: number;
    observedSessions?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TopicEstimateSchema = new Schema<TopicEstimateDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    estimatedHours: { type: Number, required: true },
    confidence: { type: Number, required: true },
    basis: {
      paceMinutesPerHour: { type: Number },
      observedSessions: { type: Number },
    },
  },
  { timestamps: true },
);

TopicEstimateSchema.index({ userId: 1, syllabusId: 1, topic: 1 }, { unique: true });

export const TopicEstimateModel = model<TopicEstimateDocument>(
  'TopicEstimate',
  TopicEstimateSchema,
);

