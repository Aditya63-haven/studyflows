import { model, models, Model, Schema } from 'mongoose';

export interface SharedLinkDocument {
  _id: string;
  token: string;
  itemId: string;
  itemType: 'note' | 'quiz';
  owner: string;
  expiresAt: Date | null;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sharedLinkSchema = new Schema<SharedLinkDocument>(
  {
    _id: { type: String, required: true },
    token: { type: String, required: true },
    itemId: { type: String, required: true },
    itemType: { type: String, required: true, enum: ['note', 'quiz'] },
    owner: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, collection: 'sharedlinks' },
);

sharedLinkSchema.index({ token: 1 }, { unique: true });
sharedLinkSchema.index({ owner: 1 });
sharedLinkSchema.index({ itemId: 1, itemType: 1 });

export const SharedLinkModel: Model<SharedLinkDocument> =
  (models.SharedLink as Model<SharedLinkDocument>) ||
  model<SharedLinkDocument>('SharedLink', sharedLinkSchema);
