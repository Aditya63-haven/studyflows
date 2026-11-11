import { ForbiddenError, NotFoundError } from '../errors';
import { Notification } from '../domain/entities/Notification';
import { IObserver } from '../domain/interfaces/IObserver';
import { dateKey } from '../domain/base/helpers';
import { DomainEvent } from '../patterns/observer/events';
import { NotificationRepository } from '../repositories/NotificationRepository';

/**
 * Stores notifications triggered by domain events.
 *
 * OOP: Observer - subscribes to SessionMissed, ExamApproaching, RevisionDue and
 * QuizCompleted events without the publishers knowing about persistence.
 * OOP: SRP - only notification storage and read state, nothing else.
 */
export class NotificationService implements IObserver<DomainEvent> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  public async update(event: DomainEvent): Promise<void> {
    const draft = this.toNotification(event);
    if (!draft) {
      return;
    }

    const dedupeKey = draft.getDedupeKey();
    if (dedupeKey) {
      const existing = await this.notificationRepository.findByOwnerAndDedupeKey(
        draft.getUserId(),
        dedupeKey,
      );
      if (existing.length > 0) {
        return;
      }
    }

    await this.notificationRepository.create(draft);
  }

  public async list(userId: string): Promise<Notification[]> {
    const notifications = await this.notificationRepository.findByOwner(userId);
    return notifications.sort(
      (left, right) => right.getCreatedAt().getTime() - left.getCreatedAt().getTime(),
    );
  }

  public async unreadCount(userId: string): Promise<number> {
    const notifications = await this.notificationRepository.findByOwner(userId);
    return notifications.filter((notification) => !notification.isRead()).length;
  }

  public async markRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    if (notification.getUserId() !== userId) {
      throw new ForbiddenError('You do not own this notification');
    }

    notification.markRead();
    const updated = await this.notificationRepository.update(notificationId, notification);
    if (!updated) {
      throw new NotFoundError('Notification not found');
    }
    return updated;
  }

  private toNotification(event: DomainEvent): Notification | null {
    switch (event.type) {
      case 'quiz.completed':
        return new Notification({
          userId: event.userId,
          type: event.type,
          title: `Quiz completed: ${event.quizTitle}`,
          message: `You scored ${event.score}/${event.maxScore} (${event.percentage}%).`,
        });
      case 'session.missed':
        return new Notification({
          userId: event.userId,
          type: event.type,
          title: 'Missed study session',
          message: `${event.planName}: ${event.topicCount} topic${
            event.topicCount === 1 ? '' : 's'
          } with ${event.missedMinutes} minutes of planned work were not finished on ${dateKey(
            event.date,
          )}.`,
          dedupeKey: `session.missed:${event.planId}:${event.dayId}`,
        });
      case 'exam.approaching':
        return new Notification({
          userId: event.userId,
          type: event.type,
          title: `${event.planName} exam is approaching`,
          message: `Only ${event.daysRemaining} day${
            event.daysRemaining === 1 ? '' : 's'
          } left with ${event.incompleteTopics} topic${
            event.incompleteTopics === 1 ? '' : 's'
          } still to finish.`,
          dedupeKey: `exam.approaching:${event.planId}:${dateKey(event.occurredAt)}`,
        });
      case 'revision.due':
        return new Notification({
          userId: event.userId,
          type: event.type,
          title: 'Revision due',
          message: `"${event.topicName}" is due for review.`,
          dedupeKey: `revision.due:${event.scheduleId}:${dateKey(event.nextReviewAt)}`,
        });
      default:
        return null;
    }
  }
}
