import { ForbiddenError, NotFoundError, ValidationError } from '../errors';
import { ExamPlan } from '../domain/entities/ExamPlan';
import { Topic } from '../domain/entities/Topic';
import { ExamPlanBuilder } from '../patterns/builder/ExamPlanBuilder';
import { AvailabilityRepository } from '../repositories/AvailabilityRepository';
import { ExamPlanRepository } from '../repositories/ExamPlanRepository';

export interface ExamTopicInput {
  name: string;
  description?: string;
  estimatedMinutes?: number;
}

export interface CreateExamPlanInput {
  name: string;
  examDate: Date;
  dailyStudyHours: number;
  topics: ExamTopicInput[];
}

export interface UpdateExamPlanInput {
  name?: string;
  examDate?: Date;
  dailyStudyHours?: number;
}

/**
 * Exam plan use cases.
 *
 * OOP: Builder - ExamPlanBuilder constructs the day-by-day schedule.
 * OOP: Composition - StudyDays are replaced when the plan is rescheduled.
 * OOP: DIP - planning respects availability through an injected repository.
 */
export class ExamPlanService {
  constructor(
    private readonly planRepository: ExamPlanRepository,
    private readonly availabilityRepository: AvailabilityRepository,
  ) {}

  public list(ownerId: string): Promise<ExamPlan[]> {
    return this.planRepository.findByOwner(ownerId);
  }

  public async create(ownerId: string, input: CreateExamPlanInput): Promise<ExamPlan> {
    if (input.topics.length === 0) {
      throw new ValidationError('At least one topic is required');
    }

    const builder = new ExamPlanBuilder()
      .setOwnerId(ownerId)
      .setName(input.name)
      .setExamDate(input.examDate)
      .setDailyStudyHours(input.dailyStudyHours);

    const availability = await this.availabilityRepository.findByOwner(ownerId);
    if (availability) {
      builder.setAvailability(availability);
    }

    for (const topic of input.topics) {
      builder.addTopic(
        new Topic({
          name: topic.name,
          description: topic.description,
          estimatedMinutes: topic.estimatedMinutes,
        }),
      );
    }

    return this.planRepository.create(builder.build());
  }

  public async getOwned(ownerId: string, planId: string): Promise<ExamPlan> {
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundError('Exam plan not found');
    }
    if (plan.getOwnerId() !== ownerId) {
      throw new ForbiddenError('You do not own this exam plan');
    }
    return plan;
  }

  public async update(
    ownerId: string,
    planId: string,
    input: UpdateExamPlanInput,
  ): Promise<ExamPlan> {
    const plan = await this.getOwned(ownerId, planId);
    const needsReschedule =
      input.examDate !== undefined || input.dailyStudyHours !== undefined;

    if (needsReschedule) {
      const completedTopicIds = new Set(
        plan.getStudyDays().flatMap((day) => day.getCompletedTopicIds()),
      );
      const builder = new ExamPlanBuilder()
        .setOwnerId(plan.getOwnerId())
        .setName(input.name ?? plan.getName())
        .setExamDate(input.examDate ?? plan.getExamDate())
        .setDailyStudyHours(input.dailyStudyHours ?? plan.getDailyStudyHours())
        .setTopics(plan.getTopics());

      const availability = await this.availabilityRepository.findByOwner(plan.getOwnerId());
      if (availability) {
        builder.setAvailability(availability);
      }

      const rebuilt = builder.build();

      const updated = new ExamPlan({
        id: plan.getId(),
        name: rebuilt.getName(),
        ownerId: plan.getOwnerId(),
        examDate: rebuilt.getExamDate(),
        dailyStudyHours: rebuilt.getDailyStudyHours(),
        topics: rebuilt.getTopics(),
        studyDays: rebuilt.getStudyDays(),
        spaceId: plan.getSpaceId(),
        documentIds: plan.getDocumentIds(),
        preparation: null,
        createdAt: plan.getCreatedAt(),
      });

      for (const topicId of completedTopicIds) {
        updated.markTopicComplete(topicId);
      }
      return this.save(planId, updated);
    }

    if (input.name !== undefined) {
      plan.setName(input.name);
    }
    return this.save(planId, plan);
  }

  public async persistPrepared(
    ownerId: string,
    planId: string,
    plan: ExamPlan,
  ): Promise<ExamPlan> {
    const owned = await this.getOwned(ownerId, planId);
    if (owned.getId() !== plan.getId()) {
      throw new ValidationError('Prepared plan does not match the requested exam plan');
    }
    return this.save(planId, plan);
  }

  public async delete(ownerId: string, planId: string): Promise<void> {
    await this.getOwned(ownerId, planId);
    const deleted = await this.planRepository.delete(planId);
    if (!deleted) {
      throw new NotFoundError('Exam plan not found');
    }
  }

  public async markTopicComplete(
    ownerId: string,
    planId: string,
    topicId: string,
    dayId?: string,
  ): Promise<ExamPlan> {
    const plan = await this.getOwned(ownerId, planId);
    if (!plan.getTopics().some((topic) => topic.getId() === topicId)) {
      throw new NotFoundError('Topic not found in this exam plan');
    }

    plan.markTopicComplete(topicId, dayId);
    return this.save(planId, plan);
  }

  private async save(planId: string, plan: ExamPlan): Promise<ExamPlan> {
    const updated = await this.planRepository.update(planId, plan);
    if (!updated) {
      throw new NotFoundError('Exam plan not found');
    }
    return updated;
  }
}
