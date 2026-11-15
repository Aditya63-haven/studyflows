import { createHash } from 'crypto';
import { AppError, ConflictError, ValidationError } from '../errors';
import {
  dateKey,
  startOfDay,
  uniqueIds,
} from '../domain/base/helpers';
import { DocumentChunk } from '../domain/entities/DocumentChunk';
import { ExamPlan } from '../domain/entities/ExamPlan';
import { RevisionSchedule } from '../domain/entities/RevisionSchedule';
import { StudentAvailability } from '../domain/entities/StudentAvailability';
import { StudyDay } from '../domain/entities/StudyDay';
import { StudyDocument } from '../domain/entities/StudyDocument';
import { StudySpace } from '../domain/entities/StudySpace';
import { Topic } from '../domain/entities/Topic';
import {
  AIExamPreparationInput,
  AIExamPreparationInterpretation,
  IAIProvider,
} from '../domain/interfaces/IAIProvider';
import { CapacityCalculator } from '../domain/services/CapacityCalculator';
import {
  PreparationScheduleResult,
  PreparationScheduler,
} from '../domain/services/PreparationScheduler';
import { AvailabilityRepository } from '../repositories/AvailabilityRepository';
import { DocumentChunkRepository } from '../repositories/DocumentChunkRepository';
import { ExamPlanRepository } from '../repositories/ExamPlanRepository';
import { RevisionScheduleRepository } from '../repositories/RevisionScheduleRepository';
import { StudySessionRepository } from '../repositories/StudySessionRepository';
import { AiAccessService } from './AiAccessService';
import { AiRateLimiter } from './AiRateLimiter';
import { DocumentService } from './DocumentService';
import { ExamPlanService } from './ExamPlanService';
import { PerformanceAnalysisService } from './PerformanceAnalysisService';
import {
  PerformanceAnalysis,
  TopicPerformance,
} from './PerformanceAnalysisService';
import { StudySpaceService } from './StudySpaceService';

const MAX_DOCUMENTS = 20;
const MAX_SOURCE_CHUNKS = 160;
const MAX_AI_SOURCE_CHUNKS = 40;
const MAX_TOPIC_SOURCES = 3;
const MATCH_THRESHOLD = 0.5;
const STOP_WORDS = new Set([
  'and',
  'are',
  'for',
  'from',
  'into',
  'its',
  'not',
  'the',
  'with',
]);

export type PreparationTopicStatus =
  | 'completed'
  | 'weak'
  | 'due'
  | 'needs_revision'
  | 'insufficient'
  | 'strong'
  | 'neutral'
  | 'mastered'
  | 'not_started';

export interface PreparationSourceView {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number | null;
  section: string | null;
  excerpt: string;
}

export interface PreparationDocumentView {
  id: string;
  title: string;
  format: string;
  chunkCount: number;
  selected: boolean;
}

export interface PreparationTopicView {
  id: string;
  name: string;
  description: string;
  estimatedMinutes: number;
  completed: boolean;
  status: PreparationTopicStatus;
  priorityRank: number;
  evidence: string[];
  performance: {
    accuracy: number | null;
    answeredQuestions: number;
    classification: string;
    trendDirection: string;
    evidence: string[];
  } | null;
  revision: {
    memoryStrength: number;
    status: string;
    nextReviewAt: Date;
  } | null;
  sources: PreparationSourceView[];
}

export interface PreparationDayView {
  date: Date;
  topicIds: string[];
  plannedMinutes: number;
}

export interface PreparationScheduleView {
  days: PreparationDayView[];
  requiredMinutes: number;
  availableMinutes: number;
  scheduledMinutes: number;
  shortfallMinutes: number;
  unscheduledTopicIds: string[];
  warnings: string[];
}

export interface PreparationStrategyItemView {
  topicId: string;
  topicName: string;
  reason: string;
  practiceActivity: string;
  source: 'ai' | 'server';
}

export interface PreparationStrategyView {
  provider: string;
  summary: string;
  items: PreparationStrategyItemView[];
  cautions: string[];
  usedChunkIds: string[];
  fallback: boolean;
  warning: string | null;
}

export interface ExamPreparationOverview {
  planId: string;
  examName: string;
  examDate: Date;
  daysRemaining: number;
  dailyStudyHours: number;
  space: { id: string; name: string; subject: string } | null;
  documents: PreparationDocumentView[];
  selectedDocumentIds: string[];
  topics: PreparationTopicView[];
  topicOrder: string[];
  schedule: PreparationScheduleView;
  availability: { source: 'saved' | 'default'; weeklyMinutes: number };
  dataQuality: {
    reliable: boolean;
    attemptCount: number;
    answeredQuestions: number;
    insufficientData: string[];
    limitations: string[];
  };
  existingPreparation: {
    provider: string;
    strategySummary: string;
    approvedAt: Date;
    approvalFingerprint: string;
    requiredMinutes: number;
    scheduledMinutes: number;
    shortfallMinutes: number;
  } | null;
}

