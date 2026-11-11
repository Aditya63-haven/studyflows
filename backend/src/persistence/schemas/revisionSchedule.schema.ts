import { model, models, Model, Schema } from 'mongoose';

export interface RevisionScheduleDocument {
  _id: string;
  owner: string;
  topicId: string;
  topicName: string;
  memoryStrength: number;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const revisionScheduleSchema = new Schema<RevisionScheduleDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    topicId: { type: String, required: true },
    topicName: { type: String, required: true },
    memoryStrength: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    lastReviewedAt: { type: Date, default: null },
    nextReviewAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false, collection: 'revisionschedules' },
);

revisionScheduleSchema.index({ owner: 1 });
revisionScheduleSchema.index({ nextReviewAt: 1 });
revisionScheduleSchema.index({ owner: 1, topicId: 1 }, { unique: true });

export const RevisionScheduleModel: Model<RevisionScheduleDocument> =
  (models.RevisionSchedule as Model<RevisionScheduleDocument>) ||
  model<RevisionScheduleDocument>('RevisionSchedule', revisionScheduleSchema);
