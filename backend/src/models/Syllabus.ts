import { Schema, model, Document } from 'mongoose';

export interface SyllabusDocument extends Document {
  userId: string;
  sourceFilename: string;
  mimeType: string;
  rawText: string;
  analysis: {
    topics: string[];
    units: string[];
    difficulty: 'easy' | 'medium' | 'hard' | string;
    estimatedHours: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusSchema = new Schema<SyllabusDocument>(
  {
    userId: { type: String, required: true, index: true },
    sourceFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    rawText: { type: String, required: true },
    analysis: {
      topics: [{ type: String }],
      units: [{ type: String }],
      difficulty: { type: String, default: 'medium' },
      estimatedHours: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export const SyllabusModel = model<SyllabusDocument>('Syllabus', SyllabusSchema);

