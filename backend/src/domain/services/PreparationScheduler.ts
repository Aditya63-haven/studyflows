import { addDays, dateKey, startOfDay } from '../base/helpers';
import { StudentAvailability } from '../entities/StudentAvailability';
import { CapacityCalculator } from './CapacityCalculator';

export interface PreparationSchedulerTopic {
  topicId: string;
  estimatedMinutes: number;
  /** Lower values are scheduled first. */
  priority: number;
}

export interface PreparationSchedulerInput {
  topics: PreparationSchedulerTopic[];
  availability: StudentAvailability;
  dailyStudyHours: number;
  examDate: Date;
  now: Date;
  committedMinutesByDate?: Map<string, number>;
}

export interface ScheduledPreparationDay {
  date: Date;
  topicIds: string[];
  plannedMinutes: number;
}

export interface PreparationScheduleResult {
  days: ScheduledPreparationDay[];
  requiredMinutes: number;
  availableMinutes: number;
  scheduledMinutes: number;
  shortfallMinutes: number;
  unscheduledTopicIds: string[];
  warnings: string[];
}

/**
 * Deterministic calendar materialiser for exam preparation.
 *
 * OOP: SRP - converts an approved topic order into non-overlapping study days.
 * OOP: Strategy - AI may suggest an order, but this class owns all capacity and
 * date decisions so a provider can never invent calendar records.
 */
export class PreparationScheduler {
  public static build(input: PreparationSchedulerInput): PreparationScheduleResult {
    const start = startOfDay(input.now);
    const examDay = startOfDay(input.examDate);
    const baseCapacityMinutes = Math.max(1, Math.round(input.dailyStudyHours * 60));
    const commitments = input.committedMinutesByDate ?? new Map<string, number>();

    const topics = input.topics
      .map((topic) => ({
        ...topic,
        estimatedMinutes: Math.max(1, Math.round(topic.estimatedMinutes)),
      }))
      .sort((left, right) => {
        const priorityDifference = left.priority - right.priority;
        return priorityDifference !== 0
          ? priorityDifference
          : left.topicId.localeCompare(right.topicId);
      });

    const requiredMinutes = topics.reduce(
      (total, topic) => total + topic.estimatedMinutes,
      0,
    );

    if (examDay.getTime() < start.getTime()) {
      return {
        days: [],
        requiredMinutes,
        availableMinutes: 0,
        scheduledMinutes: 0,
        shortfallMinutes: requiredMinutes,
        unscheduledTopicIds: topics.map((topic) => topic.topicId),
        warnings: [
          'The exam date has already passed, so no preparation days can be scheduled.',
        ],
      };
    }

    const remainingByTopic = new Map(
      topics.map((topic) => [topic.topicId, topic.estimatedMinutes]),
    );
    const days: ScheduledPreparationDay[] = [];
    let availableMinutes = 0;
    let scheduledMinutes = 0;
    let cursor = new Date(start.getTime());

    while (cursor.getTime() <= examDay.getTime() && scheduledMinutes < requiredMinutes) {
      const capacity = Math.min(
        baseCapacityMinutes,
        CapacityCalculator.forDate(input.availability, cursor).totalMinutes,
      );
      const committed = commitments.get(dateKey(cursor)) ?? 0;
      const effectiveMinutes = Math.max(0, capacity - Math.max(0, committed));
      availableMinutes += effectiveMinutes;

      const topicIds: string[] = [];
      let remainingCapacity = effectiveMinutes;
      let plannedMinutes = 0;

      while (remainingCapacity > 0) {
        const topic = topics.find(
          (candidate) => (remainingByTopic.get(candidate.topicId) ?? 0) > 0,
        );
        if (!topic) {
          break;
        }

        const owed = remainingByTopic.get(topic.topicId) ?? 0;
        const allocated = Math.min(owed, remainingCapacity);
        if (allocated <= 0) {
          break;
        }

        if (!topicIds.includes(topic.topicId)) {
          topicIds.push(topic.topicId);
        }
        remainingByTopic.set(topic.topicId, owed - allocated);
        remainingCapacity -= allocated;
        plannedMinutes += allocated;
        scheduledMinutes += allocated;
      }

      if (plannedMinutes > 0) {
        days.push({
          date: new Date(cursor.getTime()),
          topicIds,
          plannedMinutes,
        });
      }

      cursor = addDays(cursor, 1);
    }

    const unscheduledTopicIds = topics
      .filter((topic) => (remainingByTopic.get(topic.topicId) ?? 0) > 0)
      .map((topic) => topic.topicId);
    const shortfallMinutes = Math.max(0, requiredMinutes - scheduledMinutes);
    const warnings: string[] = [];

    if (shortfallMinutes > 0) {
      warnings.push(
        `The proposed plan schedules ${scheduledMinutes} of ${requiredMinutes} required minutes; ${shortfallMinutes} minute(s) do not fit before the exam.`,
      );
    }
    if (requiredMinutes > 0 && days.length === 0) {
      warnings.push(
        'No study capacity is available before the exam. Adjust availability or add more hours per day.',
      );
    }

    return {
      days,
      requiredMinutes,
      availableMinutes,
      scheduledMinutes,
      shortfallMinutes,
      unscheduledTopicIds,
      warnings,
    };
  }
}
