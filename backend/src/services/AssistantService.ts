import { NotFoundError } from '../errors';
import { ExamPlan } from '../domain/entities/ExamPlan';
import {
  AICommandPlanSummary,
  IAIProvider,
} from '../domain/interfaces/IAIProvider';
import { RescheduleStrategyName } from '../domain/interfaces/IRescheduleStrategy';
import { AppliedChange, AttentionSuggestionView } from './AttentionService';
import { AttentionService } from './AttentionService';
import { ExamPlanRepository } from '../repositories/ExamPlanRepository';

export interface AssistantProposal {
  understood: boolean;
  action: 'move-work' | 'none';
  response: string;
  planId: string | null;
  planName: string | null;
  strategy: RescheduleStrategyName | null;
  suggestion: AttentionSuggestionView | null;
  needsConfirmation: boolean;
}

/**
 * Natural-language study assistant.
 *
 * OOP: Adapter (client) - delegates language parsing to the injected
 * IAIProvider, so MockAIProvider and ExternalAIProvider are interchangeable.
 * OOP: Facade - combines AI interpretation with the attention reschedule flow.
 */
export class AssistantService {
  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly planRepository: ExamPlanRepository,
    private readonly attentionService: AttentionService,
  ) {}

  /**
   * Parses a command and returns a proposal the user must confirm before any
   * change is applied.
   */
  public async propose(
    userId: string,
    text: string,
    now: Date = new Date(),
  ): Promise<AssistantProposal> {
    const plans = await this.planRepository.findByOwner(userId);
    const summaries: AICommandPlanSummary[] = plans.map((plan) => ({
      id: plan.getId(),
      name: plan.getName(),
      examDate: plan.getExamDate(),
      incompleteTopics: plan.getIncompleteTopicIds().length,
      missedMinutes: plan
        .getMissedWork(now)
        .reduce((total, work) => total + work.minutes, 0),
    }));

    const interpretation = await this.aiProvider.interpretCommand({
      text,
      plans: summaries,
    });

    if (
      !interpretation.understood ||
      interpretation.action !== 'move-work' ||
      !interpretation.planId ||
      !interpretation.strategy
    ) {
      return {
        understood: interpretation.understood,
        action: 'none',
        response: interpretation.response,
        planId: null,
        planName: null,
        strategy: null,
        suggestion: null,
        needsConfirmation: false,
      };
    }

    const plan = plans.find((candidate) => candidate.getId() === interpretation.planId);
    if (!plan) {
      throw new NotFoundError('Exam plan not found');
    }

    const suggestion = await this.attentionService.previewMove(
      userId,
      plan,
      interpretation.strategy,
      now,
    );

    return {
      understood: true,
      action: 'move-work',
      response: interpretation.response,
      planId: plan.getId(),
      planName: plan.getName(),
      strategy: interpretation.strategy,
      suggestion,
      needsConfirmation: true,
    };
  }

  /**
   * Applies a confirmed proposal. The strategy and plan are re-resolved
   * server-side, so nothing from the client is trusted.
   */
  public async apply(
    userId: string,
    planId: string,
    strategy: RescheduleStrategyName,
    now: Date = new Date(),
  ): Promise<{ plan: ExamPlan; applied: AppliedChange }> {
    return this.attentionService.applyToPlan(userId, planId, strategy, now);
  }
}
