import { model, models, Model, Schema } from 'mongoose';

export interface FlashcardRecord {
  _id: string;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
}

export interface FlashcardDeckDocument {
  _id: string;
  owner: string;
  space: string;
  title: string;
  description: string;
  cards: FlashcardRecord[];
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const flashcardSchema = new Schema<FlashcardRecord>(
  {
    _id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    lastReviewedAt: { type: Date, default: null },
    nextReviewAt: { type: Date, default: null },
  },
  { _id: false },
);

const flashcardDeckSchema = new Schema<FlashcardDeckDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    space: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    cards: { type: [flashcardSchema], default: [] },
    shareToken: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'flashcarddecks' },
);

flashcardDeckSchema.index({ owner: 1 });
flashcardDeckSchema.index({ space: 1 });

export const FlashcardDeckModel: Model<FlashcardDeckDocument> =
  (models.FlashcardDeck as Model<FlashcardDeckDocument>) ||
  model<FlashcardDeckDocument>('FlashcardDeck', flashcardDeckSchema);
