export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface StudySpace {
  id: string;
  name: string;
  subject: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  type: 'note';
  spaceId: string;
  title: string;
  content: string;
  aiSummary: string | null;
  tags: string[];
  summary: string;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'mcq' | 'multi_select' | 'true_false';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  explanation?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
}

export interface Quiz {
  id: string;
  type: 'quiz';
  spaceId: string;
  title: string;
  description: string;
  summary: string;
  maxScore: number;
  timeLimitMinutes: number | null;
  questions: Question[];
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  isDue: boolean;
}

export interface FlashcardDeck {
  id: string;
  type: 'flashcarddeck';
  spaceId: string;
  title: string;
  description: string;
  summary: string;
  cards: Flashcard[];
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuestionResponse = string | string[] | boolean;

export interface QuizAnswer {
  questionId: string;
  response: QuestionResponse;
}

export interface QuestionEvaluation {
  questionId: string;
  correct: boolean;
  earnedPoints: number;
  maxPoints: number;
  correctAnswer: string[];
  explanation?: string;
}

export interface QuizGradeResult {
  score: number;
  maxScore: number;
  percentage: number;
  evaluations: QuestionEvaluation[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  result: QuizGradeResult;
  score: number;
  maxScore: number;
  percentage: number;
  completedAt: string;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type RevisionStatus = 'due' | 'needs_revision' | 'mastered' | 'scheduled';

export interface RevisionSchedule {
  id: string;
  topicId: string;
  topicName: string;
  memoryStrength: number;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  daysUntilReview: number;
  status: RevisionStatus;
}

export interface RevisionDashboard {
  counts: {
    total: number;
    due: number;
    needsRevision: number;
    mastered: number;
  };
  dueToday: RevisionSchedule[];
  needsRevision: RevisionSchedule[];
  mastered: RevisionSchedule[];
  scheduled: RevisionSchedule[];
}

export interface ExamTopic {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
}

export interface StudyDay {
  id: string;
  date: string;
  topicIds: string[];
  completedTopicIds: string[];
  plannedMinutes: number;
  isComplete: boolean;
  progress: number;
}

export interface ExamPlan {
  id: string;
  name: string;
  examDate: string;
  dailyStudyHours: number;
  daysRemaining: number;
  progress: number;
  topics: ExamTopic[];
  studyDays: StudyDay[];
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  spaceId: string | null;
  subject: string;
  durationMinutes: number;
  startedAt: string;
  endedAt: string | null;
  isCompleted: boolean;
  createdAt: string;
}

export interface SubjectBreakdown {
  subject: string;
  studyMinutes: number;
  sessionCount: number;
}

export interface QuizTrendPoint {
  quizId: string;
  quizTitle: string;
  percentage: number;
  completedAt: string;
}

export interface WeakTopic {
  topicId: string;
  topicName: string;
  memoryStrength: number;
  nextReviewAt: string;
}

export interface AnalyticsOverview {
  totalStudyMinutes: number;
  totalSessions: number;
  streakDays: number;
  averageQuizScore: number;
  quizAttemptCount: number;
  dueToday: number;
  masteredTopics: number;
  subjectBreakdown: SubjectBreakdown[];
  scoreTrend: QuizTrendPoint[];
  weakTopics: WeakTopic[];
  recentQuizEvents: Array<{
    quizId: string;
    quizTitle: string;
    percentage: number;
    occurredAt: string;
  }>;
}

export type StudyItemType = 'note' | 'quiz' | 'flashcarddeck';

export interface BookmarkView {
  id: string;
  itemId: string;
  itemType: StudyItemType;
  title: string;
  summary: string;
  spaceId: string;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  type: StudyItemType;
  title: string;
  summary: string;
  spaceId: string;
}

export interface SharedLink {
  id: string;
  token: string;
  itemId: string;
  itemType: 'note' | 'quiz';
  expiresAt: string | null;
  revoked: boolean;
  active: boolean;
  publicPath: string;
  createdAt: string;
}

export interface SpaceInput {
  name: string;
  subject: string;
  description?: string;
  color?: string;
}

export interface NoteInput {
  title: string;
  content?: string;
  tags?: string[];
}

export interface QuestionInput {
  id?: string;
  type: QuestionType;
  prompt: string;
  points?: number;
  explanation?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
}

export interface QuizInput {
  title: string;
  description?: string;
  questions: QuestionInput[];
  timeLimitMinutes?: number | null;
}

export interface FlashcardInput {
  id?: string;
  front: string;
  back: string;
}

export interface DeckInput {
  title: string;
  description?: string;
  cards?: FlashcardInput[];
}

export interface ExamTopicInput {
  name: string;
  description?: string;
  estimatedMinutes?: number;
}

export interface ExamPlanInput {
  name: string;
  examDate: string;
  dailyStudyHours: number;
  topics: ExamTopicInput[];
}

export interface SessionInput {
  spaceId?: string | null;
  subject?: string;
  durationMinutes: number;
  startedAt?: string;
  endedAt?: string | null;
}
