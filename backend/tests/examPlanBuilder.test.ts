import { Topic } from '../src/domain/entities/Topic';
import { ValidationError } from '../src/errors';
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
});
