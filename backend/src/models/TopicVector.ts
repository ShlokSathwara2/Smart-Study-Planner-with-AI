import { Schema, model, Document } from 'mongoose';

export interface TopicVectorDocument extends Document {
  syllabusId: string;
  topicName: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const TopicVectorSchema = new Schema<TopicVectorDocument>(
  {
    syllabusId: { type: String, required: true, index: true },
    topicName: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true },
);

TopicVectorSchema.index({ syllabusId: 1, topicName: 1 }, { unique: true });

export const TopicVectorModel = model<TopicVectorDocument>('TopicVector', TopicVectorSchema);
