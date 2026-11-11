import { weekdayIndex } from '../base/helpers';
import { DayAvailability } from '../entities/DayAvailability';
import { StudentAvailability } from '../entities/StudentAvailability';

export interface DayCapacity {
  /** Total study minutes available on the day (0 when unavailable). */
  totalMinutes: number;
  /** Minutes inside exact availability windows (0 in plain budget mode). */
  windowMinutes: number;
  /** Minutes that can be planned flexibly anywhere in the day. */
  flexibleMinutes: number;
}

const EMPTY_CAPACITY: DayCapacity = {
  totalMinutes: 0,
  windowMinutes: 0,
  flexibleMinutes: 0,
};

/**
 * Pure calculator that turns weekly availability into per-day capacity.
 *
 * OOP: Abstraction - planning code depends on this class instead of reading
 * availability internals directly.
 * OOP: SRP - capacity math lives in one place for builder, strategies and
 * services alike.
 */
export class CapacityCalculator {
  public static forDay(day: DayAvailability): DayCapacity {
    if (!day.isAvailable()) {
      return EMPTY_CAPACITY;
    }

    const totalMinutes = day.getBudgetMinutes();
    const windowMinutes = day.getMode() === 'budget-windows' ? day.getWindowMinutes() : 0;

    return {
      totalMinutes,
      windowMinutes,
      flexibleMinutes: Math.max(0, totalMinutes - windowMinutes),
    };
  }

  public static forDate(availability: StudentAvailability, date: Date): DayCapacity {
    return CapacityCalculator.forDay(availability.getDay(weekdayIndex(date)));
  }

  /**
   * Minutes still free on a date after subtracting already planned minutes.
   */
  public static remainingForDate(
    availability: StudentAvailability,
    date: Date,
    bookedMinutes: number,
  ): number {
    const capacity = CapacityCalculator.forDate(availability, date);
    return Math.max(0, capacity.totalMinutes - Math.max(0, bookedMinutes));
  }
}
