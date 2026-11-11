import { model, models, Model, Schema } from 'mongoose';

export interface TopicRecord {
  _id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
}

export interface StudyDayRecord {
  _id: string;
  date: Date;
  topicIds: string[];
  completedTopicIds: string[];
  plannedMinutes: number;
}

export interface ExamPlanDocument {
  _id: string;
  owner: string;
  name: string;
  examDate: Date;
  dailyStudyHours: number;
  topics: TopicRecord[];
  studyDays: StudyDayRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const topicSchema = new Schema<TopicRecord>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    estimatedMinutes: { type: Number, default: 30 },
  },
  { _id: false },
);

const studyDaySchema = new Schema<StudyDayRecord>(
  {
    _id: { type: String, required: true },
    date: { type: Date, required: true },
    topicIds: { type: [String], default: [] },
    completedTopicIds: { type: [String], default: [] },
    plannedMinutes: { type: Number, default: 0 },
  },
  { _id: false },
);

const examPlanSchema = new Schema<ExamPlanDocument>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    examDate: { type: Date, required: true },
    dailyStudyHours: { type: Number, required: true },
    topics: { type: [topicSchema], default: [] },
    studyDays: { type: [studyDaySchema], default: [] },
  },
  { timestamps: true, versionKey: false, collection: 'examplans' },
);

examPlanSchema.index({ owner: 1 });

export const ExamPlanModel: Model<ExamPlanDocument> =
  (models.ExamPlan as Model<ExamPlanDocument>) ||
  model<ExamPlanDocument>('ExamPlan', examPlanSchema);
