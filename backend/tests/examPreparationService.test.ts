import { AppError, ConflictError } from '../src/errors';
import { DocumentChunk } from '../src/domain/entities/DocumentChunk';
import { ExamPlan } from '../src/domain/entities/ExamPlan';
import { StudentAvailability } from '../src/domain/entities/StudentAvailability';
import { StudyDocument } from '../src/domain/entities/StudyDocument';
import { StudySpace } from '../src/domain/entities/StudySpace';
import { Topic } from '../src/domain/entities/Topic';
import { IAIProvider } from '../src/domain/interfaces/IAIProvider';
import { AvailabilityRepository } from '../src/repositories/AvailabilityRepository';
import { DocumentChunkRepository } from '../src/repositories/DocumentChunkRepository';
import { ExamPlanRepository } from '../src/repositories/ExamPlanRepository';
import { RevisionScheduleRepository } from '../src/repositories/RevisionScheduleRepository';
import { StudySessionRepository } from '../src/repositories/StudySessionRepository';
import { AiAccessService } from '../src/services/AiAccessService';
import { AiRateLimiter } from '../src/services/AiRateLimiter';
import { DocumentService } from '../src/services/DocumentService';
import { ExamPlanService } from '../src/services/ExamPlanService';
import {
  ExamPreparationService,
  PreparationSelection,
} from '../src/services/ExamPreparationService';
import {
  PerformanceAnalysisService,
  PerformanceReport,
} from '../src/services/PerformanceAnalysisService';
import { StudySpaceService } from '../src/services/StudySpaceService';

const now = new Date(2026, 2, 2, 9);

const makeSpace = () =>
  new StudySpace({
    id: 'space-1',
    ownerId: 'user-1',
    name: 'Biology',
    subject: 'Biology',
  });

const makeDocument = () =>
  new StudyDocument({
    id: 'doc-1',
    ownerId: 'user-1',
    spaceId: 'space-1',
    originalName: 'syllabus.txt',
    format: 'txt',
    mimeType: 'text/plain',
    sizeBytes: 120,
    storageKey: 'stored-document',
    status: 'ready',
    pageCount: 1,
    characterCount: 120,
    chunkCount: 1,
  });

const makeChunk = () =>
  new DocumentChunk({
    id: 'chunk-1',
    documentId: 'doc-1',
    ownerId: 'user-1',
    spaceId: 'space-1',
    chunkIndex: 0,
    text: 'Cell Biology covers membranes, organelles and cell division.',
    pageNumber: 1,
    section: 'Cell Biology',
  });

const makePlan = (topics?: Topic[], examDate?: Date) =>
  new ExamPlan({
    id: 'plan-1',
    name: 'Biology Final',
    ownerId: 'user-1',
    examDate: examDate ?? new Date(2026, 2, 5, 12),
    dailyStudyHours: 1,
    spaceId: 'space-1',
    topics:
      topics ??
      [
        new Topic({ id: 'topic-1', name: 'Cell Biology', estimatedMinutes: 60 }),
        new Topic({ id: 'topic-2', name: 'Genetics', estimatedMinutes: 60 }),
      ],
  });

const makeReport = (): PerformanceReport =>
  ({
    analysis: {
      topics: [
        {
          topicId: 'quiz-1',
          topicName: 'Cell Biology',
          subject: 'Biology',
          spaceId: 'space-1',
          accuracy: 40,
          answeredQuestions: 5,
          correctAnswers: 2,
          incorrectAnswers: 3,
          attemptCount: 1,
          repeatedMistakes: 1,
          trend: {
            direction: 'declining',
            recentAccuracy: 40,
            previousAccuracy: 60,
            recentQuestions: 5,
            previousQuestions: 5,
          },
          classification: 'weak',
          evidence: ['2/5 questions correct (40% accuracy).'],
          revisionMemoryStrength: null,
          revisionStatus: null,
          lastAttemptAt: now,
        },
      ],
      dataQuality: {
        attemptCount: 1,
        answeredQuestions: 5,
        minimumQuestionsForClassification: 5,
        reliable: true,
        insufficientData: [],
        limitations: [
          'Quiz questions do not store curriculum topic tags.',
        ],
      },
    },
    recommendations: [],
  }) as unknown as PerformanceReport;

interface HarnessOptions {
  plan?: ExamPlan;
  providerError?: Error;
}

