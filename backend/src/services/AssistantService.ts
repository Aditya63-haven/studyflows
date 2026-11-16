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
import {
  PerformanceAnalysisService,
  PerformanceFilters,
  RevisionRecommendation,
} from './PerformanceAnalysisService';
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
  documentIds?: string[];
  history: AIConversationMessage[];
}

export interface AssistantCitation {
  id: string;
  title: string;
}

export interface AssistantDocumentCitation {
  id: string;
  documentId: string;
  title: string;
  pageNumber: number | null;
  section: string | null;
  excerpt: string;
}

export interface AssistantPerformanceFocus {
  topicId: string;
  topicName: string;
  accuracy: number | null;
  answeredQuestions: number;
  evidence: string[];
}

export interface AssistantPerformanceSuggestion {
  title: string;
  reason: string;
  topicId: string | null;
  topicName: string | null;
}

export interface AssistantPerformanceResponse {
  provider: string;
  generatedAt: Date;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  trendInterpretation: string;
  focusTopics: AssistantPerformanceFocus[];
  practiceSuggestions: AssistantPerformanceSuggestion[];
  recommendations: RevisionRecommendation[];
  dataQuality: {
    reliable: boolean;
    attemptCount: number;
    answeredQuestions: number;
    insufficientData: string[];
    limitations: string[];
  };
}

export interface AssistantChatResponse {
  answer: string;
  provider: string;
  citations: AssistantCitation[];
  documentCitations: AssistantDocumentCitation[];
  usedExternalKnowledge: boolean;
  noteCount: number;
  documentCount: number;
}

/**
 * Natural-language study assistant.
 *
 * OOP: Adapter (client) - delegates language parsing to the injected
 * IAIProvider, so configured provider implementations are interchangeable.
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
    private readonly performanceAnalysisService: PerformanceAnalysisService,
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
      input.documentIds,
      input.message,
    );
    const result = await this.aiProvider.chat({
      message: input.message,
      mode: input.mode,
      spaceName: context.spaceName,
      spaceSubject: context.spaceSubject,
      notes: context.notes,
      documents: context.documents,
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

    const documentCitations: AssistantDocumentCitation[] = [];
    const documentsById = new Map(
      context.documents.map((document) => [document.id, document]),
    );
    for (const chunkId of new Set(result.citedChunkIds ?? [])) {
      for (const [documentId, document] of documentsById) {
        const chunk = document.chunks.find((candidate) => candidate.id === chunkId);
        if (!chunk) {
          continue;
        }
        documentCitations.push({
          id: chunk.id,
          documentId,
          title: document.title,
          pageNumber: chunk.pageNumber,
          section: chunk.section,
          excerpt: chunk.text.slice(0, 240),
        });
        break;
      }
    }

    return {
      answer: result.answer,
      provider: this.aiProvider.name,
      citations,
      documentCitations,
      usedExternalKnowledge: result.usedExternalKnowledge,
      noteCount: context.notes.length,
      documentCount: context.documents.length,
    };
  }


  /**
   * Interprets deterministic performance analysis with the configured AI
   * provider. AI focus ids are grounded against server-side topic data.
   */
  public async analyzePerformance(
    userId: string,
    filters: PerformanceFilters = {},
    now: Date = new Date(),
  ): Promise<AssistantPerformanceResponse> {
    await this.aiAccessService.assertAccess(userId);
    this.rateLimiter.consume(userId);

    const report = await this.performanceAnalysisService.analyze(userId, filters, now);
    const interpretation = await this.aiProvider.interpretPerformance(
      this.performanceAnalysisService.buildAIInput(report),
    );

    const weakTopicsById = new Map(
      report.analysis.weakTopics.map((topic) => [topic.topicId, topic]),
    );
    const focusTopicIds = [
      ...new Set(
        interpretation.focusTopicIds.filter((topicId) => weakTopicsById.has(topicId)),
      ),
    ].slice(0, 3);
    const focusTopics: AssistantPerformanceFocus[] = focusTopicIds.map((topicId) => {
      const topic = weakTopicsById.get(topicId)!;
      return {
        topicId,
        topicName: topic.topicName,
        accuracy: topic.accuracy,
        answeredQuestions: topic.answeredQuestions,
        evidence: topic.evidence,
      };
    });

    const seenSuggestions = new Set<string>();
    const practiceSuggestions: AssistantPerformanceSuggestion[] = [];
    for (const suggestion of interpretation.practiceSuggestions) {
      const title = suggestion.title.trim();
      const reason = suggestion.reason.trim();
      if (!title || !reason) {
        continue;
      }
      if (suggestion.topicId !== null && !weakTopicsById.has(suggestion.topicId)) {
        continue;
      }
      const dedupeKey = title.toLowerCase();
      if (seenSuggestions.has(dedupeKey)) {
        continue;
      }
      seenSuggestions.add(dedupeKey);
      const topic = suggestion.topicId
        ? weakTopicsById.get(suggestion.topicId)
        : undefined;
      practiceSuggestions.push({
        title,
        reason,
        topicId: topic?.topicId ?? null,
        topicName: topic?.topicName ?? null,
      });
      if (practiceSuggestions.length >= 3) {
        break;
      }
    }

    return {
      provider: this.aiProvider.name,
      generatedAt: report.analysis.generatedAt,
      summary: interpretation.summary.trim(),
      strengths: interpretation.strengths.slice(0, 3),
      improvementAreas: interpretation.improvementAreas.slice(0, 3),
      trendInterpretation: interpretation.trendInterpretation.trim(),
      focusTopics,
      practiceSuggestions,
      recommendations: report.recommendations,
      dataQuality: {
        reliable: report.analysis.dataQuality.reliable,
        attemptCount: report.analysis.dataQuality.attemptCount,
        answeredQuestions: report.analysis.dataQuality.answeredQuestions,
        insufficientData: report.analysis.dataQuality.insufficientData,
        limitations: report.analysis.dataQuality.limitations,
      },
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
