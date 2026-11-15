import { QuestionOption, QuestionType } from '../questions/Question';
import { RescheduleStrategyName } from './IRescheduleStrategy';

export interface AINoteInput {
  title: string;
  content: string;
}

export interface AIQuizInput extends AINoteInput {
  questionCount?: number;
}

/**
 * Provider-neutral question data produced by an AI provider.
 */
export interface AIGeneratedQuestion {
  type: QuestionType;
  prompt: string;
  points?: number;
  explanation?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswer?: boolean;
}

/**
 * Plan summary passed to the provider when interpreting an assistant command.
 * `keywords` carries the plan name and its topic names so providers can match
 * subject-style phrasing against what the plan actually covers.
 */
export interface AICommandPlanSummary {
  id: string;
  name: string;
  examDate: Date;
  incompleteTopics: number;
  missedMinutes: number;
  keywords: string[];
}

/**
 * Context for interpreting an assistant command. `subjects` lists the names
 * and subjects of the user's study spaces so providers can detect subject
 * mentions even when the plan name does not contain them.
 */
export interface AICommandInput {
  text: string;
  plans: AICommandPlanSummary[];
  subjects: string[];
}

export type AICommandAction = 'move-work' | 'none';

export type AIAnswerMode = 'answer' | 'explain' | 'summary' | 'detailed';

export type AIConversationRole = 'user' | 'assistant';

export interface AIConversationMessage {
  role: AIConversationRole;
  content: string;
}

export interface AIContextNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface AIContextChunk {
  id: string;
  text: string;
  pageNumber: number | null;
  section: string | null;
}

/**
 * Selected document excerpts supplied to the assistant as grounded context.
 * Chunks keep page and section metadata so answers can cite exact sources.
 */
export interface AIContextDocument {
  id: string;
  title: string;
  format: string;
  chunks: AIContextChunk[];
}

export interface AIChatInput {
  message: string;
  mode: AIAnswerMode;
  spaceName: string;
  spaceSubject: string;
  notes: AIContextNote[];
  documents?: AIContextDocument[];
  history: AIConversationMessage[];
}

export interface AIChatResult {
  answer: string;
  citedNoteIds: string[];
  citedChunkIds?: string[];
  usedExternalKnowledge: boolean;
}


export interface AIPerformanceTrend {
  direction: string;
  recentAccuracy: number | null;
  previousAccuracy: number | null;
  recentQuestions: number;
  previousQuestions: number;
}

export interface AIPerformanceTopic {
  topicId: string;
  topicName: string;
  accuracy: number | null;
  answeredQuestions: number;
  incorrectAnswers?: number;
  repeatedMistakes?: number;
  trend?: AIPerformanceTrend;
  evidence?: string[];
  revisionMemoryStrength?: number | null;
}

export interface AIPerformanceInput {
  generatedAt: string;
  range: {
    from: string;
    to: string;
    days: number;
  };
  dataQuality: {
    attemptCount: number;
    answeredQuestions: number;
    reliable: boolean;
    insufficientData: string[];
    limitations: string[];
  };
  overall: {
    attemptCount: number;
    answeredQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number | null;
    averageAttemptScore: number | null;
    trend: AIPerformanceTrend;
  };
  subjects: Array<{
    subject: string;
    attemptCount: number;
    answeredQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracy: number | null;
    studyMinutes: number;
  }>;
  weakTopics: AIPerformanceTopic[];
  strongTopics: AIPerformanceTopic[];
  recentAttempts: Array<{
    quizId: string;
    quizTitle: string;
    subject: string;
    percentage: number;
    answeredQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }>;
  studyConsistency: {
    totalStudyMinutes: number;
    sessionCount: number;
    activeDays: number;
    daysInRange: number;
    currentStreakDays: number;
    availableMinutesPerWeek: number;
    plannedMinutes: number;
    completedMinutes: number;
    planCompletionPercentage: number | null;
    upcomingExams: Array<{
      planName: string;
      daysRemaining: number;
      completionPercentage: number;
      pendingTopicCount: number;
    }>;
  };
  revision: {
    trackedTopics: number;
    dueNow: number;
    needsRevision: number;
    mastered: number;
    reviewedInRange: number;
    averageMemoryStrength: number | null;
    masteredPercentage: number | null;
  };
  recommendations: Array<{
    id: string;
    title: string;
    reason: string;
    suggestedMinutes: number;
    topicId: string;
    alreadyScheduled: boolean;
  }>;
}

export interface AIPerformancePracticeSuggestion {
  title: string;
  reason: string;
  topicId: string | null;
}

export interface AIPerformanceInterpretation {
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  trendInterpretation: string;
  focusTopicIds: string[];
  practiceSuggestions: AIPerformancePracticeSuggestion[];
}

export interface AIExamPreparationTopicInput {
  topicId: string;
  topicName: string;
  estimatedMinutes: number;
  completed: boolean;
  performance: {
    accuracy: number | null;
    answeredQuestions: number;
    classification: string;
    evidence: string[];
    trendDirection: string;
  } | null;
  revision: {
    memoryStrength: number;
    status: string;
  } | null;
}

export interface AIExamPreparationSource {
  chunkId: string;
  documentTitle: string;
  pageNumber: number | null;
  section: string | null;
  text: string;
}

export interface AIExamPreparationInput {
  examName: string;
  examDate: string;
  daysRemaining: number;
  subject: string;
  spaceName: string;
  dailyStudyHours: number;
  availability: {
    weeklyMinutes: number;
    source: 'saved' | 'default';
  };
  dataQuality: {
    reliable: boolean;
    insufficientData: string[];
    limitations: string[];
  };
  topics: AIExamPreparationTopicInput[];
  sourceChunks: AIExamPreparationSource[];
}

export interface AIExamPreparationSequenceItem {
  topicId: string;
  reason: string;
  practiceActivity: string;
}

export interface AIExamPreparationInterpretation {
  summary: string;
  sequence: AIExamPreparationSequenceItem[];
  cautions: string[];
  usedChunkIds: string[];
}

/**
 * Structured understanding of a natural-language study command.
 */
export interface AICommandInterpretation {
  understood: boolean;
  action: AICommandAction;
  strategy: RescheduleStrategyName | null;
  planId: string | null;
  response: string;
}

/**
 * Abstraction for AI-backed study features.
 *
 * OOP: Abstraction - note condensation, quiz generation and command parsing
 * depend only on this interface.
 * OOP: Adapter - concrete providers adapt external or mock backends to this
 * contract.
 */
export interface IAIProvider {
  readonly name: string;
  summarizeNote(input: AINoteInput): Promise<string>;
  generateQuiz(input: AIQuizInput): Promise<AIGeneratedQuestion[]>;
  interpretCommand(input: AICommandInput): Promise<AICommandInterpretation>;
  interpretPerformance(input: AIPerformanceInput): Promise<AIPerformanceInterpretation>;
  planExamPreparation(
    input: AIExamPreparationInput,
  ): Promise<AIExamPreparationInterpretation>;
  chat(input: AIChatInput): Promise<AIChatResult>;
}
