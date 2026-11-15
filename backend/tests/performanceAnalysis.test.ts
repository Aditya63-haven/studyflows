import { ExamPlanRepository } from '../src/repositories/ExamPlanRepository';
import { AvailabilityRepository } from '../src/repositories/AvailabilityRepository';
import { QuizAttemptRepository } from '../src/repositories/QuizAttemptRepository';
import { QuizRepository } from '../src/repositories/QuizRepository';
import { RevisionScheduleRepository } from '../src/repositories/RevisionScheduleRepository';
import { StudySessionRepository } from '../src/repositories/StudySessionRepository';
import { StudySpaceRepository } from '../src/repositories/StudySpaceRepository';
import { Quiz } from '../src/domain/entities/Quiz';
import { QuizAttempt } from '../src/domain/entities/QuizAttempt';
import { RevisionSchedule } from '../src/domain/entities/RevisionSchedule';
import { StudySession } from '../src/domain/entities/StudySession';
import { StudySpace } from '../src/domain/entities/StudySpace';
import { QuestionEvaluation } from '../src/domain/questions/Question';
import { NotFoundError } from '../src/errors';
import { PerformanceAnalysisService } from '../src/services/PerformanceAnalysisService';
import { RevisionService } from '../src/services/RevisionService';

const USER_ID = 'user-1';
const NOW = new Date('2026-05-15T12:00:00.000Z');

const evaluations = (
  correctCount: number,
  total: number,
  prefix: string,
): QuestionEvaluation[] =>
  Array.from({ length: total }, (_, index) => ({
    questionId: `${prefix}-q${index + 1}`,
    correct: index < correctCount,
    earnedPoints: index < correctCount ? 1 : 0,
    maxPoints: 1,
    correctAnswer: ['a'],
  }));

const attempt = (
  id: string,
  quizId: string,
  correct: number,
  total: number,
  completedAt: string,
  prefix = id,
): QuizAttempt =>
  new QuizAttempt({
    id,
    quizId,
    userId: USER_ID,
    answers: [],
    result: {
      score: correct,
      maxScore: total,
      percentage: Math.round((correct / total) * 100),
      evaluations: evaluations(correct, total, prefix),
    },
    completedAt: new Date(completedAt),
  });

const quiz = (id: string, title: string): Quiz =>
  new Quiz({
    id,
    title,
    ownerId: USER_ID,
    spaceId: 'space-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const makeService = (input: {
  attempts?: QuizAttempt[];
  schedules?: RevisionSchedule[];
  revisionService?: RevisionService;
}) => {
  const repositories = {
    quiz: {
      findByOwner: jest
        .fn()
        .mockResolvedValue([quiz('quiz-1', 'Algebra'), quiz('quiz-2', 'Geometry')]),
    },
    attempts: { findByUser: jest.fn().mockResolvedValue(input.attempts ?? []) },
    spaces: {
      findByOwner: jest.fn().mockResolvedValue([
        new StudySpace({
          id: 'space-1',
          ownerId: USER_ID,
          name: 'Maths',
          subject: 'Mathematics',
        }),
      ]),
    },
    sessions: {
      findByUser: jest.fn().mockResolvedValue([
        new StudySession({
          userId: USER_ID,
          spaceId: 'space-1',
          durationMinutes: 45,
          startedAt: new Date('2026-05-14T10:00:00.000Z'),
        }),
        new StudySession({
          userId: USER_ID,
          spaceId: 'space-1',
          durationMinutes: 30,
          startedAt: new Date('2026-05-15T09:00:00.000Z'),
        }),
      ]),
    },
    revisions: {
      findByUser: jest.fn().mockResolvedValue(input.schedules ?? []),
    },
    plans: { findByOwner: jest.fn().mockResolvedValue([]) },
    availability: { findByOwner: jest.fn().mockResolvedValue(null) },
  };

  const revisionService =
    input.revisionService ??
    ({
      addRecommendedTopic: jest.fn(),
    } as unknown as RevisionService);

  const service = new PerformanceAnalysisService(
    repositories.quiz as unknown as QuizRepository,
    repositories.attempts as unknown as QuizAttemptRepository,
    repositories.spaces as unknown as StudySpaceRepository,
    repositories.sessions as unknown as StudySessionRepository,
    repositories.revisions as unknown as RevisionScheduleRepository,
    repositories.plans as unknown as ExamPlanRepository,
    repositories.availability as unknown as AvailabilityRepository,
    revisionService,
  );

  return { service, revisionService };
};

