import { model, models, Model, Schema } from 'mongoose';

export interface NotificationDocument {
  _id: string;
  owner: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  dedupeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'notifications' },
);

notificationSchema.index({ owner: 1 });
notificationSchema.index({ owner: 1, dedupeKey: 1 });

export const NotificationModel: Model<NotificationDocument> =
  (models.Notification as Model<NotificationDocument>) ||
  model<NotificationDocument>('Notification', notificationSchema);
