import { model, models, Model, Schema } from 'mongoose';

export interface BookmarkDocument {
  _id: string;
  owner: string;
  itemId: string;
  itemType: 'note' | 'quiz' | 'flashcarddeck';
  createdAt: Date;
  updatedAt: Date;
}

const bookmarkSchema = new Schema<BookmarkDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    itemId: { type: String, required: true },
    itemType: {
      type: String,
      required: true,
      enum: ['note', 'quiz', 'flashcarddeck'],
    },
  },
  { timestamps: true, versionKey: false, collection: 'bookmarks' },
);

bookmarkSchema.index({ owner: 1 });
bookmarkSchema.index({ owner: 1, itemId: 1, itemType: 1 }, { unique: true });

export const BookmarkModel: Model<BookmarkDocument> =
  (models.Bookmark as Model<BookmarkDocument>) ||
  model<BookmarkDocument>('Bookmark', bookmarkSchema);
