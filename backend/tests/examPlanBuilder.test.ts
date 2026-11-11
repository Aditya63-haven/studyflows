import { AvailabilityWindow } from '../src/domain/entities/AvailabilityWindow';
import { DayAvailability } from '../src/domain/entities/DayAvailability';
import { StudentAvailability } from '../src/domain/entities/StudentAvailability';
import { Topic } from '../src/domain/entities/Topic';
import { ValidationError } from '../src/errors';
import { dateKey } from '../src/domain/base/helpers';
import { ExamPlanBuilder } from '../src/patterns/builder/ExamPlanBuilder';

const now = new Date('2026-03-01T10:00:00.000Z');

const firstTopic = new Topic({
  id: 'topic-1',
  name: 'Arrays',
  estimatedMinutes: 45,
});

const secondTopic = new Topic({
  id: 'topic-2',
  name: 'Trees',
  estimatedMinutes: 45,
});

const thirdTopic = new Topic({
  id: 'topic-3',
  name: 'Graphs',
  estimatedMinutes: 45,
});

describe('ExamPlanBuilder', () => {
  it('builds a day-by-day plan and respects daily capacity', () => {
    const plan = new ExamPlanBuilder()
      .setName('Final Exam')
      .setOwnerId('user-1')
      .setExamDate(new Date('2026-03-03T12:00:00.000Z'))
      .setDailyStudyHours(1)
      .addTopic(firstTopic)
      .addTopic(secondTopic)
      .build(now);

    expect(plan.getName()).toBe('Final Exam');
    expect(plan.getTopics()).toHaveLength(2);
    expect(plan.getStudyDays()).toHaveLength(2);
    expect(plan.getStudyDays()[0].getTopicIds()).toEqual(['topic-1']);
    expect(plan.getStudyDays()[1].getTopicIds()).toEqual(['topic-2']);
    expect(plan.getProgress()).toBe(0);
  });

  it('updates progress when a topic is completed', () => {
    const plan = new ExamPlanBuilder()
      .setName('Final Exam')
      .setOwnerId('user-1')
      .setExamDate(new Date('2026-03-03T12:00:00.000Z'))
      .setDailyStudyHours(2)
      .setTopics([firstTopic, secondTopic])
      .build(now);

    expect(plan.markTopicComplete('topic-1')).toBe(true);
    expect(plan.getProgress()).toBe(50);
  });

  it('rejects missing required fields', () => {
    expect(() => new ExamPlanBuilder().setOwnerId('user-1').build(now)).toThrow(
      'Exam plan name is required',
    );
    expect(() => new ExamPlanBuilder().setName('Final Exam').build(now)).toThrow(
      'Exam plan ownerId is required',
    );
    expect(() =>
      new ExamPlanBuilder().setName('Final Exam').setOwnerId('user-1').build(now),
    ).toThrow('Exam date is required');
  });

  it('rejects an exam date in the past', () => {
    expect(() =>
      new ExamPlanBuilder()
        .setName('Past Exam')
        .setOwnerId('user-1')
        .setExamDate(new Date('2026-02-28T12:00:00.000Z'))
        .build(now),
    ).toThrow(ValidationError);
  });

  it('caps study days at the availability budget and skips unavailable days', () => {
    // Local-time Sunday 2026-03-01; the exam is Thursday 2026-03-05.
    const sunday = new Date(2026, 2, 1, 10);
    const availability = new StudentAvailability({ userId: 'user-1' });
    availability.setDay(new DayAvailability({ weekday: 6, budgetMinutes: 120, available: false }));
    availability.setDay(new DayAvailability({ weekday: 0, budgetMinutes: 50 }));

    const plan = new ExamPlanBuilder()
      .setName('Final Exam')
      .setOwnerId('user-1')
      .setExamDate(new Date(2026, 2, 5, 12))
      .setDailyStudyHours(2)
      .setAvailability(availability)
      .setTopics([firstTopic, secondTopic, thirdTopic])
      .build(sunday);

    const days = plan.getStudyDays();
    // Sunday is unavailable, so planning starts Monday with a 50-minute cap
    // (one 45-minute topic), then Tuesday holds the rest at the default cap.
    expect(days).toHaveLength(2);
    expect(dateKey(days[0].getDate())).toBe(dateKey(new Date(2026, 2, 2)));
    expect(days[0].getTopicIds()).toEqual(['topic-1']);
    expect(days[0].getPlannedMinutes()).toBe(45);
    expect(dateKey(days[1].getDate())).toBe(dateKey(new Date(2026, 2, 3)));
    expect(days[1].getTopicIds()).toEqual(['topic-2', 'topic-3']);
    expect(days[1].getPlannedMinutes()).toBe(90);
  });

  it('never plans more than the daily study hours allow', () => {
    const sunday = new Date(2026, 2, 1, 10);
    const availability = StudentAvailability.defaultFor('user-1');
    availability.setDay(
      new DayAvailability({
        weekday: 0,
        mode: 'budget-windows',
        budgetMinutes: 300,
        windows: [new AvailabilityWindow({ startMinutes: 540, endMinutes: 660 })],
      }),
    );

    const plan = new ExamPlanBuilder()
      .setName('Final Exam')
      .setOwnerId('user-1')
      .setExamDate(new Date(2026, 2, 3, 12))
      .setDailyStudyHours(1)
      .setAvailability(availability)
      .setTopics([firstTopic, secondTopic, thirdTopic])
      .build(sunday);

    // Capacity is min(60 base, 300 availability) = 60 minutes per day, so
    // only one 45-minute topic fits per day.
    expect(plan.getStudyDays()).toHaveLength(3);
    expect(plan.getStudyDays()[0].getTopicIds()).toEqual(['topic-1']);
    expect(plan.getStudyDays()[0].getPlannedMinutes()).toBe(45);
    expect(plan.getStudyDays()[2].getTopicIds()).toEqual(['topic-3']);
  });
});
