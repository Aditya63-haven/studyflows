import { model, models, Model, Schema } from 'mongoose';

export interface StudySpaceDocument {
  _id: string;
  owner: string;
  name: string;
  subject: string;
  description: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const studySpaceSchema = new Schema<StudySpaceDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
  },
  { timestamps: true, versionKey: false, collection: 'studyspaces' },
);

studySpaceSchema.index({ owner: 1 });

export const StudySpaceModel: Model<StudySpaceDocument> =
  (models.StudySpace as Model<StudySpaceDocument>) ||
  model<StudySpaceDocument>('StudySpace', studySpaceSchema);
