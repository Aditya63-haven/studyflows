import { RevisionSchedule } from '../src/domain/entities/RevisionSchedule';
import { QuizCompletedEvent } from '../src/patterns/observer/events';
import { EventBus } from '../src/patterns/observer/EventBus';
import { SM2Strategy } from '../src/patterns/strategy/SM2Strategy';
import { QuizAttemptRepository } from '../src/repositories/QuizAttemptRepository';
import { QuizRepository } from '../src/repositories/QuizRepository';
import { RevisionScheduleRepository } from '../src/repositories/RevisionScheduleRepository';
import { StudySessionRepository } from '../src/repositories/StudySessionRepository';
import { AnalyticsService } from '../src/services/AnalyticsService';
import { RevisionService } from '../src/services/RevisionService';

const event: QuizCompletedEvent = {
  type: 'quiz.completed',
  occurredAt: new Date('2026-04-01T12:00:00.000Z'),
  attemptId: 'attempt-1',
  quizId: 'quiz-1',
  quizTitle: 'Data Structures Quiz',
  spaceId: 'space-1',
  userId: 'user-1',
  score: 8,
  maxScore: 10,
  percentage: 82,
};

describe('EventBus observer flow', () => {
  it('notifies AnalyticsService and RevisionService on quiz completion', async () => {
    const findByUserAndTopic = jest.fn().mockResolvedValue(null);
    const create = jest.fn(async (schedule: RevisionSchedule) => schedule);
    const revisionRepository = {
      findByUserAndTopic,
      create,
    } as unknown as RevisionScheduleRepository;

    const revisionService = new RevisionService(revisionRepository, new SM2Strategy());
    const analyticsService = new AnalyticsService(
      {} as StudySessionRepository,
      {} as QuizAttemptRepository,
      {} as RevisionScheduleRepository,
      {} as QuizRepository,
    );
    const analyticsUpdate = jest.spyOn(analyticsService, 'update');
    const revisionUpdate = jest.spyOn(revisionService, 'update');

    const eventBus = new EventBus();
    eventBus.subscribe('quiz.completed', analyticsService);
    eventBus.subscribe('quiz.completed', revisionService);

    expect(eventBus.getObserverCount('quiz.completed')).toBe(2);

    await eventBus.publish(event);

    expect(analyticsUpdate).toHaveBeenCalledWith(event);
    expect(revisionUpdate).toHaveBeenCalledWith(event);
    expect(findByUserAndTopic).toHaveBeenCalledWith('user-1', 'quiz-1');
    expect(create).toHaveBeenCalledTimes(1);

    const savedSchedule = create.mock.calls[0][0];
    expect(savedSchedule).toBeInstanceOf(RevisionSchedule);
    expect(savedSchedule.getTopicId()).toBe('quiz-1');
    expect(savedSchedule.getTopicName()).toBe('Data Structures Quiz');
    expect(savedSchedule.getReviewCount()).toBe(1);
    expect(savedSchedule.getMemoryStrength()).toBe(97);
  });

  it('supports unsubscribing observers', async () => {
    const eventBus = new EventBus();
    const update = jest.fn();
    const observer = { update };

    eventBus.subscribe('quiz.completed', observer);
    eventBus.unsubscribe('quiz.completed', observer);
    await eventBus.publish(event);

    expect(eventBus.getObserverCount('quiz.completed')).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });
});
