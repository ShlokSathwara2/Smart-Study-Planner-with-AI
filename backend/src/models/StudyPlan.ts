import { Schema, model, Document } from 'mongoose';

export interface StudySession {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  topic: string;
  unit?: string;
  estimatedMinutes: number;
  status?: 'planned' | 'done' | 'skipped' | 'partial';
  actualMinutes?: number;
  loggedAt?: string; // ISO timestamp
}

export interface StudyPlanDocument extends Document {
  userId: string;
  syllabusId: string;
  examDate: string; // YYYY-MM-DD
  dailyHours: number;
  sessions: StudySession[];
  createdAt: Date;
  updatedAt: Date;
}

const StudySessionSchema = new Schema<StudySession>(
  {
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    topic: { type: String, required: true },
    unit: { type: String },
    estimatedMinutes: { type: Number, required: true },
    status: { type: String, default: 'planned' },
    actualMinutes: { type: Number },
    loggedAt: { type: String },
  },
  { _id: false },
);

const StudyPlanSchema = new Schema<StudyPlanDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    examDate: { type: String, required: true },
    dailyHours: { type: Number, required: true },
    sessions: { type: [StudySessionSchema], default: [] },
  },
  { timestamps: true },
);

StudyPlanSchema.index({ userId: 1, syllabusId: 1, examDate: 1 });

export const StudyPlanModel = model<StudyPlanDocument>('StudyPlan', StudyPlanSchema);