const createHarness = (options: HarnessOptions = {}) => {
  let currentPlan = options.plan ?? makePlan();
  const space = makeSpace();
  const document = makeDocument();
  const chunk = makeChunk();
  const availability = StudentAvailability.defaultFor('user-1');

  const examPlanService = {
    getOwned: jest.fn(async () => currentPlan),
    persistPrepared: jest.fn(async (_userId: string, _planId: string, plan: ExamPlan) => {
      currentPlan = plan;
      return plan;
    }),
  } as unknown as ExamPlanService;

  const planRepository = {
    findByOwner: jest.fn(async () => [currentPlan]),
  } as unknown as ExamPlanRepository;
  const spaceService = {
    getOwned: jest.fn(async () => space),
  } as unknown as StudySpaceService;
  const documentService = {
    listBySpace: jest.fn(async () => [document]),
  } as unknown as DocumentService;
  const chunkRepository = {
    findByDocuments: jest.fn(async () => [chunk]),
  } as unknown as DocumentChunkRepository;
  const sessionRepository = {
    findByUserSince: jest.fn(async () => []),
  } as unknown as StudySessionRepository;
  const revisionRepository = {
    findByUser: jest.fn(async () => []),
  } as unknown as RevisionScheduleRepository;
  const availabilityRepository = {
    findByOwner: jest.fn(async () => availability),
  } as unknown as AvailabilityRepository;
  const performanceAnalysisService = {
    analyze: jest.fn(async () => makeReport()),
  } as unknown as PerformanceAnalysisService;

  const planExamPreparation = options.providerError
    ? jest.fn().mockRejectedValue(options.providerError)
    : jest.fn().mockResolvedValue({
        summary: 'Use the weak Cell Biology evidence first, then Genetics.',
        sequence: [
          {
            topicId: 'topic-1',
            reason: 'Accuracy is 40% across five questions.',
            practiceActivity: 'Answer fresh cell biology practice questions.',
          },
          {
            topicId: 'topic-2',
            reason: 'No quiz evidence is available yet.',
            practiceActivity: 'Build a concept map, then self-test.',
          },
        ],
        cautions: ['Quiz evidence is limited to one topic.'],
        usedChunkIds: ['chunk-1'],
      });
  const aiProvider = {
    name: 'mock',
    planExamPreparation,
  } as unknown as IAIProvider;
  const aiAccessService = {
    assertAccess: jest.fn().mockResolvedValue(undefined),
  } as unknown as AiAccessService;
  const rateLimiter = {
    consume: jest.fn(),
  } as unknown as AiRateLimiter;

  const service = new ExamPreparationService(
    examPlanService,
    planRepository,
    spaceService,
    documentService,
    chunkRepository,
    sessionRepository,
    revisionRepository,
    availabilityRepository,
    performanceAnalysisService,
    aiProvider,
    aiAccessService,
    rateLimiter,
  );

  return {
    service,
    currentPlan: () => currentPlan,
    examPlanService,
    planExamPreparation,
    aiAccessService,
    rateLimiter,
  };
};

const selection: PreparationSelection = {
  spaceId: 'space-1',
  documentIds: ['doc-1'],
};

