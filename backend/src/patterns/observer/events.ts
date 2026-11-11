export interface QuizCompletedEvent {
  type: 'quiz.completed';
  occurredAt: Date;
  attemptId: string;
  quizId: string;
  quizTitle: string;
  spaceId: string;
  userId: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface SessionMissedEvent {
  type: 'session.missed';
  occurredAt: Date;
  userId: string;
  planId: string;
  planName: string;
  dayId: string;
  date: Date;
  topicCount: number;
  missedMinutes: number;
}

export interface ExamApproachingEvent {
  type: 'exam.approaching';
  occurredAt: Date;
  userId: string;
  planId: string;
  planName: string;
  examDate: Date;
  daysRemaining: number;
  incompleteTopics: number;
}

export interface RevisionDueEvent {
  type: 'revision.due';
  occurredAt: Date;
  userId: string;
  scheduleId: string;
  topicId: string;
  topicName: string;
  nextReviewAt: Date;
}

/**
 * Union of all domain events published through the EventBus.
 */
export type DomainEvent =
  | QuizCompletedEvent
  | SessionMissedEvent
  | ExamApproachingEvent
  | RevisionDueEvent;

export type DomainEventType = DomainEvent['type'];
