import { ForbiddenError, NotFoundError, ValidationError } from '../errors';
import { ExamPlan, MissedDayWork } from '../domain/entities/ExamPlan';
import { StudentAvailability } from '../domain/entities/StudentAvailability';
import { dateKey, startOfDay } from '../domain/base/helpers';
import {
  IRescheduleStrategy,
  RescheduleReason,
  RescheduleRequest,
  RescheduleSuggestion,
  RescheduleStrategyName,
} from '../domain/interfaces/IRescheduleStrategy';
import { EventBus } from '../patterns/observer/EventBus';
import { AvailabilityRepository } from '../repositories/AvailabilityRepository';
import { ExamPlanRepository } from '../repositories/ExamPlanRepository';
import { RevisionScheduleRepository } from '../repositories/RevisionScheduleRepository';

const EXAM_WARNING_DAYS = 7;
const MAX_MISSED_ITEMS_PER_PLAN = 3;

export interface AttentionSuggestionView {
  strategy: RescheduleStrategyName;
  label: string;
  description: string;
  targetDate: Date;
  minutes: number;
}

export interface AttentionItem {
  id: string;
  type: 'missed-session' | 'exam-approaching';
  title: string;
  description: string;
  planId: string;
  planName: string;
  date: Date | null;
  topicCount: number;
  minutes: number;
  suggestions: AttentionSuggestionView[];
}

export interface AttentionReport {
  items: AttentionItem[];
  generatedAt: Date;
}

export interface AppliedChange {
  itemId: string;
  strategy: RescheduleStrategyName;
  targetDate: Date;
  minutes: number;
  movedTopicIds: string[];
}

/**
 * Detects missed sessions and approaching exams, publishes the matching
 * domain events and applies reschedule strategies.
 *
 * OOP: Observer (publisher) - emits SessionMissed, ExamApproaching and
 * RevisionDue events through the EventBus.
 * OOP: Strategy - delegates rescheduling to injected IRescheduleStrategy
 * implementations chosen at runtime.
 * OOP: SRP - detection and adjustment of study plans only.
 */
