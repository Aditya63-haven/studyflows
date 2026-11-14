import { model, models, Model, Schema } from 'mongoose';
import { DocumentFormat, DocumentStatus } from '../../domain/entities/StudyDocument';

export interface StudyDocumentRecord {
  _id: string;
  owner: string;
  space: string;
  originalName: string;
  format: DocumentFormat;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number;
  characterCount: number;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const studyDocumentSchema = new Schema<StudyDocumentRecord>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    space: { type: String, required: true },
    originalName: { type: String, required: true, trim: true },
    format: { type: String, enum: ['pdf', 'docx', 'txt', 'md'], required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    storageKey: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      required: true,
      default: 'processing',
    },
    errorMessage: { type: String, default: null },
    pageCount: { type: Number, default: 0, min: 0 },
    characterCount: { type: Number, default: 0, min: 0 },
    chunkCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false, collection: 'documents' },
);

studyDocumentSchema.index({ owner: 1 });
studyDocumentSchema.index({ space: 1 });
studyDocumentSchema.index({ status: 1 });

export const StudyDocumentModel: Model<StudyDocumentRecord> =
  (models.StudyDocument as Model<StudyDocumentRecord>) ||
  model<StudyDocumentRecord>('StudyDocument', studyDocumentSchema);
