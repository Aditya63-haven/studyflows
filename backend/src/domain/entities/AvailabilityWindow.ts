import { ValidationError } from '../../errors';
import { requireNumberInRange, resolveId } from '../base/helpers';

export interface AvailabilityWindowProps {
  id?: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * A fixed block of study time inside one day, expressed as minutes since
 * midnight.
 *
 * OOP: Encapsulation - start and end minutes are validated on construction and
 * can only be read through getters.
 * OOP: Composition - AvailabilityWindows are owned by DayAvailability and are
 * never managed outside of it.
 */
export class AvailabilityWindow {
  private readonly _id: string;
  private readonly _startMinutes: number;
  private readonly _endMinutes: number;

  constructor(props: AvailabilityWindowProps) {
    this._id = resolveId(props.id);
    this._startMinutes = requireNumberInRange(
      props.startMinutes,
      'startMinutes',
      0,
      1439,
    );
    this._endMinutes = requireNumberInRange(props.endMinutes, 'endMinutes', 0, 1439);
    if (this._endMinutes <= this._startMinutes) {
      throw new ValidationError('Window end must be after window start');
    }
  }

  public getId(): string {
    return this._id;
  }

  public getStartMinutes(): number {
    return this._startMinutes;
  }

  public getEndMinutes(): number {
    return this._endMinutes;
  }

  public getDurationMinutes(): number {
    return this._endMinutes - this._startMinutes;
  }

  public overlaps(other: AvailabilityWindow): boolean {
    return (
      this._startMinutes < other.getEndMinutes() &&
      other.getStartMinutes() < this._endMinutes
    );
  }
}
