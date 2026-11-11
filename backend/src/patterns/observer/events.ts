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

/**
 * Union of all domain events published through the EventBus.
 */
export type DomainEvent = QuizCompletedEvent;