export interface ExamPreparationPreview extends ExamPreparationOverview {
  strategy: PreparationStrategyView;
  conflicts: string[];
  requiresAcknowledgement: boolean;
  approvalFingerprint: string;
}

export interface PreparationSelection {
  spaceId?: string | null;
  documentIds?: string[];
  topicOrder?: string[];
  excludedTopicIds?: string[];
  topicMinutes?: Record<string, number>;
}

export interface ApprovePreparationInput extends PreparationSelection {
  approvalFingerprint: string;
  acknowledgeConflicts?: boolean;
  strategySummary?: string;
  provider?: string;
}

export interface PreparationApprovalResult {
  plan: ExamPlan;
  created: boolean;
  schedule: PreparationScheduleView;
}

interface ResolvedContext {
  plan: ExamPlan;
  space: StudySpace | null;
  documents: StudyDocument[];
  selectedDocuments: StudyDocument[];
  chunks: DocumentChunk[];
  topics: PreparationTopicView[];
  analysis: PerformanceAnalysis;
  availability: StudentAvailability;
  availabilitySource: 'saved' | 'default';
  commitments: Map<string, number>;
}

interface BuiltSchedule {
  schedule: PreparationScheduleView;
  order: string[];
}

interface StrategySource {
  interpretation: AIExamPreparationInterpretation | null;
  warning: string | null;
}

/**
 * End-to-end exam preparation workflow.
 *
 * OOP: Facade - combines document evidence, performance analysis, revision
 * state, availability and AI suggestions behind one use case.
 * OOP: DIP - every dependency is injected through the constructor.
 * OOP: Strategy - AI proposes a sequence, while PreparationScheduler owns every
 * deterministic calendar decision.
 */
export class ExamPreparationService {
  constructor(
    private readonly examPlanService: ExamPlanService,
    private readonly planRepository: ExamPlanRepository,
    private readonly spaceService: StudySpaceService,
    private readonly documentService: DocumentService,
    private readonly chunkRepository: DocumentChunkRepository,
    private readonly sessionRepository: StudySessionRepository,
    private readonly revisionRepository: RevisionScheduleRepository,
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly performanceAnalysisService: PerformanceAnalysisService,
    private readonly aiProvider: IAIProvider,
    private readonly aiAccessService: AiAccessService,
    private readonly rateLimiter: AiRateLimiter,
  ) {}

  public async getOverview(
    userId: string,
    planId: string,
    selection: PreparationSelection = {},
    now: Date = new Date(),
  ): Promise<ExamPreparationOverview> {
    const plan = await this.examPlanService.getOwned(userId, planId);
    const context = await this.loadContext(userId, plan, selection, now);
    const built = this.buildSchedule(context, selection, selection.topicOrder ?? [], now);
    return this.toOverview(context, built, now);
  }

  public async preview(
    userId: string,
    planId: string,
    selection: PreparationSelection = {},
    now: Date = new Date(),
  ): Promise<ExamPreparationPreview> {
    const plan = await this.examPlanService.getOwned(userId, planId);
    const context = await this.loadContext(userId, plan, selection, now);

    await this.aiAccessService.assertAccess(userId);
    this.rateLimiter.consume(userId);
    const source = await this.requestStrategy(context, now);

    const aiOrder =
      selection.topicOrder ??
      source.interpretation?.sequence.map((item) => item.topicId) ??
      [];
    const built = this.buildSchedule(context, selection, aiOrder, now);
    const strategy = this.buildStrategy(context, source, built.order);
    const fingerprint = this.fingerprint(context, built, now);

    return {
      ...this.toOverview(context, built, now),
      strategy,
      conflicts: [...built.schedule.warnings],
      requiresAcknowledgement: built.schedule.shortfallMinutes > 0,
      approvalFingerprint: fingerprint,
    };
  }

