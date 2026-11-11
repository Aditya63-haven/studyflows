import { DayAvailability } from '../src/domain/entities/DayAvailability';
import { AvailabilityWindow } from '../src/domain/entities/AvailabilityWindow';
import { StudentAvailability } from '../src/domain/entities/StudentAvailability';
import { CapacityCalculator } from '../src/domain/services/CapacityCalculator';

const budgetDay = (weekday: number, budgetMinutes: number, available = true) =>
  new DayAvailability({ weekday, budgetMinutes, available });

const windowedDay = (weekday: number, budgetMinutes: number) =>
  new DayAvailability({
    weekday,
    mode: 'budget-windows',
    budgetMinutes,
    windows: [
      new AvailabilityWindow({ startMinutes: 540, endMinutes: 600 }),
      new AvailabilityWindow({ startMinutes: 1140, endMinutes: 1200 }),
    ],
  });

const availabilityOf = (days: DayAvailability[]) => new StudentAvailability({ userId: 'user-1', days });

// Wednesday, 2026-03-04 is a Monday-based weekday 2.
const wednesday = new Date('2026-03-04T15:00:00.000Z');

describe('CapacityCalculator', () => {
  it('treats the whole budget as flexible in plain budget mode', () => {
    const capacity = CapacityCalculator.forDay(budgetDay(2, 120));

    expect(capacity).toEqual({ totalMinutes: 120, windowMinutes: 0, flexibleMinutes: 120 });
  });

  it('splits window and flexible minutes in budget-windows mode', () => {
    const capacity = CapacityCalculator.forDay(windowedDay(2, 240));

    expect(capacity).toEqual({ totalMinutes: 240, windowMinutes: 120, flexibleMinutes: 120 });
  });

  it('returns zero capacity for unavailable days', () => {
    const capacity = CapacityCalculator.forDay(budgetDay(2, 120, false));

    expect(capacity).toEqual({ totalMinutes: 0, windowMinutes: 0, flexibleMinutes: 0 });
  });

  it('maps a calendar date onto the matching weekday', () => {
    const availability = availabilityOf([budgetDay(2, 90)]);

    expect(CapacityCalculator.forDate(availability, wednesday).totalMinutes).toBe(90);
  });

  it('uses the default day when the weekday is not configured', () => {
    const availability = availabilityOf([budgetDay(0, 30)]);

    expect(CapacityCalculator.forDate(availability, wednesday).totalMinutes).toBe(120);
  });

  it('subtracts booked minutes and clamps at zero', () => {
    const availability = availabilityOf([budgetDay(2, 120)]);

    expect(CapacityCalculator.remainingForDate(availability, wednesday, 100)).toBe(20);
    expect(CapacityCalculator.remainingForDate(availability, wednesday, 300)).toBe(0);
    expect(CapacityCalculator.remainingForDate(availability, wednesday, -10)).toBe(120);
  });
});
