import { model, models, Model, Schema } from 'mongoose';

export interface UserDocument {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarKey: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'users' },
);

userSchema.index({ email: 1 }, { unique: true });

export const UserModel: Model<UserDocument> =
  (models.User as Model<UserDocument>) || model<UserDocument>('User', userSchema);
