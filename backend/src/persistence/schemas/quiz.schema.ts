import { model, models, Model, Schema } from 'mongoose';

export interface QuestionOptionRecord {
  id: string;
  text: string;
}

export interface QuestionRecord {
  _id: string;
  type: 'mcq' | 'multi_select' | 'true_false';
  prompt: string;
  points: number;
  explanation?: string;
  options?: QuestionOptionRecord[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
}

export interface QuizDocument {
  _id: string;
  owner: string;
  space: string;
  title: string;
  description: string;
  questions: QuestionRecord[];
  timeLimitMinutes: number | null;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<QuestionOptionRecord>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema<QuestionRecord>(
  {
    _id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['mcq', 'multi_select', 'true_false'],
    },
    prompt: { type: String, required: true },
    points: { type: Number, required: true, default: 1 },
    explanation: { type: String },
    options: { type: [optionSchema], default: undefined },
    correctOptionId: { type: String },
    correctOptionIds: { type: [String], default: undefined },
    correctAnswer: { type: Boolean },
  },
  { _id: false },
);

const quizSchema = new Schema<QuizDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    space: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    questions: { type: [questionSchema], default: [] },
    timeLimitMinutes: { type: Number, default: null },
    shareToken: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: 'quizzes' },
);

quizSchema.index({ owner: 1 });
quizSchema.index({ space: 1 });

export const QuizModel: Model<QuizDocument> =
  (models.Quiz as Model<QuizDocument>) || model<QuizDocument>('Quiz', quizSchema);