export class AttentionService {
  constructor(
    private readonly planRepository: ExamPlanRepository,
    private readonly revisionRepository: RevisionScheduleRepository,
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly strategies: Record<
      RescheduleStrategyName,
      IRescheduleStrategy
    >,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Publishes events for everything that currently needs attention.
   */
  public async publishDetectedEvents(userId: string, now: Date = new Date()): Promise<void> {
    const plans = await this.planRepository.findByOwner(userId);

    for (const plan of plans) {
      for (const missed of plan.getMissedWork(now)) {
        await this.eventBus.publish({
          type: 'session.missed',
          occurredAt: now,
          userId,
          planId: plan.getId(),
          planName: plan.getName(),
          dayId: missed.dayId,
          date: missed.date,
          topicCount: missed.topicIds.length,
          missedMinutes: missed.minutes,
        });
      }

      const daysRemaining = plan.getDaysRemaining(now);
      const incompleteTopics = plan.getIncompleteTopicIds().length;
      if (daysRemaining <= EXAM_WARNING_DAYS && incompleteTopics > 0) {
        await this.eventBus.publish({
          type: 'exam.approaching',
          occurredAt: now,
          userId,
          planId: plan.getId(),
          planName: plan.getName(),
          examDate: plan.getExamDate(),
          daysRemaining,
          incompleteTopics,
        });
      }
    }

    const schedules = await this.revisionRepository.findByUser(userId);
    for (const schedule of schedules.filter((entry) => entry.isDue(now))) {
      await this.eventBus.publish({
        type: 'revision.due',
        occurredAt: now,
        userId,
        scheduleId: schedule.getId(),
        topicId: schedule.getTopicId(),
        topicName: schedule.getTopicName(),
        nextReviewAt: schedule.getNextReviewAt(),
      });
    }
  }

  /**
   * Builds the "needs attention" report and publishes detected events first so
   * notifications stay in sync with what the user sees.
   */
  public async report(userId: string, now: Date = new Date()): Promise<AttentionReport> {
    await this.publishDetectedEvents(userId, now);

    const [plans, availability] = await Promise.all([
      this.planRepository.findByOwner(userId),
      this.getAvailability(userId),
    ]);

    const items: AttentionItem[] = [];

    for (const plan of plans) {
      const missedDays = [...plan.getMissedWork(now)]
        .sort((left, right) => right.date.getTime() - left.date.getTime())
        .slice(0, MAX_MISSED_ITEMS_PER_PLAN);

      for (const missed of missedDays) {
        items.push(this.buildMissedItem(plan, missed, availability));
      }

      const daysRemaining = plan.getDaysRemaining(now);
      const incompleteTopics = plan.getIncompleteTopicIds().length;
      if (daysRemaining <= EXAM_WARNING_DAYS && incompleteTopics > 0) {
        items.push(this.buildExamItem(plan, availability, now, daysRemaining, incompleteTopics));
      }
    }

    return { items, generatedAt: now };
  }

  /**
   * Applies a reschedule strategy to one attention item and returns the
   * updated plan.
   */
  public async apply(
    userId: string,
    itemId: string,
    strategyName: RescheduleStrategyName,
    now: Date = new Date(),
  ): Promise<{ plan: ExamPlan; applied: AppliedChange }> {
    const [kind, planId, dayId] = itemId.split(':');

    if (kind === 'missed' && planId && dayId) {
      return this.applyMissedDay(userId, planId, dayId, strategyName);
    }
    if (kind === 'exam' && planId) {
      return this.applyToPlan(userId, planId, strategyName, now);
    }

    throw new ValidationError('Unknown attention item');
  }

  /**
   * Moves all unfinished work of a plan using the chosen strategy. Used by the
   * exam-approaching item and the study assistant.
   */
  public async applyToPlan(
    userId: string,
    planId: string,
    strategyName: RescheduleStrategyName,
    now: Date = new Date(),
  ): Promise<{ plan: ExamPlan; applied: AppliedChange }> {
    const plan = await this.getOwnedPlan(userId, planId);
    const scope = plan.getPendingWork(now);
    if (scope.length === 0) {
      throw new ValidationError(`No unfinished work to move in "${plan.getName()}"`);
    }

    const minutes = scope.reduce((total, work) => total + work.minutes, 0);
    const strategy = this.resolveStrategy(strategyName);
    const request = this.buildRequest(
      userId,
      plan,
      'exam-approaching',
      startOfDay(now),
      minutes,
      await this.getAvailability(userId),
    );
    const suggestion = strategy.propose(request);

    const movedTopicIds: string[] = [];
    for (const work of scope) {
      plan.moveTopics(work.dayId, suggestion.targetDate, work.topicIds);
      movedTopicIds.push(...work.topicIds);
    }

    const updated = await this.savePlan(plan);
    return {
      plan: updated,
      applied: {
        itemId: `exam:${planId}`,
        strategy: strategyName,
        targetDate: suggestion.targetDate,
        minutes,
        movedTopicIds,
      },
    };
  }

  /**
   * Previews what a strategy would suggest for a plan without changing it.
   */
  public async previewMove(
    userId: string,
    plan: ExamPlan,
    strategyName: RescheduleStrategyName,
    now: Date = new Date(),
  ): Promise<AttentionSuggestionView> {
    const scope = plan.getPendingWork(now);
    const minutes = scope.reduce((total, work) => total + work.minutes, 0);
    const strategy = this.resolveStrategy(strategyName);
    const request = this.buildRequest(
      userId,
      plan,
      'exam-approaching',
      startOfDay(now),
      minutes,
      await this.getAvailability(userId),
    );
    const suggestion = strategy.propose(request);
    return {
      strategy: suggestion.strategy,
      label: suggestion.label,
      description: suggestion.description,
      targetDate: suggestion.targetDate,
      minutes: suggestion.minutes,
    };
  }

  private async applyMissedDay(
    userId: string,
    planId: string,
    dayId: string,
    strategyName: RescheduleStrategyName,
  ): Promise<{ plan: ExamPlan; applied: AppliedChange }> {
    const plan = await this.getOwnedPlan(userId, planId);
    const day = plan.getStudyDays().find((candidate) => candidate.getId() === dayId);
    if (!day) {
      throw new ValidationError('Study day not found in this exam plan');
    }

    const topicIds = day.getIncompleteTopicIds();
    if (topicIds.length === 0) {
      throw new ValidationError('Nothing left to move from this day');
    }

    const minutes = plan
      .getTopics()
      .filter((topic) => topicIds.includes(topic.getId()))
      .reduce((total, topic) => total + topic.getEstimatedMinutes(), 0);

    const strategy = this.resolveStrategy(strategyName);
    const request = this.buildRequest(
      userId,
      plan,
      'missed-session',
      day.getDate(),
      minutes,
      await this.getAvailability(userId),
    );
    const suggestion = strategy.propose(request);

    plan.moveTopics(dayId, suggestion.targetDate, topicIds);
    const updated = await this.savePlan(plan);

    return {
      plan: updated,
      applied: {
        itemId: `missed:${planId}:${dayId}`,
        strategy: strategyName,
        targetDate: suggestion.targetDate,
        minutes,
        movedTopicIds: [...topicIds],
      },
    };
  }

  private buildMissedItem(
    plan: ExamPlan,
    missed: MissedDayWork,
    availability: StudentAvailability,
  ): AttentionItem {
    const request = this.buildRequest(
      plan.getOwnerId(),
      plan,
      'missed-session',
      missed.date,
      missed.minutes,
      availability,
    );

    return {
      id: `missed:${plan.getId()}:${missed.dayId}`,
      type: 'missed-session',
      title: `${plan.getName()} missed a study day`,
      description: `${missed.topicIds.length} topic${
        missed.topicIds.length === 1 ? '' : 's'
      } (${missed.minutes} minutes) planned for ${dateKey(missed.date)} were not finished.`,
      planId: plan.getId(),
      planName: plan.getName(),
      date: missed.date,
      topicCount: missed.topicIds.length,
      minutes: missed.minutes,
      suggestions: this.proposeAll(request),
    };
  }

  private buildExamItem(
    plan: ExamPlan,
    availability: StudentAvailability,
    now: Date,
    daysRemaining: number,
    incompleteTopics: number,
  ): AttentionItem {
    const scope = plan.getPendingWork(now);
    const minutes = scope.reduce((total, work) => total + work.minutes, 0);
    const request = this.buildRequest(
      plan.getOwnerId(),
      plan,
      'exam-approaching',
      startOfDay(now),
      minutes,
      availability,
    );

    return {
      id: `exam:${plan.getId()}`,
      type: 'exam-approaching',
      title: `${plan.getName()} exam is approaching`,
      description: `The exam is in ${daysRemaining} day${
        daysRemaining === 1 ? '' : 's'
      } and ${incompleteTopics} topic${
        incompleteTopics === 1 ? '' : 's'
      } (${minutes} minutes) still need work.`,
      planId: plan.getId(),
      planName: plan.getName(),
      date: plan.getExamDate(),
      topicCount: incompleteTopics,
      minutes,
      suggestions: this.proposeAll(request),
    };
  }

  private proposeAll(request: RescheduleRequest): AttentionSuggestionView[] {
    return Object.values(this.strategies).map((strategy) => {
      const suggestion: RescheduleSuggestion = strategy.propose(request);
      return {
        strategy: suggestion.strategy,
        label: suggestion.label,
        description: suggestion.description,
        targetDate: suggestion.targetDate,
        minutes: suggestion.minutes,
      };
    });
  }

  private buildRequest(
    userId: string,
    plan: ExamPlan,
    reason: RescheduleReason,
    fromDate: Date,
    minutes: number,
    availability: StudentAvailability,
  ): RescheduleRequest {
    const bookedMinutes = new Map<string, number>();
    for (const day of plan.getStudyDays()) {
      const key = dateKey(day.getDate());
      bookedMinutes.set(key, (bookedMinutes.get(key) ?? 0) + day.getPlannedMinutes());
    }

    return {
      userId,
      planId: plan.getId(),
      planName: plan.getName(),
      reason,
      fromDate,
      minutes,
      examDate: plan.getExamDate(),
      availability,
      bookedMinutes,
    };
  }

  private resolveStrategy(strategyName: RescheduleStrategyName): IRescheduleStrategy {
    const strategy = this.strategies[strategyName];
    if (!strategy) {
      throw new ValidationError(`Unknown reschedule strategy: ${strategyName}`);
    }
    return strategy;
  }

  private async getAvailability(userId: string): Promise<StudentAvailability> {
    const stored = await this.availabilityRepository.findByOwner(userId);
    return stored ?? StudentAvailability.defaultFor(userId);
  }

  private async getOwnedPlan(userId: string, planId: string): Promise<ExamPlan> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundError('Exam plan not found');
    }
    if (plan.getOwnerId() !== userId) {
      throw new ForbiddenError('You do not own this exam plan');
    }
    return plan;
  }

  private async savePlan(plan: ExamPlan): Promise<ExamPlan> {
    const updated = await this.planRepository.update(plan.getId(), plan);
    if (!updated) {
      throw new NotFoundError('Exam plan not found');
    }
    return updated;
  }
}