describe('ExamPreparationService', () => {
  it('previews AI strategy, evidence, documents and a deterministic schedule without persisting', async () => {
    const harness = createHarness();

    const preview = await harness.service.preview(
      'user-1',
      'plan-1',
      selection,
      now,
    );

    expect(harness.aiAccessService.assertAccess).toHaveBeenCalledWith('user-1');
    expect(harness.rateLimiter.consume).toHaveBeenCalledWith('user-1');
    expect(harness.examPlanService.persistPrepared).not.toHaveBeenCalled();

    expect(preview.space).toMatchObject({
      id: 'space-1',
      name: 'Biology',
      subject: 'Biology',
    });
    expect(preview.documents).toEqual([
      expect.objectContaining({ id: 'doc-1', selected: true }),
    ]);
    expect(preview.selectedDocumentIds).toEqual(['doc-1']);
    expect(preview.topics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'topic-1',
          status: 'weak',
          performance: expect.objectContaining({ classification: 'weak' }),
          sources: [expect.objectContaining({ chunkId: 'chunk-1' })],
        }),
        expect.objectContaining({ id: 'topic-2', status: 'not_started' }),
      ]),
    );
    expect(preview.strategy).toMatchObject({
      provider: 'mock',
      fallback: false,
      usedChunkIds: ['chunk-1'],
    });
    expect(preview.strategy.items).toEqual([
      expect.objectContaining({ topicId: 'topic-1', source: 'ai' }),
      expect.objectContaining({ topicId: 'topic-2', source: 'ai' }),
    ]);
    expect(preview.topicOrder).toEqual(['topic-1', 'topic-2']);
    expect(preview.schedule.days).toHaveLength(2);
    expect(preview.schedule.requiredMinutes).toBe(120);
    expect(preview.approvalFingerprint).toHaveLength(64);
    expect(preview.requiresAcknowledgement).toBe(false);

    expect(harness.planExamPreparation).toHaveBeenCalledWith(
      expect.objectContaining({
        examName: 'Biology Final',
        sourceChunks: [expect.objectContaining({ chunkId: 'chunk-1' })],
        dataQuality: expect.objectContaining({ reliable: true }),
      }),
    );
    const aiInput = harness.planExamPreparation.mock.calls[0][0] as {
      topics: Array<{ topicId: string; performance: { classification: string } | null }>;
    };
    expect(aiInput.topics[0]).toMatchObject({
      topicId: 'topic-1',
      performance: { classification: 'weak' },
    });
  });

  it('approves the preview, persists it atomically, and treats a repeat as idempotent', async () => {
    const harness = createHarness();
    const preview = await harness.service.preview('user-1', 'plan-1', selection, now);

    const approved = await harness.service.approve(
      'user-1',
      'plan-1',
      {
        ...selection,
        topicOrder: preview.topicOrder,
        approvalFingerprint: preview.approvalFingerprint,
        strategySummary: preview.strategy.summary,
        provider: preview.strategy.provider,
      },
      now,
    );

    expect(approved.created).toBe(true);
    expect(harness.examPlanService.persistPrepared).toHaveBeenCalledTimes(1);
    expect(approved.plan.getSpaceId()).toBe('space-1');
    expect(approved.plan.getDocumentIds()).toEqual(['doc-1']);
    expect(approved.plan.getPreparation()).toMatchObject({
      provider: 'mock',
      approvalFingerprint: preview.approvalFingerprint,
      requiredMinutes: 120,
      shortfallMinutes: 0,
    });
    expect(approved.plan.getStudyDays()).toHaveLength(2);

    const repeated = await harness.service.approve(
      'user-1',
      'plan-1',
      {
        ...selection,
        topicOrder: preview.topicOrder,
        approvalFingerprint: preview.approvalFingerprint,
        strategySummary: preview.strategy.summary,
        provider: preview.strategy.provider,
      },
      now,
    );

    expect(repeated.created).toBe(false);
    expect(harness.examPlanService.persistPrepared).toHaveBeenCalledTimes(1);
  });

  it('rejects a stale approval fingerprint', async () => {
    const harness = createHarness();
    const preview = await harness.service.preview('user-1', 'plan-1', selection, now);

    await expect(
      harness.service.approve(
        'user-1',
        'plan-1',
        {
          ...selection,
          topicOrder: preview.topicOrder,
          approvalFingerprint: 'stale-fingerprint',
        },
        now,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(harness.examPlanService.persistPrepared).not.toHaveBeenCalled();
  });

  it('requires explicit conflict acknowledgement before approving an overbooked plan', async () => {
    const harness = createHarness({
      plan: makePlan(
        [
          new Topic({ id: 'topic-1', name: 'Cell Biology', estimatedMinutes: 200 }),
          new Topic({ id: 'topic-2', name: 'Genetics', estimatedMinutes: 200 }),
        ],
        new Date(2026, 2, 3, 12),
      ),
    });
    const preview = await harness.service.preview('user-1', 'plan-1', selection, now);

    expect(preview.requiresAcknowledgement).toBe(true);
    expect(preview.conflicts.length).toBeGreaterThan(0);
    expect(preview.schedule.shortfallMinutes).toBeGreaterThan(0);

    await expect(
      harness.service.approve(
        'user-1',
        'plan-1',
        {
          ...selection,
          topicOrder: preview.topicOrder,
          approvalFingerprint: preview.approvalFingerprint,
        },
        now,
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const approved = await harness.service.approve(
      'user-1',
      'plan-1',
      {
        ...selection,
        topicOrder: preview.topicOrder,
        approvalFingerprint: preview.approvalFingerprint,
        acknowledgeConflicts: true,
      },
      now,
    );

    expect(approved.created).toBe(true);
    expect(approved.plan.getPreparation()?.shortfallMinutes).toBeGreaterThan(0);
  });

  it('falls back to a clearly labelled deterministic strategy when AI fails', async () => {
    const harness = createHarness({
      providerError: new AppError('Gemini could not be reached.', 502, true),
    });

    const preview = await harness.service.preview('user-1', 'plan-1', selection, now);

    expect(preview.strategy).toMatchObject({
      provider: 'deterministic-fallback',
      fallback: true,
      warning: 'Gemini could not be reached.',
      usedChunkIds: [],
    });
    expect(preview.strategy.items).toHaveLength(2);
    expect(preview.strategy.items.every((item) => item.source === 'server')).toBe(true);
    expect(preview.schedule.days).toHaveLength(2);
  });
});
