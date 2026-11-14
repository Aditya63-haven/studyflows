import { model, models, Model, Schema } from 'mongoose';

export interface DocumentChunkRecord {
  _id: string;
  document: string;
  owner: string;
  space: string;
  chunkIndex: number;
  text: string;
  pageNumber: number | null;
  section: string | null;
  createdAt: Date;
}

const documentChunkSchema = new Schema<DocumentChunkRecord>(
  {
    _id: { type: String, required: true },
    document: { type: String, required: true },
    owner: { type: String, required: true },
    space: { type: String, required: true },
    chunkIndex: { type: Number, required: true, min: 0 },
    text: { type: String, required: true },
    pageNumber: { type: Number, default: null, min: 1 },
    section: { type: String, default: null },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false, collection: 'documentchunks' },
);

documentChunkSchema.index({ document: 1, chunkIndex: 1 });
documentChunkSchema.index({ space: 1 });
documentChunkSchema.index({ owner: 1 });

export const DocumentChunkModel: Model<DocumentChunkRecord> =
  (models.DocumentChunk as Model<DocumentChunkRecord>) ||
  model<DocumentChunkRecord>('DocumentChunk', documentChunkSchema);
