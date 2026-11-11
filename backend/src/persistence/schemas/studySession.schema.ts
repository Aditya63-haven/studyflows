import { model, models, Model, Schema } from 'mongoose';

export interface StudySessionDocument {
  _id: string;
  owner: string;
  spaceId: string | null;
  subject: string;
  durationMinutes: number;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const studySessionSchema = new Schema<StudySessionDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    spaceId: { type: String, default: null },
    subject: { type: String, default: '' },
    durationMinutes: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'sessions' },
);

studySessionSchema.index({ owner: 1 });
studySessionSchema.index({ startedAt: -1 });

export const StudySessionModel: Model<StudySessionDocument> =
  (models.StudySession as Model<StudySessionDocument>) ||
  model<StudySessionDocument>('StudySession', studySessionSchema);
