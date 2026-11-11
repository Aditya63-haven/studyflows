import { model, models, Model, Schema } from 'mongoose';

export interface QuizAnswerRecord {
  questionId: string;
  response: string | string[] | boolean;
}

export interface QuestionEvaluationRecord {
  questionId: string;
  correct: boolean;
  earnedPoints: number;
  maxPoints: number;
  correctAnswer: string[];
  explanation?: string;
}

export interface QuizGradeResultRecord {
  score: number;
  maxScore: number;
  percentage: number;
  evaluations: QuestionEvaluationRecord[];
}

export interface QuizAttemptDocument {
  _id: string;
  owner: string;
  quizId: string;
  answers: QuizAnswerRecord[];
  result: QuizGradeResultRecord;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema<QuizAnswerRecord>(
  {
    questionId: { type: String, required: true },
    response: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const evaluationSchema = new Schema<QuestionEvaluationRecord>(
  {
    questionId: { type: String, required: true },
    correct: { type: Boolean, required: true },
    earnedPoints: { type: Number, required: true },
    maxPoints: { type: Number, required: true },
    correctAnswer: { type: [String], default: [] },
    explanation: { type: String },
  },
  { _id: false },
);

const resultSchema = new Schema<QuizGradeResultRecord>(
  {
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    evaluations: { type: [evaluationSchema], default: [] },
  },
  { _id: false },
);

const quizAttemptSchema = new Schema<QuizAttemptDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    quizId: { type: String, required: true },
    answers: { type: [answerSchema], default: [] },
    result: { type: resultSchema, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false, collection: 'quizattempts' },
);

quizAttemptSchema.index({ owner: 1 });
quizAttemptSchema.index({ quizId: 1 });

export const QuizAttemptModel: Model<QuizAttemptDocument> =
  (models.QuizAttempt as Model<QuizAttemptDocument>) ||
  model<QuizAttemptDocument>('QuizAttempt', quizAttemptSchema);
