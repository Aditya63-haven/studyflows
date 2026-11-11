import { ReviewState } from '../src/domain/interfaces/IRevisionStrategy';
import { SimpleMemoryStrengthStrategy } from '../src/patterns/strategy/SimpleMemoryStrengthStrategy';
import { SM2Strategy } from '../src/patterns/strategy/SM2Strategy';

const now = new Date('2026-01-01T00:00:00.000Z');
const state: ReviewState = {
  memoryStrength: 50,
  easeFactor: 2.5,
  intervalDays: 2,
  reviewCount: 2,
  lastReviewedAt: null,
};

describe('SimpleMemoryStrengthStrategy', () => {
  const strategy = new SimpleMemoryStrengthStrategy();

  it('applies the good rating effect', () => {
    const result = strategy.calculateNextReview(state, 'good', now);

    expect(result.memoryStrength).toBe(62);
    expect(result.easeFactor).toBe(2.55);
    expect(result.intervalDays).toBe(4);
    expect(result.reviewCount).toBe(3);
    expect(result.nextReviewAt.toISOString()).toBe('2026-01-05T00:00:00.000Z');
    expect(result.lastReviewedAt?.toISOString()).toBe(now.toISOString());
  });

  it('resets the interval after an again rating', () => {
    const result = strategy.calculateNextReview(state, 'again', now);

    expect(result.memoryStrength).toBe(20);
    expect(result.easeFactor).toBe(2.3);
    expect(result.intervalDays).toBe(1);
    expect(result.nextReviewAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('clamps memory strength and ease factor to valid ranges', () => {
    const high = strategy.calculateNextReview(
      { ...state, memoryStrength: 95, easeFactor: 4.95 },
      'easy',
      now,
    );
    const low = strategy.calculateNextReview(
      { ...state, memoryStrength: 5, easeFactor: 1.35 },
      'again',
      now,
    );

    expect(high.memoryStrength).toBe(100);
    expect(high.easeFactor).toBe(5);
    expect(low.memoryStrength).toBe(0);
    expect(low.easeFactor).toBe(1.3);
  });
});

describe('SM2Strategy', () => {
  const strategy = new SM2Strategy();

  it('applies SM-2 interval growth after repeated success', () => {
    const result = strategy.calculateNextReview(state, 'good', now);

    expect(result.memoryStrength).toBe(65);
    expect(result.easeFactor).toBe(2.5);
    expect(result.intervalDays).toBe(5);
    expect(result.reviewCount).toBe(3);
    expect(result.nextReviewAt.toISOString()).toBe('2026-01-06T00:00:00.000Z');
  });

  it('uses the first review intervals for new cards', () => {
    const first = strategy.calculateNextReview(
      { ...state, reviewCount: 0, intervalDays: 0 },
      'good',
      now,
    );
    const second = strategy.calculateNextReview(
      { ...state, reviewCount: 1, intervalDays: 1 },
      'good',
      now,
    );

    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(6);
  });

  it('resets failed reviews and clamps ease factor', () => {
    const result = strategy.calculateNextReview(state, 'again', now);

    expect(result.memoryStrength).toBe(20);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeCloseTo(1.7);
  });

  it('produces a different schedule than the simple strategy', () => {
    const simple = new SimpleMemoryStrengthStrategy().calculateNextReview(state, 'good', now);
    const sm2 = strategy.calculateNextReview(state, 'good', now);

    expect(sm2.nextReviewAt.getTime()).not.toBe(simple.nextReviewAt.getTime());
  });
});
