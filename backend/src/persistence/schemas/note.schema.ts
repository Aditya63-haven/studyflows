import { model, models, Model, Schema } from 'mongoose';

export interface NoteDocument {
  _id: string;
  owner: string;
  space: string;
  title: string;
  content: string;
  aiSummary: string | null;
  tags: string[];
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<NoteDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    space: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    aiSummary: { type: String, default: null },
    tags: { type: [String], default: [] },
    shareToken: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'notes' },
);

noteSchema.index({ owner: 1 });
noteSchema.index({ space: 1 });

export const NoteModel: Model<NoteDocument> =
  (models.Note as Model<NoteDocument>) || model<NoteDocument>('Note', noteSchema);
