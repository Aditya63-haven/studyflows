import { Config } from '../config/Config';
import { NotFoundError } from '../errors';
import { ExamPlan } from '../domain/entities/ExamPlan';
import {
  AIAnswerMode,
  AIConversationMessage,
  AICommandPlanSummary,
  IAIProvider,
} from '../domain/interfaces/IAIProvider';
import { RescheduleStrategyName } from '../domain/interfaces/IRescheduleStrategy';
import { AppliedChange, AttentionSuggestionView } from './AttentionService';
import { AttentionService } from './AttentionService';
import { AiAccessService } from './AiAccessService';
import { AiRateLimiter } from './AiRateLimiter';
import { AssistantContextBuilder } from './AssistantContextBuilder';
import { ExamPlanRepository } from '../repositories/ExamPlanRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';

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

export interface AssistantChatInput {
  message: string;
  mode: AIAnswerMode;
  spaceId?: string | null;
  noteIds?: string[];
  history: AIConversationMessage[];
}

export interface AssistantCitation {
  id: string;
  title: string;
}

export interface AssistantChatResponse {
  answer: string;
  provider: string;
  citations: AssistantCitation[];
  usedExternalKnowledge: boolean;
  noteCount: number;
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
    private readonly spaceRepository: StudySpaceRepository,
    private readonly attentionService: AttentionService,
    private readonly aiAccessService: AiAccessService,
    private readonly contextBuilder: AssistantContextBuilder,
    private readonly rateLimiter: AiRateLimiter,
    private readonly config: Config,
  ) {}

  /**
   * Answers a study question using only the selected, owned notes as grounded
   * context.
   */
  public async chat(
    userId: string,
    input: AssistantChatInput,
  ): Promise<AssistantChatResponse> {
    await this.aiAccessService.assertAccess(userId);
    this.rateLimiter.consume(userId);

    const context = await this.contextBuilder.build(
      userId,
      input.spaceId,
      input.noteIds,
    );
    const result = await this.aiProvider.chat({
      message: input.message,
      mode: input.mode,
      spaceName: context.spaceName,
      spaceSubject: context.spaceSubject,
      notes: context.notes,
      history: input.history.slice(-this.config.aiMaxHistoryMessages),
    });

    const notesById = new Map(context.notes.map((note) => [note.id, note]));
    const citations: AssistantCitation[] = [];
    for (const noteId of new Set(result.citedNoteIds)) {
      const note = notesById.get(noteId);
      if (note) {
        citations.push({ id: note.id, title: note.title });
      }
    }

    return {
      answer: result.answer,
      provider: this.aiProvider.name,
      citations,
      usedExternalKnowledge: result.usedExternalKnowledge,
      noteCount: context.notes.length,
    };
  }

  /**
   * Parses a command and returns a proposal the user must confirm before any
   * change is applied.
   */
  public async propose(
    userId: string,
    text: string,
    now: Date = new Date(),
  ): Promise<AssistantProposal> {
    await this.aiAccessService.assertAccess(userId);
    this.rateLimiter.consume(userId);

    const [plans, spaces] = await Promise.all([
      this.planRepository.findByOwner(userId),
      this.spaceRepository.findByOwner(userId),
    ]);
    const subjects = [
      ...new Set(spaces.flatMap((space) => [space.getName(), space.getSubject()])),
    ];
    const summaries: AICommandPlanSummary[] = plans.map((plan) => ({
      id: plan.getId(),
      name: plan.getName(),
      examDate: plan.getExamDate(),
      incompleteTopics: plan.getIncompleteTopicIds().length,
      missedMinutes: plan
        .getMissedWork(now)
        .reduce((total, work) => total + work.minutes, 0),
      keywords: [
        plan.getName(),
        ...plan.getTopics().map((topic) => topic.getName()),
      ],
    }));

    const interpretation = await this.aiProvider.interpretCommand({
      text,
      plans: summaries,
      subjects,
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
