import { Notification } from '../src/domain/entities/Notification';
import { ForbiddenError, NotFoundError } from '../src/errors';
import {
  DomainEvent,
  ExamApproachingEvent,
  QuizCompletedEvent,
  RevisionDueEvent,
  SessionMissedEvent,
} from '../src/patterns/observer/events';
import { EventBus } from '../src/patterns/observer/EventBus';
import { NotificationRepository } from '../src/repositories/NotificationRepository';
import { NotificationService } from '../src/services/NotificationService';

/**
 * In-memory stand-in for the Mongoose repository so the observer flow can be
 * tested without a database.
 */
class FakeNotificationRepository {
  private notifications: Notification[] = [];

  public async create(notification: Notification): Promise<Notification> {
    this.notifications.push(notification);
    return notification;
  }

  public async findById(id: string): Promise<Notification | null> {
    return this.notifications.find((notification) => notification.getId() === id) ?? null;
  }

  public async update(id: string, notification: Notification): Promise<Notification | null> {
    const index = this.notifications.findIndex((entry) => entry.getId() === id);
    if (index === -1) {
      return null;
    }
    this.notifications[index] = notification;
    return notification;
  }

  public async findByOwner(ownerId: string): Promise<Notification[]> {
    return this.notifications.filter((notification) => notification.getUserId() === ownerId);
  }

  public async findByOwnerAndDedupeKey(
    ownerId: string,
    dedupeKey: string,
  ): Promise<Notification[]> {
    return this.notifications.filter(
      (notification) =>
        notification.getUserId() === ownerId && notification.getDedupeKey() === dedupeKey,
    );
  }
}

const missedSession: SessionMissedEvent = {
  type: 'session.missed',
  occurredAt: new Date('2026-03-03T20:00:00.000Z'),
  userId: 'user-1',
  planId: 'plan-1',
  planName: 'Final Exam',
  dayId: 'day-1',
  date: new Date('2026-03-02T10:00:00.000Z'),
  topicCount: 2,
  missedMinutes: 90,
};

const examApproaching: ExamApproachingEvent = {
  type: 'exam.approaching',
  occurredAt: new Date('2026-03-03T20:00:00.000Z'),
  userId: 'user-1',
  planId: 'plan-1',
  planName: 'Final Exam',
  examDate: new Date('2026-03-10T09:00:00.000Z'),
  daysRemaining: 7,
  incompleteTopics: 4,
};

const revisionDue: RevisionDueEvent = {
  type: 'revision.due',
  occurredAt: new Date('2026-03-03T20:00:00.000Z'),
  userId: 'user-1',
  scheduleId: 'schedule-1',
  topicId: 'topic-1',
  topicName: 'Arrays',
  nextReviewAt: new Date('2026-03-04T08:00:00.000Z'),
};

const quizCompleted: QuizCompletedEvent = {
  type: 'quiz.completed',
  occurredAt: new Date('2026-03-03T20:00:00.000Z'),
  attemptId: 'attempt-1',
  quizId: 'quiz-1',
  quizTitle: 'Data Structures Quiz',
  spaceId: 'space-1',
  userId: 'user-1',
  score: 8,
  maxScore: 10,
  percentage: 80,
};

describe('NotificationService observer flow', () => {
  it('stores a notification for every supported event type', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    await service.update(missedSession);
    await service.update(examApproaching);
    await service.update(revisionDue);
    await service.update(quizCompleted);

    const notifications = await service.list('user-1');
    expect(notifications).toHaveLength(4);
    expect(notifications.map((notification) => notification.getType())).toEqual(
      expect.arrayContaining([
        'session.missed',
        'exam.approaching',
        'revision.due',
        'quiz.completed',
      ]),
    );
  });

  it('formats titles and messages from the event payloads', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    const stored = await service.update(missedSession).then(() => service.list('user-1'));

    expect(stored[0].getTitle()).toBe('Missed study session');
    expect(stored[0].getMessage()).toContain('Final Exam');
    expect(stored[0].getMessage()).toContain('90 minutes');
  });

  it('skips duplicate events using the dedupe key', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    await service.update(missedSession);
    await service.update(missedSession);

    const notifications = await service.list('user-1');
    expect(notifications).toHaveLength(1);
  });

  it('keeps notifications without a dedupe key, such as quiz completions', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    await service.update(quizCompleted);
    await service.update(quizCompleted);

    expect((await service.list('user-1'))).toHaveLength(2);
  });

  it('marks notifications read and counts unread ones', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    await service.update(missedSession);
    await service.update(examApproaching);

    expect(await service.unreadCount('user-1')).toBe(2);

    const stored = await service.list('user-1');
    const read = await service.markRead('user-1', stored[0].getId());

    expect(read.isRead()).toBe(true);
    expect(await service.unreadCount('user-1')).toBe(1);
  });

  it('rejects marking foreign or missing notifications', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    await service.update(missedSession);

    await expect(service.markRead('user-2', (await service.list('user-1'))[0].getId())).rejects.toThrow(
      ForbiddenError,
    );
    await expect(service.markRead('user-1', 'missing')).rejects.toThrow(NotFoundError);
  });

  it('works end to end through the EventBus', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository as unknown as NotificationRepository);

    const eventBus = new EventBus();
    eventBus.subscribe('session.missed', service);
    eventBus.subscribe('exam.approaching', service);
    eventBus.subscribe('revision.due', service);
    eventBus.subscribe('quiz.completed', service);

    const events: DomainEvent[] = [missedSession, examApproaching, revisionDue, quizCompleted];
    for (const event of events) {
      await eventBus.publish(event);
    }

    expect(eventBus.getObserverCount('session.missed')).toBe(1);
    expect(await service.unreadCount('user-1')).toBe(4);
  });
});