  public async approve(
    userId: string,
    planId: string,
    input: ApprovePreparationInput,
    now: Date = new Date(),
  ): Promise<PreparationApprovalResult> {
    const plan = await this.examPlanService.getOwned(userId, planId);
    const context = await this.loadContext(userId, plan, input, now);
    const built = this.buildSchedule(context, input, input.topicOrder ?? [], now);
    const fingerprint = this.fingerprint(context, built, now);

    if (input.approvalFingerprint !== fingerprint) {
      throw new ConflictError(
        'The preparation preview is out of date. Generate a new preview before approving.',
      );
    }

    const existing = plan.getPreparation();
    if (existing?.approvalFingerprint === fingerprint) {
      return {
        plan,
        created: false,
        schedule: built.schedule,
      };
    }

    if (built.schedule.shortfallMinutes > 0 && !input.acknowledgeConflicts) {
      throw new ConflictError(
        `The proposed schedule does not fit before the exam (${built.schedule.shortfallMinutes} minute(s) unscheduled). Review the conflicts and acknowledge them to approve.`,
      );
    }

    const topics = context.plan.getTopics().map((topic) => {
      const estimate = input.topicMinutes?.[topic.getId()];
      return new Topic({
        id: topic.getId(),
        name: topic.getName(),
        description: topic.getDescription(),
        estimatedMinutes: estimate ?? topic.getEstimatedMinutes(),
      });
    });
    const studyDays = this.buildApprovedStudyDays(context.plan, topics, built.schedule, now);

    const updated = new ExamPlan({
      id: plan.getId(),
      name: plan.getName(),
      ownerId: plan.getOwnerId(),
      examDate: plan.getExamDate(),
      dailyStudyHours: plan.getDailyStudyHours(),
      topics,
      studyDays,
      spaceId: context.space?.getId() ?? null,
      documentIds: context.selectedDocuments.map((document) => document.getId()),
      preparation: {
        provider: input.provider?.trim() || 'server',
        strategySummary: input.strategySummary?.trim() || '',
        approvedAt: now,
        approvalFingerprint: fingerprint,
        requiredMinutes: built.schedule.requiredMinutes,
        scheduledMinutes: built.schedule.scheduledMinutes,
        shortfallMinutes: built.schedule.shortfallMinutes,
      },
      createdAt: plan.getCreatedAt(),
    });

    const saved = await this.examPlanService.persistPrepared(userId, planId, updated);
    return {
      plan: saved,
      created: true,
      schedule: built.schedule,
    };
  }

  private async loadContext(
    userId: string,
    plan: ExamPlan,
    selection: PreparationSelection,
    now: Date,
  ): Promise<ResolvedContext> {
    const space = await this.resolveSpace(userId, plan, selection.spaceId);
    const [allDocuments, savedAvailability, schedules] = await Promise.all([
      space ? this.documentService.listBySpace(userId, space.getId()) : Promise.resolve([]),
      this.availabilityRepository.findByOwner(userId),
      this.revisionRepository.findByUser(userId),
    ]);
    const readyDocuments = allDocuments.filter((document) => document.getStatus() === 'ready');
    const selectedDocuments = this.resolveDocuments(
      plan,
      space,
      readyDocuments,
      selection.documentIds,
    );
    const chunks = space
      ? await this.chunkRepository.findByDocuments(
          selectedDocuments.map((document) => document.getId()),
          userId,
          space.getId(),
        )
      : [];

    const report = await this.performanceAnalysisService.analyze(
      userId,
      space ? { spaceId: space.getId() } : {},
      now,
    );
    const analysis = report.analysis;
    const availability = savedAvailability ?? StudentAvailability.defaultFor(userId);
    const availabilitySource = savedAvailability ? 'saved' : 'default';
    const commitments = await this.loadCommitments(userId, plan, now);
    const completedTopicIds = new Set(
      plan.getStudyDays().flatMap((day) => day.getCompletedTopicIds()),
    );
    const topics = this.buildTopicViews(
      plan,
      analysis.topics,
      schedules,
      chunks,
      readyDocuments,
      completedTopicIds,
      now,
    );

    return {
      plan,
      space,
      documents: readyDocuments,
      selectedDocuments,
      chunks: chunks.slice(0, MAX_SOURCE_CHUNKS),
      topics,
      analysis,
      availability,
      availabilitySource,
      commitments,
    };
  }

  private async resolveSpace(
    userId: string,
    plan: ExamPlan,
    requestedSpaceId: string | null | undefined,
  ): Promise<StudySpace | null> {
    const spaceId = requestedSpaceId === undefined ? plan.getSpaceId() : requestedSpaceId;
    if (!spaceId) {
      return null;
    }
    return this.spaceService.getOwned(userId, spaceId);
  }

