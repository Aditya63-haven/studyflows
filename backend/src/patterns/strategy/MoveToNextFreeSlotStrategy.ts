import { addDays, dateKey, startOfDay } from '../../domain/base/helpers';
import {
  IRescheduleStrategy,
  RescheduleRequest,
  RescheduleSuggestion,
} from '../../domain/interfaces/IRescheduleStrategy';
import { CapacityCalculator } from '../../domain/services/CapacityCalculator';

/**
 * Suggests the earliest upcoming day with enough free capacity.
 *
 * OOP: Strategy - one of two interchangeable reschedule behaviours.
 * OOP: Polymorphism - used through the IRescheduleStrategy interface.
 */
export class MoveToNextFreeSlotStrategy implements IRescheduleStrategy {
  public readonly name = 'next-free-slot' as const;
  public readonly label = 'Move to the next free slot';

  public propose(request: RescheduleRequest): RescheduleSuggestion {
    const from = startOfDay(request.fromDate);
    const exam = startOfDay(request.examDate);

    let best: { date: Date; remaining: number } | null = null;
    let cursor = addDays(from, 1);

    while (cursor.getTime() <= exam.getTime()) {
      const remaining = this.freeMinutes(request, cursor);
      if (remaining >= request.minutes) {
        best = { date: cursor, remaining };
        break;
      }
      if (!best || remaining > best.remaining) {
        best = { date: cursor, remaining };
      }
      cursor = addDays(cursor, 1);
    }

    if (!best) {
      best = { date: addDays(from, 1), remaining: 0 };
    }

    return {
      strategy: this.name,
      label: this.label,
      targetDate: new Date(best.date.getTime()),
      minutes: request.minutes,
      description: `Move ${request.minutes} minutes to ${dateKey(best.date)}, the next day with free capacity (${best.remaining} minutes left that day).`,
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
