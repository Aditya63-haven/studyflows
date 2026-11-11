import { AvailabilityWindow } from '../src/domain/entities/AvailabilityWindow';
import { DayAvailability } from '../src/domain/entities/DayAvailability';
import { StudentAvailability } from '../src/domain/entities/StudentAvailability';
import { ValidationError } from '../src/errors';

const window = (startMinutes: number, endMinutes: number, id?: string) =>
  new AvailabilityWindow({ id, startMinutes, endMinutes });

describe('AvailabilityWindow', () => {
  it('stores start, end and duration minutes', () => {
    const morning = window(540, 600, 'window-1');

    expect(morning.getId()).toBe('window-1');
    expect(morning.getStartMinutes()).toBe(540);
    expect(morning.getEndMinutes()).toBe(600);
    expect(morning.getDurationMinutes()).toBe(60);
  });

  it('generates an id when none is supplied', () => {
    expect(window(0, 30).getId()).not.toBe('');
  });

  it('rejects an end at or before the start', () => {
    expect(() => window(600, 540)).toThrow(ValidationError);
    expect(() => window(600, 600)).toThrow('Window end must be after window start');
  });

  it('rejects minutes outside a single day', () => {
    expect(() => window(-1, 30)).toThrow('startMinutes must be between 0 and 1439');
    expect(() => window(0, 1440)).toThrow('endMinutes must be between 0 and 1439');
  });

  it('detects overlapping windows in both directions', () => {
    const early = window(540, 600);
    const late = window(570, 660);
    const after = window(600, 660);

    expect(early.overlaps(late)).toBe(true);
    expect(late.overlaps(early)).toBe(true);
    expect(early.overlaps(after)).toBe(false);
  });
});

describe('DayAvailability', () => {
  it('defaults to budget mode without windows', () => {
    const day = new DayAvailability({ weekday: 2, budgetMinutes: 120 });

    expect(day.getWeekday()).toBe(2);
    expect(day.getMode()).toBe('budget');
    expect(day.getBudgetMinutes()).toBe(120);
    expect(day.isAvailable()).toBe(true);
    expect(day.getWindows()).toHaveLength(0);
    expect(day.getWindowMinutes()).toBe(0);
  });

  it('sums window minutes in budget-windows mode', () => {
    const day = new DayAvailability({
      weekday: 1,
      mode: 'budget-windows',
      budgetMinutes: 240,
      windows: [window(540, 600), window(1140, 1200)],
    });

    expect(day.getWindowMinutes()).toBe(120);
  });

  it('rejects overlapping windows', () => {
    expect(
      () =>
        new DayAvailability({
          weekday: 1,
          budgetMinutes: 240,
          windows: [window(540, 600), window(590, 660)],
        }),
    ).toThrow('Availability windows must not overlap');
  });

  it('rejects window minutes above the daily budget', () => {
    expect(
      () =>
        new DayAvailability({
          weekday: 1,
          budgetMinutes: 60,
          windows: [window(540, 600), window(1140, 1200)],
        }),
    ).toThrow('Window minutes cannot exceed the daily budget');
  });

  it('revalidates when the budget is lowered through the setter', () => {
    const day = new DayAvailability({
      weekday: 1,
      budgetMinutes: 120,
      windows: [window(540, 660)],
    });

    expect(() => day.setBudgetMinutes(60)).toThrow(
      'Window minutes cannot exceed the daily budget',
    );
  });

  it('rejects invalid weekdays, budgets and modes', () => {
    expect(() => new DayAvailability({ weekday: 7, budgetMinutes: 120 })).toThrow(
      'weekday must be between 0 and 6',
    );
    expect(() => new DayAvailability({ weekday: -1, budgetMinutes: 120 })).toThrow(
      'weekday must be between 0 and 6',
    );
    expect(() => new DayAvailability({ weekday: 0, budgetMinutes: -5 })).toThrow(
      'budgetMinutes must be between 0 and 1440',
    );
    expect(() => new DayAvailability({ weekday: 0, budgetMinutes: 2000 })).toThrow(
      'budgetMinutes must be between 0 and 1440',
    );
    expect(
      () => new DayAvailability({ weekday: 0, budgetMinutes: 120, mode: 'nope' as never }),
    ).toThrow('mode must be "budget" or "budget-windows"');
  });

  it('adds and removes windows through the owning day', () => {
    const day = new DayAvailability({ weekday: 3, budgetMinutes: 240 });
    const morning = window(540, 600);
    const evening = window(1140, 1200);

    day.addWindow(morning);
    day.addWindow(evening);
    expect(day.getWindows()).toHaveLength(2);

    expect(day.removeWindow(morning.getId())).toBe(true);
    expect(day.removeWindow(morning.getId())).toBe(false);
    expect(day.getWindows()).toEqual([expect.any(AvailabilityWindow)]);
  });

  it('rejects plain objects where AvailabilityWindow instances are required', () => {
    const day = new DayAvailability({ weekday: 3, budgetMinutes: 240 });

    expect(() => day.setWindows([{} as AvailabilityWindow])).toThrow(
      'windows must contain AvailabilityWindow instances',
    );
  });

  it('creates a sensible default day', () => {
    const day = DayAvailability.defaultFor(4);

    expect(day.getWeekday()).toBe(4);
    expect(day.getMode()).toBe('budget');
    expect(day.getBudgetMinutes()).toBe(120);
    expect(day.isAvailable()).toBe(true);
  });
});

describe('StudentAvailability', () => {
  const monday = new DayAvailability({ weekday: 0, budgetMinutes: 60 });
  const tuesday = new DayAvailability({ weekday: 1, budgetMinutes: 90 });

  it('keeps days sorted by weekday', () => {
    const availability = new StudentAvailability({
      userId: 'user-1',
      days: [tuesday, monday],
    });

    expect(availability.getDays().map((day) => day.getWeekday())).toEqual([0, 1]);
  });

  it('rejects duplicate weekdays', () => {
    expect(
      () =>
        new StudentAvailability({
          userId: 'user-1',
          days: [monday, new DayAvailability({ weekday: 0, budgetMinutes: 30 })],
        }),
    ).toThrow('Duplicate weekday: 0');
  });

  it('falls back to the default day for unset weekdays', () => {
    const availability = new StudentAvailability({ userId: 'user-1', days: [monday] });

    expect(availability.getDay(0)).toBe(monday);
    expect(availability.getDay(5).getBudgetMinutes()).toBe(120);
  });

  it('replaces one weekday through setDay', () => {
    const availability = new StudentAvailability({ userId: 'user-1', days: [monday] });
    const replacement = new DayAvailability({ weekday: 0, budgetMinutes: 180 });

    availability.setDay(replacement);

    expect(availability.getDay(0)).toBe(replacement);
  });

  it('creates a full default week', () => {
    const availability = StudentAvailability.defaultFor('user-1');

    expect(availability.getDays()).toHaveLength(7);
    expect(availability.getUserId()).toBe('user-1');
  });
});