describe('PerformanceAnalysisService', () => {
  it('computes accuracy, trends, weak and strong topics with evidence', async () => {
    const attempts = [
      attempt('attempt-1', 'quiz-1', 0, 4, '2026-05-01T10:00:00.000Z', 'shared'),
      attempt('attempt-2', 'quiz-1', 2, 4, '2026-05-08T10:00:00.000Z', 'shared'),
      attempt('attempt-3', 'quiz-2', 5, 5, '2026-05-10T10:00:00.000Z', 'shared'),
    ];
    const dueSchedule = new RevisionSchedule({
      userId: USER_ID,
      topicId: 'quiz-3',
      topicName: 'Fractions',
      memoryStrength: 25,
      reviewCount: 1,
      nextReviewAt: new Date('2026-05-10T10:00:00.000Z'),
    });
    const { service } = makeService({ attempts, schedules: [dueSchedule] });

    const report = await service.analyze(USER_ID, { days: 90 }, NOW);

    expect(report.analysis.dataQuality.reliable).toBe(true);
    expect(report.analysis.overall.answeredQuestions).toBe(13);
    expect(report.analysis.overall.accuracy).toBe(53.8);
    expect(report.analysis.overall.trend.direction).toBe('improving');
    expect(report.analysis.weakTopics.map((topic) => topic.topicId)).toEqual(['quiz-1']);
    expect(report.analysis.strongTopics.map((topic) => topic.topicId)).toEqual(['quiz-2']);

    const weak = report.analysis.weakTopics[0];
    expect(weak.evidence[0]).toContain('2/8 questions correct (25% accuracy)');
    expect(weak.repeatedMistakes).toBe(2);
    expect(weak.evidence.join(' ')).toContain('improving');
    expect(report.analysis.studyConsistency.totalStudyMinutes).toBe(75);
    expect(report.analysis.revision.dueNow).toBe(1);

    expect(report.recommendations[0]).toMatchObject({
      id: 'weak:quiz-1',
      topicId: 'quiz-1',
      priority: 'high',
      addable: true,
      alreadyScheduled: false,
    });
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'revision:quiz-3', addable: false }),
      ]),
    );
  });

  it('marks small samples as insufficient instead of weak or strong', async () => {
    const attempts = [
      attempt('attempt-1', 'quiz-1', 2, 3, '2026-05-10T10:00:00.000Z'),
    ];
    const { service } = makeService({ attempts });

    const report = await service.analyze(USER_ID, { days: 30 }, NOW);

    expect(report.analysis.dataQuality.reliable).toBe(false);
    expect(report.analysis.dataQuality.insufficientData[0]).toContain('At least 5');
    expect(report.analysis.weakTopics).toHaveLength(0);
    expect(report.analysis.strongTopics).toHaveLength(0);
    expect(report.analysis.topics[0].classification).toBe('insufficient');
    expect(report.analysis.topics[0].evidence[0]).toContain('Only 3 question(s)');
  });

  it('accepts a recommendation server-side and delegates to revision', async () => {
    const attempts = [
      attempt('attempt-1', 'quiz-1', 2, 5, '2026-05-10T10:00:00.000Z'),
    ];
    const schedule = new RevisionSchedule({
      userId: USER_ID,
      topicId: 'quiz-1',
      topicName: 'Algebra',
    });
    const addRecommendedTopic = jest
      .fn()
      .mockResolvedValue({ schedule, created: true });
    const { service } = makeService({
      attempts,
      revisionService: { addRecommendedTopic } as unknown as RevisionService,
    });

    await expect(
      service.acceptRecommendation(USER_ID, 'weak:quiz-1', { days: 30 }, NOW),
    ).resolves.toEqual({ schedule, created: true });
    expect(addRecommendedTopic).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        topicId: 'quiz-1',
        topicName: 'Algebra',
        memoryStrength: 0,
      }),
      NOW,
    );

    await expect(
      service.acceptRecommendation(USER_ID, 'missing', { days: 30 }, NOW),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('adds recommended revision topics once and reuses existing schedules', async () => {
    const existing = new RevisionSchedule({
      userId: USER_ID,
      topicId: 'quiz-1',
      topicName: 'Algebra',
    });
    const create = jest.fn(async (schedule: RevisionSchedule) => schedule);
    const repository = {
      findByUserAndTopic: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing),
      create,
    } as unknown as RevisionScheduleRepository;
    const revisionService = new RevisionService(repository, {} as never);

    const first = await revisionService.addRecommendedTopic(
      USER_ID,
      { topicId: 'quiz-1', topicName: 'Algebra' },
      NOW,
    );
    const second = await revisionService.addRecommendedTopic(
      USER_ID,
      { topicId: 'quiz-1', topicName: 'Algebra' },
      NOW,
    );

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.schedule).toBe(existing);
    expect(create).toHaveBeenCalledTimes(1);
    expect(first.schedule.getNextReviewAt()).toEqual(NOW);
  });
});
