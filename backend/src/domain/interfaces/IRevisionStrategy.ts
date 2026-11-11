/**
 * Rating selected by the student during revision.
 */
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Current spaced-repetition state for a topic.
 */
export interface ReviewState {
  memoryStrength: number;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
}

/**
 * State produced after applying a revision strategy.
 */
export interface ReviewResult extends ReviewState {
  nextReviewAt: Date;
}

/**
 * Strategy contract for spaced repetition.
 *
 * OOP: Strategy - strategies are interchangeable at runtime.
 * OOP: DIP - RevisionService can depend on this abstraction instead of a concrete algorithm.
 */
export interface IRevisionStrategy {
  readonly name: string;
  calculateNextReview(state: ReviewState, rating: ReviewRating, now?: Date): ReviewResult;
}
