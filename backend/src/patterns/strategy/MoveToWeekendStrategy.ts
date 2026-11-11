import { addDays, dateKey, startOfDay } from '../../domain/base/helpers';
import {
  IRescheduleStrategy,
  RescheduleRequest,
  RescheduleSuggestion,
} from '../../domain/interfaces/IRescheduleStrategy';
import { CapacityCalculator } from '../../domain/services/CapacityCalculator';

const isWeekend = (date: Date): boolean => date.getDay() === 6 || date.getDay() === 0;

/**
 * Suggests the nearest weekend day with free capacity.
 *
 * OOP: Strategy - interchangeable with MoveToNextFreeSlotStrategy.
 * OOP: Polymorphism - used through the IRescheduleStrategy interface.
 */
export class MoveToWeekendStrategy implements IRescheduleStrategy {
  public readonly name = 'weekend' as const;
  public readonly label = 'Move to the weekend';

  public propose(request: RescheduleRequest): RescheduleSuggestion {
    const from = startOfDay(request.fromDate);
    const exam = startOfDay(request.examDate);

    let best: { date: Date; remaining: number } | null = null;
    let cursor = addDays(from, 1);

    while (cursor.getTime() <= exam.getTime()) {
      if (isWeekend(cursor)) {
        const remaining = this.freeMinutes(request, cursor);
        if (remaining >= request.minutes) {
          best = { date: cursor, remaining };
          break;
        }
        if (!best || remaining > best.remaining) {
          best = { date: cursor, remaining };
        }
      }
      cursor = addDays(cursor, 1);
    }

    if (!best) {
      cursor = addDays(from, 1);
      while (!isWeekend(cursor)) {
        cursor = addDays(cursor, 1);
      }
      best = { date: cursor, remaining: this.freeMinutes(request, cursor) };
    }

    return {
      strategy: this.name,
      label: this.label,
      targetDate: new Date(best.date.getTime()),
      minutes: request.minutes,
      description: `Move ${request.minutes} minutes to ${dateKey(best.date)} (${best.remaining} minutes left that day).`,
    };
  }

  private freeMinutes(request: RescheduleRequest, date: Date): number {
    return CapacityCalculator.remainingForDate(
      request.availability,
      date,
      request.bookedMinutes.get(dateKey(date)) ?? 0,
    );
  }
}
