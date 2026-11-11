import { StudentAvailability } from '../entities/StudentAvailability';

export type RescheduleStrategyName = 'next-free-slot' | 'weekend';

export type RescheduleReason = 'missed-session' | 'exam-approaching';

export interface RescheduleRequest {
  userId: string;
  planId: string;
  planName: string;
  reason: RescheduleReason;
  /** Day the work was originally planned on (or today for plan-wide moves). */
  fromDate: Date;
  /** Planned minutes that need a new home. */
  minutes: number;
  examDate: Date;
  availability: StudentAvailability;
  /** Already planned minutes per calendar day (YYYY-MM-DD -> minutes). */
  bookedMinutes: Map<string, number>;
}

export interface RescheduleSuggestion {
  strategy: RescheduleStrategyName;
  label: string;
  targetDate: Date;
  minutes: number;
  description: string;
}

/**
 * Abstraction for rescheduling unfinished study work.
 *
 * OOP: Abstraction - attention and assistant features depend only on this
 * interface, never on a concrete strategy.
 * OOP: Strategy - implementations can be swapped at runtime.
 */
export interface IRescheduleStrategy {
  readonly name: RescheduleStrategyName;
  readonly label: string;
  propose(request: RescheduleRequest): RescheduleSuggestion;
}
