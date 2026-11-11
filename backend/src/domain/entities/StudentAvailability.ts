import { ValidationError } from '../../errors';
import { requireDate, requireNonEmpty, resolveId } from '../base/helpers';
import { DayAvailability } from './DayAvailability';

export interface StudentAvailabilityProps {
  id?: string;
  userId: string;
  days?: DayAvailability[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A student's weekly study availability, one entry per weekday.
 *
 * OOP: Aggregation - StudentAvailability aggregates DayAvailability entries
 * for all seven weekdays of the week.
 * OOP: Encapsulation - days are replaced through validated methods only.
 */
export class StudentAvailability {
  private readonly _id: string;
  private readonly _userId: string;
  private _days: Map<number, DayAvailability>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: StudentAvailabilityProps) {
    this._id = resolveId(props.id);
    this._userId = requireNonEmpty(props.userId, 'userId');

    this._days = new Map<number, DayAvailability>();
    const days = props.days ?? [];
    for (const day of days) {
      if (!(day instanceof DayAvailability)) {
        throw new ValidationError('days must contain DayAvailability instances');
      }
      if (this._days.has(day.getWeekday())) {
        throw new ValidationError(`Duplicate weekday: ${day.getWeekday()}`);
      }
      this._days.set(day.getWeekday(), day);
    }

    this._createdAt = props.createdAt ? requireDate(props.createdAt, 'createdAt') : new Date();
    this._updatedAt = props.updatedAt ? requireDate(props.updatedAt, 'updatedAt') : new Date();
  }

  public getId(): string {
    return this._id;
  }

  public getUserId(): string {
    return this._userId;
  }

  public getCreatedAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public getUpdatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public getDays(): DayAvailability[] {
    return [...this._days.values()].sort(
      (left, right) => left.getWeekday() - right.getWeekday(),
    );
  }

  public getDay(weekday: number): DayAvailability {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new ValidationError('weekday must be between 0 and 6');
    }
    return this._days.get(weekday) ?? DayAvailability.defaultFor(weekday);
  }

  /**
   * Replaces the availability for one weekday.
   */
  public setDay(day: DayAvailability): void {
    if (!(day instanceof DayAvailability)) {
      throw new ValidationError('day must be a DayAvailability instance');
    }
    this._days.set(day.getWeekday(), day);
    this.touch();
  }

  /**
   * Creates a per-user weekly availability with default values.
   */
  public static defaultFor(userId: string): StudentAvailability {
    const availability = new StudentAvailability({ userId });
    for (let weekday = 0; weekday < 7; weekday += 1) {
      availability._days.set(weekday, DayAvailability.defaultFor(weekday));
    }
    return availability;
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
