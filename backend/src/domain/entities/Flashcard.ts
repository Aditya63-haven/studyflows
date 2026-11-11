import {
  optionalDate,
  requireDate,
  requireNonEmpty,
  requireNumberInRange,
  resolveId,
} from '../base/helpers';

export interface FlashcardProps {
  id?: string;
  front: string;
  back: string;
  easeFactor?: number;
  intervalDays?: number;
  reviewCount?: number;
  lastReviewedAt?: Date | null;
  nextReviewAt?: Date | null;
}

/**
 * One flashcard inside a deck.
 *
 * OOP: Encapsulation - ease factor and scheduling state are private and
 * validated through setters.
 * OOP: Composition - a FlashcardDeck owns its flashcards.
 */
export class Flashcard {
  private readonly _id: string;
  private _front: string;
  private _back: string;
  private _easeFactor: number;
  private _intervalDays: number;
  private _reviewCount: number;
  private _lastReviewedAt: Date | null;
  private _nextReviewAt: Date | null;

  constructor(props: FlashcardProps) {
    this._id = resolveId(props.id);
    this._front = requireNonEmpty(props.front, 'front');
    this._back = requireNonEmpty(props.back, 'back');
    this._easeFactor = requireNumberInRange(props.easeFactor ?? 2.5, 'easeFactor', 1.3, 5);
    this._intervalDays = requireNumberInRange(props.intervalDays ?? 0, 'intervalDays', 0, 3650);
    this._reviewCount = requireNumberInRange(props.reviewCount ?? 0, 'reviewCount', 0, 100_000);
    this._lastReviewedAt = optionalDate(props.lastReviewedAt, 'lastReviewedAt');
    this._nextReviewAt = optionalDate(props.nextReviewAt, 'nextReviewAt');
  }

  public getId(): string {
    return this._id;
  }

  public getFront(): string {
    return this._front;
  }

  public setFront(front: string): void {
    this._front = requireNonEmpty(front, 'front');
  }

  public getBack(): string {
    return this._back;
  }

  public setBack(back: string): void {
    this._back = requireNonEmpty(back, 'back');
  }

  public getEaseFactor(): number {
    return this._easeFactor;
  }

  public setEaseFactor(easeFactor: number): void {
    this._easeFactor = requireNumberInRange(easeFactor, 'easeFactor', 1.3, 5);
  }

  public getIntervalDays(): number {
    return this._intervalDays;
  }

  public setIntervalDays(intervalDays: number): void {
    this._intervalDays = requireNumberInRange(intervalDays, 'intervalDays', 0, 3650);
  }

  public getReviewCount(): number {
    return this._reviewCount;
  }

  public getLastReviewedAt(): Date | null {
    return this._lastReviewedAt ? new Date(this._lastReviewedAt.getTime()) : null;
  }

  public getNextReviewAt(): Date | null {
    return this._nextReviewAt ? new Date(this._nextReviewAt.getTime()) : null;
  }

  public applySchedule(
    easeFactor: number,
    intervalDays: number,
    nextReviewAt: Date,
    reviewedAt: Date,
  ): void {
    this.setEaseFactor(easeFactor);
    this.setIntervalDays(intervalDays);
    this._lastReviewedAt = requireDate(reviewedAt, 'reviewedAt');
    this._nextReviewAt = requireDate(nextReviewAt, 'nextReviewAt');
    this._reviewCount += 1;
  }

  public isDue(now: Date = new Date()): boolean {
    if (!this._nextReviewAt) {
      return true;
    }
    return this._nextReviewAt.getTime() <= now.getTime();
  }
}
