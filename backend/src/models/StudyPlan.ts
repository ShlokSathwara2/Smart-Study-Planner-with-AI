import { Schema, model, Document } from 'mongoose';

export interface StudySession {
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  topic: string;
  unit?: string;
  estimatedMinutes?: number;
  status?: 'planned' | 'done' | 'skipped' | 'partial' | 'pending';
  actualMinutes?: number;
  loggedAt?: string; // ISO timestamp
  // Phase 9 — cognitive load auto-split
  isSubModule?: boolean;
  parentTopic?: string;
  // Phase 10 — weak topic time adjustment
  wasAdjustedForWeakness?: boolean;
  originalEstimatedMinutes?: number;
  priorityLevel?: string;
  // Phase 12 — spaced repetition
  isReview?: boolean;
}

export interface StudyPlanDocument extends Document {
  userId: string;
  syllabusId: string;
  examDate: string; // YYYY-MM-DD
  dailyHours: number;
  sessions: StudySession[];
  // Phase 5 — Google Calendar integration
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
  googleCalendarEventIds?: string[];
  calendarSynced?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudySessionSchema = new Schema<StudySession>(
  {
    date: { type: String, required: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '10:00' },
    topic: { type: String, required: true },
    unit: { type: String },
    estimatedMinutes: { type: Number, default: 60 },
    status: { type: String, default: 'planned' },
    actualMinutes: { type: Number },
    loggedAt: { type: String },
    // Phase 9 — cognitive load auto-split
    isSubModule: { type: Boolean, default: false },
    parentTopic: { type: String },
    // Phase 10 — weak topic time adjustment
    wasAdjustedForWeakness: { type: Boolean, default: false },
    originalEstimatedMinutes: { type: Number },
    priorityLevel: { type: String },
    // Phase 12 — spaced repetition review
    isReview: { type: Boolean, default: false },
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
    // Phase 5 — Google Calendar integration
    googleCalendarAccessToken: { type: String },
    googleCalendarRefreshToken: { type: String },
    googleCalendarEventIds: { type: [String], default: [] },
    calendarSynced: { type: Boolean, default: false },
  },
  { timestamps: true },
);

StudyPlanSchema.index({ userId: 1, syllabusId: 1, examDate: 1 });

export const StudyPlanModel = model<StudyPlanDocument>('StudyPlan', StudyPlanSchema);

