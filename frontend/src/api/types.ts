export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
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

export type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'md';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface StudyDocument {
  id: string;
  type: 'document';
  spaceId: string;
  originalName: string;
  format: DocumentFormat;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number;
  characterCount: number;
  chunkCount: number;
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

export interface ExamPreparationRecord {
  provider: string;
  strategySummary: string;
  approvedAt: string;
  approvalFingerprint: string;
  requiredMinutes: number;
  scheduledMinutes: number;
  shortfallMinutes: number;
}

export interface ExamPlan {
  id: string;
  name: string;
  examDate: string;
  dailyStudyHours: number;
  daysRemaining: number;
  progress: number;
  spaceId: string | null;
  documentIds: string[];
  preparation: ExamPreparationRecord | null;
  topics: ExamTopic[];
  studyDays: StudyDay[];
  createdAt: string;
  updatedAt: string;
}

export type PreparationTopicStatus =
  | 'completed'
  | 'weak'
  | 'due'
  | 'needs_revision'
  | 'insufficient'
  | 'strong'
  | 'neutral'
  | 'mastered'
  | 'not_started';

export interface PreparationSource {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  section: string | null;
  excerpt: string;
}

export interface PreparationDocument {
  id: string;
  title: string;
  format: string;
  chunkCount: number;
  selected: boolean;
}

export interface PreparationTopicPerformance {
  accuracy: number | null;
  answeredQuestions: number;
  classification: string;
  trendDirection: string;
  evidence: string[];
}

export interface PreparationTopicRevision {
  memoryStrength: number;
  status: string;
  nextReviewAt: string;
}

export interface PreparationTopic {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  status: PreparationTopicStatus;
  priorityRank: number;
  evidence: string[];
  performance: PreparationTopicPerformance | null;
  revision: PreparationTopicRevision | null;
  sources: PreparationSource[];
}

export interface PreparationDay {
  date: string;
  topicIds: string[];
  plannedMinutes: number;
}

export interface PreparationSchedule {
  days: PreparationDay[];
  requiredMinutes: number;
  availableMinutes: number;
  scheduledMinutes: number;
  shortfallMinutes: number;
  unscheduledTopicIds: string[];
  warnings: string[];
}

export interface PreparationStrategyItem {
  topicId: string;
  topicName: string;
  reason: string;
  practiceActivity: string;
  source: 'ai' | 'server';
}

export interface PreparationStrategy {
  provider: string;
  summary: string;
  items: PreparationStrategyItem[];
  cautions: string[];
  usedChunkIds: string[];
  fallback: boolean;
  warning: string | null;
}

export interface ExamPreparationOverview {
  planId: string;
  examName: string;
  examDate: string;
  daysRemaining: number;
  dailyStudyHours: number;
  space: { id: string; name: string; subject: string } | null;
  documents: PreparationDocument[];
  selectedDocumentIds: string[];
  topics: PreparationTopic[];
  topicOrder: string[];
  schedule: PreparationSchedule;
  availability: { source: 'saved' | 'default'; weeklyMinutes: number };
  dataQuality: {
    reliable: boolean;
    attemptCount: number;
    answeredQuestions: number;
    insufficientData: string[];
    limitations: string[];
  };
  existingPreparation: {
    provider: string;
    strategySummary: string;
    approvedAt: string;
    approvalFingerprint: string;
    requiredMinutes: number;
    scheduledMinutes: number;
    shortfallMinutes: number;
  } | null;
}

export interface ExamPreparationPreview extends ExamPreparationOverview {
  strategy: PreparationStrategy;
  conflicts: string[];
  requiresAcknowledgement: boolean;
  approvalFingerprint: string;
}

export interface ExamPreparationSelection {
  spaceId?: string | null;
  documentIds?: string[];
  topicOrder?: string[];
  excludedTopicIds?: string[];
  topicMinutes?: Record<string, number>;
}

export interface ExamPreparationApprovalInput extends ExamPreparationSelection {
  approvalFingerprint: string;
  acknowledgeConflicts?: boolean;
  strategySummary?: string;
  provider?: string;
}

export interface ExamPreparationApprovalResult {
  plan: ExamPlan;
  schedule: PreparationSchedule;
  created: boolean;
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

export type NotificationType =
  'quiz.completed' | 'session.missed' | 'exam.approaching' | 'revision.due';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type RescheduleStrategyName = 'next-free-slot' | 'weekend';

export interface AttentionSuggestion {
  strategy: RescheduleStrategyName;
  label: string;
  description: string;
  targetDate: string;
  minutes: number;
}

export interface AttentionItem {
  id: string;
  type: 'missed-session' | 'exam-approaching';
  title: string;
  description: string;
  planId: string;
  planName: string;
  date: string | null;
  topicCount: number;
  minutes: number;
  suggestions: AttentionSuggestion[];
}

export interface AttentionReport {
  generatedAt: string;
  items: AttentionItem[];
}

export interface AppliedChange {
  itemId: string;
  strategy: RescheduleStrategyName;
  targetDate: string;
  minutes: number;
  movedTopicIds: string[];
}

export interface AssistantProposal {
  understood: boolean;
  action: 'move-work' | 'none';
  response: string;
  planId: string | null;
  planName: string | null;
  strategy: RescheduleStrategyName | null;
  suggestion: AttentionSuggestion | null;
  needsConfirmation: boolean;
}

export type AiAccessUserStatus = 'admin' | 'active' | 'revoked' | 'none';
export type AiAccessGrantStatus = 'pending' | 'registered' | 'revoked';

export interface AiAccessStatus {
  allowed: boolean;
  isAdmin: boolean;
  email: string;
  status: AiAccessUserStatus;
}

export interface AiAccessGrant {
  id: string;
  email: string;
  status: AiAccessGrantStatus;
  invitedBy: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssistantChatMode = 'answer' | 'explain' | 'summary' | 'detailed';

export interface AssistantConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatInput {
  message: string;
  mode: AssistantChatMode;
  spaceId: string | null;
  noteIds: string[];
  documentIds: string[];
  history: AssistantConversationMessage[];
}

export interface AssistantCitation {
  id: string;
  title: string;
}

export interface AssistantDocumentCitation {
  id: string;
  documentId: string;
  title: string;
  pageNumber: number | null;
  section: string | null;
  excerpt: string;
}

export interface AssistantChatResult {
  answer: string;
  provider: string;
  citations: AssistantCitation[];
  documentCitations: AssistantDocumentCitation[];
  usedExternalKnowledge: boolean;
  noteCount: number;
  documentCount: number;
}

export type PerformanceTrendDirection =
  | 'improving'
  | 'declining'
  | 'stable'
  | 'insufficient';

export interface PerformanceTrend {
  direction: PerformanceTrendDirection;
  recentAccuracy: number | null;
  previousAccuracy: number | null;
  recentQuestions: number;
  previousQuestions: number;
}

export interface SubjectPerformance {
  subject: string;
  spaceId: string | null;
  spaceName: string;
  attemptCount: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number | null;
  studyMinutes: number;
  lastAttemptAt: string | null;
}

export type TopicClassification = 'weak' | 'strong' | 'neutral' | 'insufficient';

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  subject: string;
  spaceId: string | null;
  attemptCount: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number | null;
  repeatedMistakes: number;
  trend: PerformanceTrend;
  classification: TopicClassification;
  evidence: string[];
  revisionMemoryStrength: number | null;
  revisionStatus: RevisionStatus | null;
  lastAttemptAt: string | null;
}

export interface PerformanceAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  spaceId: string | null;
  percentage: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  completedAt: string;
}

export interface PendingPlanTopic {
  planId: string;
  planName: string;
  topicId: string;
  topicName: string;
  examDate: string;
  daysRemaining: number;
  estimatedMinutes: number;
  scheduledDate: string | null;
}

export interface UpcomingExam {
  planId: string;
  planName: string;
  examDate: string;
  daysRemaining: number;
  completionPercentage: number;
  pendingTopicCount: number;
}

export interface StudyConsistency {
  totalStudyMinutes: number;
  sessionCount: number;
  activeDays: number;
  daysInRange: number;
  activeDayPercentage: number;
  averageSessionMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  availableMinutesPerWeek: number;
  availabilitySource: 'saved' | 'default';
  plannedMinutes: number;
  completedMinutes: number;
  plannedTopicSlots: number;
  completedTopicSlots: number;
  planCompletionPercentage: number | null;
  upcomingExams: UpcomingExam[];
  pendingPlanTopics: PendingPlanTopic[];
}

export interface PerformanceRevisionMetrics {
  trackedTopics: number;
  dueNow: number;
  needsRevision: number;
  mastered: number;
  reviewedInRange: number;
  averageMemoryStrength: number | null;
  masteredPercentage: number | null;
}

export interface PerformanceDataQuality {
  attemptCount: number;
  answeredQuestions: number;
  minimumQuestionsForClassification: number;
  reliable: boolean;
  insufficientData: string[];
  limitations: string[];
}

export interface PerformanceAnalysis {
  generatedAt: string;
  range: { from: string; to: string; days: number };
  filters: { subject: string | null; spaceId: string | null };
  dataQuality: PerformanceDataQuality;
  overall: {
    attemptCount: number;
    answeredQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number | null;
    averageAttemptScore: number | null;
    reliable: boolean;
    trend: PerformanceTrend;
  };
  subjects: SubjectPerformance[];
  topics: TopicPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  attempts: PerformanceAttempt[];
  studyConsistency: StudyConsistency;
  revision: PerformanceRevisionMetrics;
}

export type RecommendationType =
  | 'weak-topic'
  | 'due-revision'
  | 'low-memory'
  | 'exam-topic';

export interface RevisionRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  reason: string;
  evidence: string[];
  suggestedMinutes: number;
  topicId: string;
  topicName: string;
  priority: 'high' | 'medium' | 'low';
  examDate: string | null;
  alreadyScheduled: boolean;
  addable: boolean;
}

export interface PerformanceReport {
  analysis: PerformanceAnalysis;
  recommendations: RevisionRecommendation[];
}

export interface PerformanceFilters {
  days?: number;
  from?: string;
  to?: string;
  subject?: string;
  spaceId?: string;
}

export interface AssistantPerformanceFocus {
  topicId: string;
  topicName: string;
  accuracy: number | null;
  answeredQuestions: number;
  evidence: string[];
}

export interface AssistantPerformanceSuggestion {
  title: string;
  reason: string;
  topicId: string | null;
  topicName: string | null;
}

export interface AssistantPerformanceResult {
  provider: string;
  generatedAt: string;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  trendInterpretation: string;
  focusTopics: AssistantPerformanceFocus[];
  practiceSuggestions: AssistantPerformanceSuggestion[];
  recommendations: RevisionRecommendation[];
  dataQuality: {
    reliable: boolean;
    attemptCount: number;
    answeredQuestions: number;
    insufficientData: string[];
    limitations: string[];
  };
}
