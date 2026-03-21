import { Schema, model, Document } from 'mongoose';

export interface FocusSessionEvent {
  type: 'start' | 'pause' | 'resume' | 'end' | 'visibility-hidden' | 'visibility-visible';
  at: string; // ISO timestamp
}

export interface FocusSessionDocument extends Document {
  userId: string;
  topic: string;
  planSessionId?: string;
  startTime: string;
  endTime?: string;
  totalSeconds?: number;
  deepWorkSeconds?: number;
  distractionCount?: number;
  status: 'running' | 'paused' | 'finished';
  events: FocusSessionEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const FocusSessionSchema = new Schema<FocusSessionDocument>(
  {
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    planSessionId: { type: String },
    startTime: { type: String, required: true },
    endTime: { type: String },
    totalSeconds: { type: Number },
    deepWorkSeconds: { type: Number },
    distractionCount: { type: Number },
    status: {
      type: String,
      enum: ['running', 'paused', 'finished'],
      default: 'running',
    },
    events: [
      {
        type: {
          type: String,
          enum: ['start', 'pause', 'resume', 'end', 'visibility-hidden', 'visibility-visible'],
        },
        at: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

export const FocusSessionModel = model<FocusSessionDocument>('FocusSession', FocusSessionSchema);

