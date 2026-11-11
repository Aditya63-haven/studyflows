import { clamp, addDays, roundTo } from '../../domain/base/helpers';
import {
  IRevisionStrategy,
  ReviewRating,
  ReviewResult,
  ReviewState,
} from '../../domain/interfaces/IRevisionStrategy';

interface RatingEffect {
  strengthDelta: number;
  easeDelta: number;
  intervalMultiplier: number;
}

const EFFECTS: Record<ReviewRating, RatingEffect> = {
  again: { strengthDelta: -30, easeDelta: -0.2, intervalMultiplier: 0 },
  hard: { strengthDelta: -10, easeDelta: -0.1, intervalMultiplier: 1.5 },
  good: { strengthDelta: 12, easeDelta: 0.05, intervalMultiplier: 2 },
  easy: { strengthDelta: 22, easeDelta: 0.15, intervalMultiplier: 3 },
};

/**
 * Simple, readable spaced-repetition strategy.
 *
 * OOP: Strategy - implements IRevisionStrategy and can be swapped with SM2Strategy.
 */
export class SimpleMemoryStrengthStrategy implements IRevisionStrategy {
  public readonly name = 'simple';

  public calculateNextReview(
    state: ReviewState,
    rating: ReviewRating,
    now: Date = new Date(),
  ): ReviewResult {
    const effect = EFFECTS[rating];
    const intervalDays =
      effect.intervalMultiplier === 0
        ? 1
        : Math.max(1, Math.round(Math.max(1, state.intervalDays) * effect.intervalMultiplier));

    const memoryStrength = roundTo(
      clamp(state.memoryStrength + effect.strengthDelta, 0, 100),
    );
    const easeFactor = roundTo(clamp(state.easeFactor + effect.easeDelta, 1.3, 5), 2);

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
