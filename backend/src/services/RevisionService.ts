import { ForbiddenError, NotFoundError } from '../errors';
import { RevisionSchedule, RevisionStatus } from '../domain/entities/RevisionSchedule';
import {
  IRevisionStrategy,
  ReviewRating,
} from '../domain/interfaces/IRevisionStrategy';
import { IObserver } from '../domain/interfaces/IObserver';
import { DomainEvent, QuizCompletedEvent } from '../patterns/observer/events';
import { RevisionScheduleRepository } from '../repositories/RevisionScheduleRepository';

export interface AddRecommendedRevisionInput {
  topicId: string;
  topicName: string;
  memoryStrength?: number;
  nextReviewAt?: Date;
}

export interface RevisionDashboard {
  dueToday: RevisionSchedule[];
  needsRevision: RevisionSchedule[];
  mastered: RevisionSchedule[];
  scheduled: RevisionSchedule[];
  counts: {
    total: number;
    due: number;
    needsRevision: number;
    mastered: number;
  };
}

/**
 * Spaced repetition use cases.
 *
 * OOP: Observer - reacts to quiz completion events.
 * OOP: Strategy - delegates scheduling math to an injected IRevisionStrategy.
 */
export class RevisionService implements IObserver<DomainEvent> {
  constructor(
    private readonly scheduleRepository: RevisionScheduleRepository,
    private readonly strategy: IRevisionStrategy,
  ) {}

  public async update(event: DomainEvent): Promise<void> {
    if (event.type !== 'quiz.completed') {
      return;
    }
    await this.handleQuizCompleted(event);
  }

  public list(userId: string): Promise<RevisionSchedule[]> {
    return this.scheduleRepository.findByUser(userId);
  }

  public async dashboard(userId: string, now: Date = new Date()): Promise<RevisionDashboard> {
    const schedules = await this.scheduleRepository.findByUser(userId);
    const byStatus = (status: RevisionStatus): RevisionSchedule[] =>
      schedules.filter((schedule) => schedule.getStatus(now) === status);

    const dueToday = byStatus('due');
    const needsRevision = byStatus('needs_revision');
    const mastered = byStatus('mastered');
    const scheduled = byStatus('scheduled');

    return {
      dueToday,
      needsRevision,
      mastered,
      scheduled,
      counts: {
        total: schedules.length,
        due: dueToday.length,
        needsRevision: needsRevision.length,
        mastered: mastered.length,
      },
    };
  }

  /**
   * Adds a user-approved revision activity. Existing schedules are returned
   * unchanged so recommendations cannot create duplicate tasks.
   */
  public async addRecommendedTopic(
    userId: string,
    input: AddRecommendedRevisionInput,
    now: Date = new Date(),
  ): Promise<{ schedule: RevisionSchedule; created: boolean }> {
    const existing = await this.scheduleRepository.findByUserAndTopic(
      userId,
      input.topicId,
    );
    if (existing) {
      return { schedule: existing, created: false };
    }

    const schedule = new RevisionSchedule({
      userId,
      topicId: input.topicId,
      topicName: input.topicName,
      memoryStrength: input.memoryStrength ?? 0,
      easeFactor: 2.5,
      intervalDays: 0,
      reviewCount: 0,
      lastReviewedAt: null,
      nextReviewAt: input.nextReviewAt ?? now,
    });
    return { schedule: await this.scheduleRepository.create(schedule), created: true };
  }

  public async review(
    userId: string,
    scheduleId: string,
    rating: ReviewRating,
    now: Date = new Date(),
  ): Promise<RevisionSchedule> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundError('Revision schedule not found');
    }
    if (schedule.getUserId() !== userId) {
      throw new ForbiddenError('You do not own this revision schedule');
    }

    const result = this.strategy.calculateNextReview(schedule.toReviewState(), rating, now);
    schedule.applyReview(result);

    const updated = await this.scheduleRepository.update(scheduleId, schedule);
    if (!updated) {
      throw new NotFoundError('Revision schedule not found');
    }
    return updated;
  }

  private async handleQuizCompleted(event: QuizCompletedEvent): Promise<void> {
    const existing = await this.scheduleRepository.findByUserAndTopic(
      event.userId,
      event.quizId,
    );
    const rating = this.ratingForPercentage(event.percentage);
    const state = existing
      ? existing.toReviewState()
      : {
          memoryStrength: event.percentage,
          easeFactor: 2.5,
          intervalDays: 0,
          reviewCount: 0,
          lastReviewedAt: null,
        };
    const result = this.strategy.calculateNextReview(state, rating, event.occurredAt);

    if (existing) {
      existing.setTopicName(event.quizTitle);
      existing.applyReview(result);
      await this.scheduleRepository.update(existing.getId(), existing);
      return;
    }

    const schedule = new RevisionSchedule({
      userId: event.userId,
      topicId: event.quizId,
      topicName: event.quizTitle,
      memoryStrength: result.memoryStrength,
      easeFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      reviewCount: result.reviewCount,
      lastReviewedAt: result.lastReviewedAt,
      nextReviewAt: result.nextReviewAt,
    });
    await this.scheduleRepository.create(schedule);
  }

  private ratingForPercentage(percentage: number): ReviewRating {
    if (percentage >= 85) {
      return 'easy';
    }
    if (percentage >= 70) {
      return 'good';
    }
    if (percentage >= 50) {
      return 'hard';
    }
    return 'again';
  }
}
