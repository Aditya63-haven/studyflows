import { model, models, Model, Schema } from 'mongoose';

export interface AiAccessGrantDocument {
  _id: string;
  email: string;
  invitedBy: string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const aiAccessGrantSchema = new Schema<AiAccessGrantDocument>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedBy: { type: String, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'aiaccessgrants' },
);

aiAccessGrantSchema.index({ email: 1 }, { unique: true });

export const AiAccessGrantModel: Model<AiAccessGrantDocument> =
  (models.AiAccessGrant as Model<AiAccessGrantDocument>) ||
  model<AiAccessGrantDocument>('AiAccessGrant', aiAccessGrantSchema);
