import { dateKey } from '../src/domain/base/helpers';
import { DayAvailability } from '../src/domain/entities/DayAvailability';
import { StudentAvailability } from '../src/domain/entities/StudentAvailability';
import { PreparationScheduler } from '../src/domain/services/PreparationScheduler';

const monday = new Date(2026, 2, 2, 9);
const availability = () => StudentAvailability.defaultFor('user-1');

describe('PreparationScheduler', () => {
  it('splits a large topic across days without overbooking', () => {
    const result = PreparationScheduler.build({
      topics: [
        { topicId: 'topic-1', estimatedMinutes: 90, priority: 0 },
        { topicId: 'topic-2', estimatedMinutes: 30, priority: 1 },
      ],
      availability: availability(),
      dailyStudyHours: 1,
      examDate: new Date(2026, 2, 5, 12),
      now: monday,
    });

    expect(result.requiredMinutes).toBe(120);
    expect(result.scheduledMinutes).toBe(120);
    expect(result.shortfallMinutes).toBe(0);
    expect(result.days).toHaveLength(2);
    expect(result.days[0]).toMatchObject({
      topicIds: ['topic-1'],
      plannedMinutes: 60,
    });
    expect(result.days[1]).toMatchObject({
      topicIds: ['topic-1', 'topic-2'],
      plannedMinutes: 60,
    });
    expect(dateKey(result.days[0].date)).toBe(dateKey(monday));
  });

  it('subtracts existing commitments and reports a shortfall', () => {
    const commitments = new Map<string, number>([[dateKey(monday), 50]]);
    const result = PreparationScheduler.build({
      topics: [
        { topicId: 'topic-1', estimatedMinutes: 40, priority: 0 },
        { topicId: 'topic-2', estimatedMinutes: 40, priority: 1 },
      ],
      availability: availability(),
      dailyStudyHours: 1,
      examDate: new Date(2026, 2, 3, 12),
      now: monday,
      committedMinutesByDate: commitments,
    });

    expect(result.scheduledMinutes).toBe(70);
    expect(result.shortfallMinutes).toBe(10);
    expect(result.unscheduledTopicIds).toEqual(['topic-2']);
    expect(result.warnings.join(' ')).toContain('do not fit before the exam');
  });

  it('skips unavailable days and plans on the next available date', () => {
    const sunday = new Date(2026, 2, 1, 10);
    const weekly = availability();
    weekly.setDay(
      new DayAvailability({ weekday: 6, budgetMinutes: 0, available: false }),
    );

    const result = PreparationScheduler.build({
      topics: [{ topicId: 'topic-1', estimatedMinutes: 60, priority: 0 }],
      availability: weekly,
      dailyStudyHours: 2,
      examDate: new Date(2026, 2, 2, 12),
      now: sunday,
    });

    expect(result.days).toHaveLength(1);
    expect(dateKey(result.days[0].date)).toBe(dateKey(new Date(2026, 2, 2)));
    expect(result.days[0].plannedMinutes).toBe(60);
  });

  it('does not invent days when the exam date has passed', () => {
    const result = PreparationScheduler.build({
      topics: [{ topicId: 'topic-1', estimatedMinutes: 30, priority: 0 }],
      availability: availability(),
      dailyStudyHours: 1,
      examDate: new Date(2026, 1, 28, 12),
      now: monday,
    });

    expect(result.days).toHaveLength(0);
    expect(result.availableMinutes).toBe(0);
    expect(result.shortfallMinutes).toBe(30);
    expect(result.unscheduledTopicIds).toEqual(['topic-1']);
    expect(result.warnings[0]).toContain('already passed');
  });
});
