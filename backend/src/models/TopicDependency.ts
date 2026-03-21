import { Schema, model, Document } from 'mongoose';

export interface TopicDependencyDocument extends Document {
  userId: string;
  syllabusId: string;
  topic: string;
  dependsOn: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TopicDependencySchema = new Schema<TopicDependencyDocument>(
  {
    userId: { type: String, required: true, index: true },
    syllabusId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    dependsOn: [{ type: String, required: true }],
  },
  { timestamps: true },
);

TopicDependencySchema.index({ userId: 1, syllabusId: 1 });

export const TopicDependencyModel = model<TopicDependencyDocument>(
  'TopicDependency',
  TopicDependencySchema,
);

