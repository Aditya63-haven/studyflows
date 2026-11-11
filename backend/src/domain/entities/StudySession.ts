import { requireDate, requireNonEmpty, requireNumberInRange, resolveId } from '../base/helpers';

export interface StudySessionProps {
  id?: string;
  userId: string;
  spaceId?: string | null;
  subject?: string;
  durationMinutes: number;
  startedAt?: Date;
  endedAt?: Date | null;
  createdAt?: Date;
}

/**
 * Recorded study time used by analytics.
 *
 * OOP: Association - relates a User to an optional StudySpace.
 * OOP: Encapsulation - duration and timestamps are validated.
 */
export class StudySession {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _spaceId: string | null;
  private readonly _subject: string;
  private readonly _durationMinutes: number;
  private readonly _startedAt: Date;
  private _endedAt: Date | null;
  private readonly _createdAt: Date;

  constructor(props: StudySessionProps) {
    this._id = resolveId(props.id);
    this._userId = requireNonEmpty(props.userId, 'userId');
    this._spaceId = props.spaceId ? requireNonEmpty(props.spaceId, 'spaceId') : null;
    this._subject = props.subject?.trim() ?? '';
    this._durationMinutes = requireNumberInRange(
      props.durationMinutes,
      'durationMinutes',
      1,
      1440,
    );
    this._startedAt = props.startedAt ? requireDate(props.startedAt, 'startedAt') : new Date();
    this._endedAt = props.endedAt ? requireDate(props.endedAt, 'endedAt') : null;
    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getUserId(): string {
    return this._userId;
  }

  public getSpaceId(): string | null {
    return this._spaceId;
  }

  public getSubject(): string {
    return this._subject;
  }

  public getDurationMinutes(): number {
    return this._durationMinutes;
  }

  public getStartedAt(): Date {
    return new Date(this._startedAt.getTime());
  }

  public getEndedAt(): Date | null {
    return this._endedAt ? new Date(this._endedAt.getTime()) : null;
  }

  public complete(endedAt: Date = new Date()): void {
    this._endedAt = requireDate(endedAt, 'endedAt');
  }

  public isCompleted(): boolean {
    return this._endedAt !== null;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }
}
