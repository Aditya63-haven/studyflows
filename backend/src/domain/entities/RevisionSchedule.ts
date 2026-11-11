import { ReviewResult, ReviewState } from '../interfaces/IRevisionStrategy';
import {
  endOfDay,
  optionalDate,
  requireDate,
  requireNonEmpty,
  requireNumberInRange,
  resolveId,
  roundTo,
} from '../base/helpers';

export type RevisionStatus = 'due' | 'needs_revision' | 'mastered' | 'scheduled';

export interface RevisionScheduleProps {
  id?: string;
  userId: string;
  topicId: string;
  topicName: string;
  memoryStrength?: number;
  easeFactor?: number;
  intervalDays?: number;
  reviewCount?: number;
  lastReviewedAt?: Date | null;
  nextReviewAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Spaced-repetition state for one topic.
 *
 * OOP: Encapsulation - memory strength and scheduling fields are private with
 * validated accessors.
 * OOP: Association - links a User to a Topic.
 * OOP: Strategy - results are produced by an injected IRevisionStrategy.
 */
export class RevisionSchedule {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _topicId: string;
  private _topicName: string;
  private _memoryStrength: number;
  private _easeFactor: number;
  private _intervalDays: number;
  private _reviewCount: number;
  private _lastReviewedAt: Date | null;
  private _nextReviewAt: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RevisionScheduleProps) {
    this._id = resolveId(props.id);
    this._userId = requireNonEmpty(props.userId, 'userId');
    this._topicId = requireNonEmpty(props.topicId, 'topicId');
    this._topicName = requireNonEmpty(props.topicName, 'topicName');
    this._memoryStrength = requireNumberInRange(
      props.memoryStrength ?? 0,
      'memoryStrength',
      0,
      100,
    );
    this._easeFactor = requireNumberInRange(props.easeFactor ?? 2.5, 'easeFactor', 1.3, 5);
    this._intervalDays = requireNumberInRange(props.intervalDays ?? 0, 'intervalDays', 0, 3650);
    this._reviewCount = requireNumberInRange(props.reviewCount ?? 0, 'reviewCount', 0, 100_000);
    this._lastReviewedAt = optionalDate(props.lastReviewedAt, 'lastReviewedAt');
    this._nextReviewAt = props.nextReviewAt
      ? requireDate(props.nextReviewAt, 'nextReviewAt')
      : new Date();
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt ? requireDate(props.updatedAt, 'updatedAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getUserId(): string {
    return this._userId;
  }

  public getTopicId(): string {
    return this._topicId;
  }

  public getTopicName(): string {
    return this._topicName;
  }

  public setTopicName(name: string): void {
    this._topicName = requireNonEmpty(name, 'topicName');
    this.touch();
  }

  public getMemoryStrength(): number {
    return this._memoryStrength;
  }

  public setMemoryStrength(value: number): void {
    this._memoryStrength = requireNumberInRange(value, 'memoryStrength', 0, 100);
    this.touch();
  }

  public getEaseFactor(): number {
    return this._easeFactor;
  }

  public setEaseFactor(value: number): void {
    this._easeFactor = requireNumberInRange(value, 'easeFactor', 1.3, 5);
    this.touch();
  }

  public getIntervalDays(): number {
    return this._intervalDays;
  }

  public setIntervalDays(value: number): void {
    this._intervalDays = requireNumberInRange(value, 'intervalDays', 0, 3650);
    this.touch();
  }

  public getReviewCount(): number {
    return this._reviewCount;
  }

  public getLastReviewedAt(): Date | null {
    return this._lastReviewedAt ? new Date(this._lastReviewedAt.getTime()) : null;
  }

  public getNextReviewAt(): Date {
    return new Date(this._nextReviewAt.getTime());
  }

  public setNextReviewAt(value: Date): void {
    this._nextReviewAt = requireDate(value, 'nextReviewAt');
    this.touch();
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public isDue(now: Date = new Date()): boolean {
    return this._nextReviewAt.getTime() <= endOfDay(now).getTime();
  }

  public getStatus(now: Date = new Date()): RevisionStatus {
    if (this.isDue(now)) {
      return 'due';
    }
    if (this._memoryStrength < 40) {
      return 'needs_revision';
    }
    if (this._memoryStrength >= 80) {
      return 'mastered';
    }
    return 'scheduled';
  }

  public daysUntilReview(now: Date = new Date()): number {
    const difference = this._nextReviewAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(difference / (24 * 60 * 60 * 1000)));
  }

  public toReviewState(): ReviewState {
    return {
      memoryStrength: this._memoryStrength,
      easeFactor: this._easeFactor,
      intervalDays: this._intervalDays,
      reviewCount: this._reviewCount,
      lastReviewedAt: this._lastReviewedAt ? new Date(this._lastReviewedAt.getTime()) : null,
    };
  }

  /**
   * Applies a strategy result to this schedule.
   */
  public applyReview(result: ReviewResult): void {
    this._memoryStrength = roundTo(
      requireNumberInRange(result.memoryStrength, 'memoryStrength', 0, 100),
    );
    this._easeFactor = requireNumberInRange(result.easeFactor, 'easeFactor', 1.3, 5);
    this._intervalDays = requireNumberInRange(result.intervalDays, 'intervalDays', 0, 3650);
    this._reviewCount = requireNumberInRange(result.reviewCount, 'reviewCount', 0, 100_000);
    this._lastReviewedAt = result.lastReviewedAt
      ? requireDate(result.lastReviewedAt, 'lastReviewedAt')
      : null;
    this._nextReviewAt = requireDate(result.nextReviewAt, 'nextReviewAt');
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