  private resolveDocuments(
    plan: ExamPlan,
    space: StudySpace | null,
    readyDocuments: StudyDocument[],
    requestedDocumentIds: string[] | undefined,
  ): StudyDocument[] {
    if (!space) {
      if (requestedDocumentIds && requestedDocumentIds.length > 0) {
        throw new ValidationError('Documents can only be selected for a study space');
      }
      return [];
    }

    if (requestedDocumentIds !== undefined) {
      const requested = uniqueIds(requestedDocumentIds);
      if (requested.length > MAX_DOCUMENTS) {
        throw new ValidationError(`Select at most ${MAX_DOCUMENTS} documents`);
      }
      const availableIds = new Set(readyDocuments.map((document) => document.getId()));
      const unknown = requested.filter((documentId) => !availableIds.has(documentId));
      if (unknown.length > 0) {
        throw new ValidationError(
          'One or more selected documents are not processed documents in this study space',
        );
      }
      return readyDocuments.filter((document) => requested.includes(document.getId()));
    }

    const planDocumentIds =
      plan.getSpaceId() === space.getId() ? plan.getDocumentIds() : [];
    const preferred = readyDocuments.filter((document) =>
      planDocumentIds.includes(document.getId()),
    );
    return (preferred.length > 0 ? preferred : readyDocuments).slice(
      0,
      MAX_DOCUMENTS,
    );
  }

  private async loadCommitments(
    userId: string,
    plan: ExamPlan,
    now: Date,
  ): Promise<Map<string, number>> {
    const start = startOfDay(now);
    const examEnd = plan.getExamDate().getTime();
    const [plans, sessions] = await Promise.all([
      this.planRepository.findByOwner(userId),
      this.sessionRepository.findByUserSince(userId, start),
    ]);
    const commitments = new Map<string, number>();

    for (const other of plans) {
      if (other.getId() === plan.getId()) {
        continue;
      }
      for (const day of other.getStudyDays()) {
        const time = day.getDate().getTime();
        if (time < start.getTime() || time > examEnd) {
          continue;
        }
        const key = dateKey(day.getDate());
        commitments.set(key, (commitments.get(key) ?? 0) + day.getPlannedMinutes());
      }
    }

    for (const session of sessions) {
      const startedAt = session.getStartedAt().getTime();
      if (startedAt < start.getTime() || startedAt > examEnd) {
        continue;
      }
      const key = dateKey(session.getStartedAt());
      commitments.set(key, (commitments.get(key) ?? 0) + session.getDurationMinutes());
    }

    return commitments;
  }

  private buildTopicViews(
    plan: ExamPlan,
    performanceTopics: TopicPerformance[],
    schedules: RevisionSchedule[],
    chunks: DocumentChunk[],
    documents: StudyDocument[],
    completedTopicIds: Set<string>,
    now: Date,
  ): PreparationTopicView[] {
    const documentById = new Map(
      documents.map((document) => [document.getId(), document]),
    );

    return plan.getTopics().map((topic) => {
      const completed = completedTopicIds.has(topic.getId());
      const performance = this.findBestMatch(
        topic.getName(),
        performanceTopics,
        (candidate) => candidate.topicName,
      );
      const revision = this.findBestMatch(
        topic.getName(),
        schedules,
        (candidate) => candidate.getTopicName(),
      );
      const sources = this.findTopicSources(topic.getName(), chunks, documentById);

      const status = this.resolveStatus(completed, performance, revision, now);
      const evidence: string[] = [];
      if (completed) {
        evidence.push('Marked complete in this exam plan.');
      }
      if (performance) {
        evidence.push(...performance.evidence);
      }
      if (revision) {
        evidence.push(
          `Revision memory strength is ${revision.getMemoryStrength()}% with status "${revision.getStatus(now)}".`,
        );
      }
      if (sources.length > 0) {
        evidence.push(
          `Source material: ${sources
            .map((source) => this.sourceLabel(documentById.get(source.documentId)))
            .filter(Boolean)
            .join('; ')}.`,
        );
      }
      if (evidence.length === 0) {
        evidence.push('No quiz attempts or revision records match this topic yet.');
      }

      return {
        id: topic.getId(),
        name: topic.getName(),
        description: topic.getDescription(),
        estimatedMinutes: topic.getEstimatedMinutes(),
        completed,
        status,
        priorityRank: this.priorityRank(status),
        evidence: [...new Set(evidence)].slice(0, 6),
        performance: performance
          ? {
              accuracy: performance.accuracy,
              answeredQuestions: performance.answeredQuestions,
              classification: performance.classification,
              trendDirection: performance.trend.direction,
              evidence: [...performance.evidence],
            }
          : null,
        revision: revision
          ? {
              memoryStrength: revision.getMemoryStrength(),
              status: revision.getStatus(now),
              nextReviewAt: revision.getNextReviewAt(),
            }
          : null,
        sources,
      };
    });
  }

