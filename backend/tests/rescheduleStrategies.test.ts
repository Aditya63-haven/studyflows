import { DayAvailability } from '../src/domain/entities/DayAvailability';
import { StudentAvailability } from '../src/domain/entities/StudentAvailability';
import {
  IRescheduleStrategy,
  RescheduleRequest,
} from '../src/domain/interfaces/IRescheduleStrategy';
import { dateKey } from '../src/domain/base/helpers';
import { MoveToNextFreeSlotStrategy } from '../src/patterns/strategy/MoveToNextFreeSlotStrategy';
import { MoveToWeekendStrategy } from '../src/patterns/strategy/MoveToWeekendStrategy';

// Local-time dates keep dateKey() and startOfDay() consistent in every timezone.
// 2026-03-02 is a Monday, 2026-03-07 the following Saturday.
const monday = new Date(2026, 2, 2, 10);
const tuesday = new Date(2026, 2, 3, 10);
const wednesday = new Date(2026, 2, 4, 10);
const thursday = new Date(2026, 2, 5, 10);
const saturday = new Date(2026, 2, 7, 9);

const defaultAvailability = StudentAvailability.defaultFor('user-1');

const availabilityWith = (overrides: { weekday: number; budgetMinutes?: number; available?: boolean }[]) => {
  const availability = StudentAvailability.defaultFor('user-1');
  for (const override of overrides) {
    availability.setDay(
      new DayAvailability({
        weekday: override.weekday,
        budgetMinutes: override.budgetMinutes ?? 120,
        available: override.available ?? true,
      }),
    );
  }
  return availability;
};

const bookedMinutes = (entries: [Date, number][]) => {
  const map = new Map<string, number>();
  for (const [date, minutes] of entries) {
    map.set(dateKey(date), minutes);
  }
  return map;
};

const request = (overrides: Partial<RescheduleRequest> = {}): RescheduleRequest => ({
  userId: 'user-1',
  planId: 'plan-1',
  planName: 'Final Exam',
  reason: 'missed-session',
  fromDate: monday,
  minutes: 45,
  examDate: saturday,
  availability: defaultAvailability,
  bookedMinutes: new Map<string, number>(),
  ...overrides,
});

describe('MoveToNextFreeSlotStrategy', () => {
  const strategy = new MoveToNextFreeSlotStrategy();

  it('picks the earliest upcoming day with enough free capacity', () => {
    const suggestion = strategy.propose(
      request({ bookedMinutes: bookedMinutes([[tuesday, 100]]) }),
    );

    expect(suggestion.strategy).toBe('next-free-slot');
    expect(suggestion.minutes).toBe(45);
    expect(dateKey(suggestion.targetDate)).toBe(dateKey(wednesday));
  });

  it('skips unavailable and fully booked days', () => {
    const suggestion = strategy.propose(
      request({
        availability: availabilityWith([{ weekday: 1, available: false }]),
        bookedMinutes: bookedMinutes([[wednesday, 120]]),
      }),
    );

    expect(dateKey(suggestion.targetDate)).toBe(dateKey(thursday));
  });

  it('falls back to the day with the most remaining minutes when nothing fits', () => {
    const suggestion = strategy.propose(
      request({
        availability: availabilityWith([0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, budgetMinutes: 30 }))),
      }),
    );

    expect(dateKey(suggestion.targetDate)).toBe(dateKey(tuesday));
    expect(suggestion.description).toContain('30 minutes left');
  });
});

describe('MoveToWeekendStrategy', () => {
  const strategy = new MoveToWeekendStrategy();

  it('suggests the next Saturday with free capacity', () => {
    const suggestion = strategy.propose(request());

    expect(suggestion.strategy).toBe('weekend');
    expect(suggestion.label).toBe('Move to the weekend');
    expect(dateKey(suggestion.targetDate)).toBe(dateKey(saturday));
  });

  it('still uses the weekend when it cannot fully fit the work', () => {
    const suggestion = strategy.propose(
      request({ bookedMinutes: bookedMinutes([[saturday, 100]]) }),
    );

    expect(dateKey(suggestion.targetDate)).toBe(dateKey(saturday));
    expect(suggestion.description).toContain('20 minutes left');
  });

  it('falls back to the weekend after the exam when none fits before it', () => {
    const suggestion = strategy.propose(request({ examDate: thursday }));

    expect(dateKey(suggestion.targetDate)).toBe(dateKey(saturday));
  });
});

describe('reschedule strategies are interchangeable', () => {
  it('both satisfy the IRescheduleStrategy contract', () => {
    const strategies: IRescheduleStrategy[] = [
      new MoveToNextFreeSlotStrategy(),
      new MoveToWeekendStrategy(),
    ];

    for (const strategy of strategies) {
      const suggestion = strategy.propose(request());

      expect(suggestion.targetDate.getTime()).toBeGreaterThan(monday.getTime());
      expect(suggestion.minutes).toBe(45);
      expect(suggestion.description).toContain('45 minutes');
      expect(strategy.label).toContain('Move');
    }
  });
});
