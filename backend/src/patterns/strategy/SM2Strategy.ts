import { addDays, clamp, roundTo } from '../../domain/base/helpers';
import {
  IRevisionStrategy,
  ReviewRating,
  ReviewResult,
  ReviewState,
} from '../../domain/interfaces/IRevisionStrategy';

const QUALITY_BY_RATING: Record<ReviewRating, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

const STRENGTH_DELTA_BY_RATING: Record<ReviewRating, number> = {
  again: -30,
  hard: 5,
  good: 15,
  easy: 25,
};

/**
 * SM-2 inspired spaced-repetition strategy.
 *
 * OOP: Strategy - interchangeable implementation of IRevisionStrategy.
 * OOP: Polymorphism - RevisionService can call calculateNextReview without
 * knowing which strategy is active.
 */
export class SM2Strategy implements IRevisionStrategy {
  public readonly name = 'sm2';

  public calculateNextReview(
    state: ReviewState,
    rating: ReviewRating,
    now: Date = new Date(),
  ): ReviewResult {
    const quality = QUALITY_BY_RATING[rating];
    const easeFactor = roundTo(
      clamp(
        state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
        1.3,
        5,
      ),
      2,
    );

    let intervalDays: number;
    if (quality < 3) {
      intervalDays = 1;
    } else if (state.reviewCount === 0) {
      intervalDays = 1;
    } else if (state.reviewCount === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(Math.max(1, state.intervalDays) * easeFactor));
    }

    const memoryStrength = roundTo(
      clamp(state.memoryStrength + STRENGTH_DELTA_BY_RATING[rating], 0, 100),
    );

    return {
      memoryStrength,
      easeFactor,
      intervalDays,
      reviewCount: state.reviewCount + 1,
      lastReviewedAt: new Date(now.getTime()),
      nextReviewAt: addDays(now, intervalDays),
    };
  }
}