  private findTopicSources(
    topicName: string,
    chunks: DocumentChunk[],
    documentById: Map<string, StudyDocument>,
  ): PreparationSourceView[] {
    const topicTokens = this.tokens(topicName);
    if (topicTokens.size === 0) {
      return [];
    }

    return chunks
      .map((chunk) => {
        const document = documentById.get(chunk.getDocumentId());
        const haystack = `${document?.getOriginalName() ?? ''} ${
          chunk.getSection() ?? ''
        } ${chunk.getText()}`;
        const haystackTokens = this.tokens(haystack);
        let matches = 0;
        for (const token of topicTokens) {
          if (haystackTokens.has(token)) {
            matches += 1;
          }
        }
        return {
          chunk,
          score: matches / topicTokens.size,
        };
      })
      .filter((entry) => entry.score >= MATCH_THRESHOLD)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.chunk.getChunkIndex() - right.chunk.getChunkIndex(),
      )
      .slice(0, MAX_TOPIC_SOURCES)
      .map(({ chunk }) => ({
        chunkId: chunk.getId(),
        documentId: chunk.getDocumentId(),
        documentTitle:
          documentById.get(chunk.getDocumentId())?.getOriginalName() ?? 'Document',
        pageNumber: chunk.getPageNumber(),
        section: chunk.getSection(),
        excerpt: this.truncate(chunk.getText(), 240),
      }));
  }

  private buildSchedule(
    context: ResolvedContext,
    selection: PreparationSelection,
    requestedOrder: string[],
    now: Date,
  ): BuiltSchedule {
    const allTopicIds = new Set(context.topics.map((topic) => topic.id));
    const excludedTopicIds = uniqueIds(selection.excludedTopicIds ?? []);
    const unknownExcluded = excludedTopicIds.filter((topicId) => !allTopicIds.has(topicId));
    if (unknownExcluded.length > 0) {
      throw new ValidationError('One or more excluded topics do not belong to this exam plan');
    }
    const unknownOrder = uniqueIds(requestedOrder).filter(
      (topicId) => !allTopicIds.has(topicId),
    );
    if (unknownOrder.length > 0) {
      throw new ValidationError('One or more ordered topics do not belong to this exam plan');
    }
    for (const topicId of Object.keys(selection.topicMinutes ?? {})) {
      if (!allTopicIds.has(topicId)) {
        throw new ValidationError('One or more topic time overrides do not belong to this exam plan');
      }
    }

    const excluded = new Set(excludedTopicIds);
    const remaining = context.topics
      .filter((topic) => !topic.completed && !excluded.has(topic.id))
      .sort(
        (left, right) =>
          left.priorityRank - right.priorityRank || left.id.localeCompare(right.id),
      );
    const remainingById = new Map(remaining.map((topic) => [topic.id, topic]));
    const order: string[] = [];
    const seen = new Set<string>();
    for (const topicId of uniqueIds(requestedOrder)) {
      if (remainingById.has(topicId) && !seen.has(topicId)) {
        seen.add(topicId);
        order.push(topicId);
      }
    }
    for (const topic of remaining) {
      if (!seen.has(topic.id)) {
        seen.add(topic.id);
        order.push(topic.id);
      }
    }

    const schedulerTopics = order.map((topicId, index) => ({
      topicId,
      estimatedMinutes:
        selection.topicMinutes?.[topicId] ??
        remainingById.get(topicId)?.estimatedMinutes ??
        30,
      priority: index,
    }));
    const result = PreparationScheduler.build({
      topics: schedulerTopics,
      availability: context.availability,
      dailyStudyHours: context.plan.getDailyStudyHours(),
      examDate: context.plan.getExamDate(),
      now,
      committedMinutesByDate: context.commitments,
    });

    return {
      schedule: this.toScheduleView(result),
      order,
    };
  }

  private toScheduleView(result: PreparationScheduleResult): PreparationScheduleView {
    return {
      days: result.days.map((day) => ({
        date: new Date(day.date.getTime()),
        topicIds: [...day.topicIds],
        plannedMinutes: day.plannedMinutes,
      })),
      requiredMinutes: result.requiredMinutes,
      availableMinutes: result.availableMinutes,
      scheduledMinutes: result.scheduledMinutes,
      shortfallMinutes: result.shortfallMinutes,
      unscheduledTopicIds: [...result.unscheduledTopicIds],
      warnings: [...result.warnings],
    };
  }

  private async requestStrategy(
    context: ResolvedContext,
    now: Date,
  ): Promise<StrategySource> {
    try {
      const interpretation = await this.aiProvider.planExamPreparation(
        this.buildAIInput(context, now),
      );
      return { interpretation, warning: null };
    } catch (error) {
      return {
        interpretation: null,
        warning:
          error instanceof AppError
            ? error.message
            : 'The AI strategy was unavailable. A deterministic sequence is shown instead.',
      };
    }
  }

  private buildAIInput(
    context: ResolvedContext,
    now: Date,
  ): AIExamPreparationInput {
    const weeklyMinutes = context.availability
      .getDays()
      .reduce(
        (total, day) => total + CapacityCalculator.forDay(day).totalMinutes,
        0,
      );
    const insufficientData = [...context.analysis.dataQuality.insufficientData];
    if (context.selectedDocuments.length === 0) {
      insufficientData.push(
        'No processed source documents are selected, so syllabus evidence is unavailable.',
      );
    }
    if (context.chunks.length === 0) {
      insufficientData.push(
        'The selected documents have no extracted excerpts to ground topic reasons.',
      );
    }
    const limitations = [
      ...context.analysis.dataQuality.limitations,
      'Exam topics are matched to quiz titles and revision topic names because questions do not store curriculum topic tags.',
    ];

    const documentById = new Map(
      context.documents.map((document) => [document.getId(), document]),
    );
    const sourceChunks = this.selectSourceChunks(context).map((chunk) => ({
      chunkId: chunk.getId(),
      documentTitle:
        documentById.get(chunk.getDocumentId())?.getOriginalName() ?? 'Document',
      pageNumber: chunk.getPageNumber(),
      section: chunk.getSection(),
      text: this.truncate(chunk.getText(), 500),
    }));

    return {
      examName: context.plan.getName(),
      examDate: context.plan.getExamDate().toISOString(),
      daysRemaining: context.plan.getDaysRemaining(now),
      subject: context.space?.getSubject() ?? 'General',
      spaceName: context.space?.getName() ?? 'General study',
      dailyStudyHours: context.plan.getDailyStudyHours(),
      availability: {
        weeklyMinutes,
        source: context.availabilitySource,
      },
      dataQuality: {
        reliable: context.analysis.dataQuality.reliable,
        insufficientData: insufficientData.slice(0, 5),
        limitations: limitations.slice(0, 6),
      },
      topics: context.topics.map((topic) => ({
        topicId: topic.id,
        topicName: topic.name,
        estimatedMinutes: topic.estimatedMinutes,
        completed: topic.completed,
        performance: topic.performance
          ? {
              accuracy: topic.performance.accuracy,
              answeredQuestions: topic.performance.answeredQuestions,
              classification: topic.performance.classification,
              trendDirection: topic.performance.trendDirection,
              evidence: topic.performance.evidence.slice(0, 3),
            }
          : null,
        revision: topic.revision
          ? {
              memoryStrength: topic.revision.memoryStrength,
              status: topic.revision.status,
            }
          : null,
      })),
      sourceChunks,
    };
  }

  private selectSourceChunks(context: ResolvedContext): DocumentChunk[] {
    const topicTokens = context.topics.map((topic) => this.tokens(topic.name));
    return [...context.chunks]
      .map((chunk) => {
        const haystackTokens = this.tokens(chunk.getText());
        let score = 0;
        for (const tokens of topicTokens) {
          for (const token of tokens) {
            if (haystackTokens.has(token)) {
              score += 1;
            }
          }
        }
        return { chunk, score };
      })
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.chunk.getDocumentId().localeCompare(right.chunk.getDocumentId()) ||
          left.chunk.getChunkIndex() - right.chunk.getChunkIndex(),
      )
      .slice(0, MAX_AI_SOURCE_CHUNKS)
      .map((entry) => entry.chunk);
  }

  private buildStrategy(
    context: ResolvedContext,
    source: StrategySource,
    order: string[],
  ): PreparationStrategyView {
    const topicById = new Map(context.topics.map((topic) => [topic.id, topic]));
    const included = new Set(order);
    const items: PreparationStrategyItemView[] = [];
    const seen = new Set<string>();

    for (const item of source.interpretation?.sequence ?? []) {
      if (!included.has(item.topicId) || seen.has(item.topicId)) {
        continue;
      }
      seen.add(item.topicId);
      items.push({
        topicId: item.topicId,
        topicName: topicById.get(item.topicId)?.name ?? 'Exam topic',
        reason: this.truncate(item.reason, 300),
        practiceActivity: this.truncate(item.practiceActivity, 240),
        source: 'ai',
      });
    }

    for (const topicId of order) {
      if (seen.has(topicId)) {
        continue;
      }
      seen.add(topicId);
      const topic = topicById.get(topicId);
      if (!topic) {
        continue;
      }
      items.push({
        topicId,
        topicName: topic.name,
        reason:
          topic.evidence[0] ??
          'This topic is ordered by the deterministic priority rules.',
        practiceActivity: `Review ${topic.name} with active recall and finish with practice questions.`,
        source: 'server',
      });
    }

    if (!source.interpretation) {
      return {
        provider: 'deterministic-fallback',
        summary:
          'The AI strategy is unavailable, so this preview follows deterministic server priorities: weak performance and due revision first.',
        items,
        cautions: [],
        usedChunkIds: [],
        fallback: true,
        warning: source.warning,
      };
    }

    return {
      provider: this.aiProvider.name,
      summary: source.interpretation.summary,
      items,
      cautions: [...source.interpretation.cautions],
      usedChunkIds: [...source.interpretation.usedChunkIds],
      fallback: false,
      warning: null,
    };
  }

  private toOverview(
    context: ResolvedContext,
    built: BuiltSchedule,
    now: Date,
  ): ExamPreparationOverview {
    const existing = context.plan.getPreparation();
    return {
      planId: context.plan.getId(),
      examName: context.plan.getName(),
      examDate: context.plan.getExamDate(),
      daysRemaining: context.plan.getDaysRemaining(now),
      dailyStudyHours: context.plan.getDailyStudyHours(),
      space: context.space
        ? {
            id: context.space.getId(),
            name: context.space.getName(),
            subject: context.space.getSubject(),
          }
        : null,
      documents: [
        ...context.selectedDocuments,
        ...context.documents.filter(
          (document) =>
            !context.selectedDocuments.some(
              (selected) => selected.getId() === document.getId(),
            ),
        ),
      ]
        .slice(0, MAX_DOCUMENTS)
        .map((document) => ({
          id: document.getId(),
          title: document.getOriginalName(),
          format: document.getFormat(),
          chunkCount: document.getChunkCount(),
          selected: context.selectedDocuments.some(
            (selected) => selected.getId() === document.getId(),
          ),
        })),
      selectedDocumentIds: context.selectedDocuments.map((document) => document.getId()),
      topics: context.topics.map((topic) => ({
        ...topic,
        evidence: [...topic.evidence],
        sources: topic.sources.map((item) => ({ ...item })),
      })),
      topicOrder: [...built.order],
      schedule: {
        ...built.schedule,
        days: built.schedule.days.map((day) => ({
          ...day,
          date: new Date(day.date.getTime()),
          topicIds: [...day.topicIds],
        })),
      },
      availability: {
        source: context.availabilitySource,
        weeklyMinutes: context.availability
          .getDays()
          .reduce(
            (total, day) => total + CapacityCalculator.forDay(day).totalMinutes,
            0,
          ),
      },
      dataQuality: {
        reliable: context.analysis.dataQuality.reliable,
        attemptCount: context.analysis.dataQuality.attemptCount,
        answeredQuestions: context.analysis.dataQuality.answeredQuestions,
        insufficientData: [...context.analysis.dataQuality.insufficientData],
        limitations: [...context.analysis.dataQuality.limitations],
      },
      existingPreparation: existing
        ? {
            ...existing,
            approvedAt: new Date(existing.approvedAt.getTime()),
          }
        : null,
    };
  }

  private fingerprint(
    context: ResolvedContext,
    built: BuiltSchedule,
    now: Date,
  ): string {
    const payload = {
      planId: context.plan.getId(),
      examDate: dateKey(context.plan.getExamDate()),
      dailyStudyHours: context.plan.getDailyStudyHours(),
      startDate: dateKey(now),
      spaceId: context.space?.getId() ?? null,
      documentIds: context.selectedDocuments
        .map((document) => document.getId())
        .sort(),
      topicOrder: built.order,
      days: built.schedule.days.map((day) => ({
        date: dateKey(day.date),
        topicIds: day.topicIds,
        plannedMinutes: day.plannedMinutes,
      })),
      requiredMinutes: built.schedule.requiredMinutes,
      scheduledMinutes: built.schedule.scheduledMinutes,
      shortfallMinutes: built.schedule.shortfallMinutes,
    };
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private buildApprovedStudyDays(
    plan: ExamPlan,
    topics: Topic[],
    schedule: PreparationScheduleView,
    now: Date,
  ): StudyDay[] {
    const topicMinutes = new Map(
      topics.map((topic) => [topic.getId(), topic.getEstimatedMinutes()]),
    );
    const completedByDate = new Map<
      string,
      { date: Date; topicIds: Set<string> }
    >();
    for (const day of plan.getStudyDays()) {
      const completed = day
        .getCompletedTopicIds()
        .filter((topicId) => topicMinutes.has(topicId));
      if (completed.length === 0) {
        continue;
      }
      const key = dateKey(day.getDate());
      const existing = completedByDate.get(key);
      if (existing) {
        for (const topicId of completed) {
          existing.topicIds.add(topicId);
        }
      } else {
        completedByDate.set(key, {
          date: day.getDate(),
          topicIds: new Set(completed),
        });
      }
    }

    const scheduledByDate = new Map(
      schedule.days.map((day) => [dateKey(day.date), day]),
    );
    const mergedDates = new Set([
      ...completedByDate.keys(),
      ...scheduledByDate.keys(),
    ]);
    const days: StudyDay[] = [];

    for (const key of [...mergedDates].sort()) {
      const completed = completedByDate.get(key);
      const scheduled = scheduledByDate.get(key);
      const date = scheduled?.date ?? completed?.date ?? startOfDay(now);
      const completedTopicIds = [...(completed?.topicIds ?? [])];
      const topicIds = uniqueIds([
        ...completedTopicIds,
        ...(scheduled?.topicIds ?? []),
      ]);
      const plannedMinutes = scheduled
        ? scheduled.plannedMinutes
        : Math.min(
            1440,
            completedTopicIds.reduce(
              (total, topicId) => total + (topicMinutes.get(topicId) ?? 0),
              0,
            ),
          );

      days.push(
        new StudyDay({
          date,
          topicIds,
          completedTopicIds: completedTopicIds.filter((topicId) =>
            topicIds.includes(topicId),
          ),
          plannedMinutes,
        }),
      );
    }

    return days;
  }

  private resolveStatus(
    completed: boolean,
    performance: TopicPerformance | null,
    revision: RevisionSchedule | null,
    now: Date,
  ): PreparationTopicStatus {
    if (completed) {
      return 'completed';
    }
    if (performance?.classification === 'weak') {
      return 'weak';
    }
    const revisionStatus = revision?.getStatus(now);
    if (revisionStatus === 'due') {
      return 'due';
    }
    if (revisionStatus === 'needs_revision') {
      return 'needs_revision';
    }
    if (performance?.classification === 'insufficient') {
      return 'insufficient';
    }
    if (performance?.classification === 'strong') {
      return 'strong';
    }
    if (performance?.classification === 'neutral') {
      return 'neutral';
    }
    if (revisionStatus === 'mastered') {
      return 'mastered';
    }
    return 'not_started';
  }

  private priorityRank(status: PreparationTopicStatus): number {
    const ranks: Record<PreparationTopicStatus, number> = {
      completed: 100,
      weak: 0,
      due: 1,
      needs_revision: 2,
      insufficient: 3,
      not_started: 4,
      neutral: 5,
      strong: 6,
      mastered: 7,
    };
    return ranks[status];
  }

  private findBestMatch<T>(
    topicName: string,
    candidates: T[],
    getName: (candidate: T) => string,
  ): T | null {
    const normalized = this.normalize(topicName);
    const tokens = this.tokens(topicName);
    let best: { candidate: T; score: number } | null = null;

    for (const candidate of candidates) {
      const candidateName = getName(candidate);
      if (this.normalize(candidateName) === normalized) {
        return candidate;
      }
      const candidateTokens = this.tokens(candidateName);
      if (tokens.size === 0 || candidateTokens.size === 0) {
        continue;
      }
      let intersection = 0;
      for (const token of tokens) {
        if (candidateTokens.has(token)) {
          intersection += 1;
        }
      }
      const union = new Set([...tokens, ...candidateTokens]).size;
      const score = intersection / union;
      if (
        score >= MATCH_THRESHOLD &&
        (!best || score > best.score)
      ) {
        best = { candidate, score };
      }
    }

    return best?.candidate ?? null;
  }

  private tokens(value: string): Set<string> {
    return new Set(
      this.normalize(value)
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
    );
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private sourceLabel(document: StudyDocument | undefined): string {
    return document ? document.getOriginalName() : 'Document';
  }

  private truncate(value: string, maxLength: number): string {
    return value.length <= maxLength
      ? value
      : `${value.slice(0, maxLength - 3)}...`;
  }
}
