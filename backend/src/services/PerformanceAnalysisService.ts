import { addDays, dateKey, endOfDay, roundTo, startOfDay } from '../domain/base/helpers';
import { ExamPlan } from '../domain/entities/ExamPlan';
import { Quiz } from '../domain/entities/Quiz';
import { QuizAttempt } from '../domain/entities/QuizAttempt';
import { RevisionSchedule, RevisionStatus } from '../domain/entities/RevisionSchedule';
import { StudentAvailability } from '../domain/entities/StudentAvailability';
import { StudySession } from '../domain/entities/StudySession';
import { StudySpace } from '../domain/entities/StudySpace';
import { AIPerformanceInput } from '../domain/interfaces/IAIProvider';
import { QuestionEvaluation } from '../domain/questions/Question';
import { CapacityCalculator } from '../domain/services/CapacityCalculator';
import { NotFoundError } from '../errors';
import { AvailabilityRepository } from '../repositories/AvailabilityRepository';
import { ExamPlanRepository } from '../repositories/ExamPlanRepository';
import { QuizAttemptRepository } from '../repositories/QuizAttemptRepository';
import { QuizRepository } from '../repositories/QuizRepository';
import { RevisionScheduleRepository } from '../repositories/RevisionScheduleRepository';
import { StudySessionRepository } from '../repositories/StudySessionRepository';
import { StudySpaceRepository } from '../repositories/StudySpaceRepository';
import { RevisionService } from './RevisionService';

export const MIN_QUESTIONS_FOR_CLASSIFICATION = 5;
const MIN_QUESTIONS_FOR_TREND = 3;
const ACCURACY_IMPROVEMENT_DELTA = 10;

export interface PerformanceFilters {
  days?: number;
  from?: Date;
  to?: Date;
  subject?: string;
  spaceId?: string;
}

export interface PerformanceRange {
  from: Date;
  to: Date;
  days: number;
}

export type PerformanceTrendDirection =
  | 'improving'
  | 'declining'
  | 'stable'
  | 'insufficient';

export interface AccuracyTrend {
  direction: PerformanceTrendDirection;
  recentAccuracy: number | null;
  previousAccuracy: number | null;
  recentQuestions: number;
  previousQuestions: number;
}

export interface PerformanceCounts {
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number | null;
}

export interface SubjectPerformance extends PerformanceCounts {
  subject: string;
  spaceId: string | null;
  spaceName: string;
  attemptCount: number;
  studyMinutes: number;
  lastAttemptAt: Date | null;
}

export type TopicClassification = 'weak' | 'strong' | 'neutral' | 'insufficient';

export interface TopicPerformance extends PerformanceCounts {
  topicId: string;
  topicName: string;
  subject: string;
  spaceId: string | null;
  attemptCount: number;
  repeatedMistakes: number;
  trend: AccuracyTrend;
  classification: TopicClassification;
  evidence: string[];
  revisionMemoryStrength: number | null;
  revisionStatus: RevisionStatus | null;
  lastAttemptAt: Date | null;
}

export interface AttemptHistoryItem {
  id: string;
  quizId: string;
  quizTitle: string;
  subject: string;
  spaceId: string | null;
  percentage: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  completedAt: Date;
}

export interface PendingPlanTopic {
  planId: string;
  planName: string;
  topicId: string;
  topicName: string;
  examDate: Date;
  daysRemaining: number;
  estimatedMinutes: number;
  scheduledDate: Date | null;
}

export interface UpcomingExam {
  planId: string;
  planName: string;
  examDate: Date;
  daysRemaining: number;
  completionPercentage: number;
  pendingTopicCount: number;
}

export interface StudyConsistency {
  totalStudyMinutes: number;
  sessionCount: number;
  activeDays: number;
  daysInRange: number;
  activeDayPercentage: number;
  averageSessionMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  availableMinutesPerWeek: number;
  availabilitySource: 'saved' | 'default';
  plannedMinutes: number;
  completedMinutes: number;
  plannedTopicSlots: number;
  completedTopicSlots: number;
  planCompletionPercentage: number | null;
  upcomingExams: UpcomingExam[];
  pendingPlanTopics: PendingPlanTopic[];
}

export interface RevisionMetrics {
  trackedTopics: number;
  dueNow: number;
  needsRevision: number;
  mastered: number;
  reviewedInRange: number;
  averageMemoryStrength: number | null;
  masteredPercentage: number | null;
}

export interface DataQuality {
  attemptCount: number;
  answeredQuestions: number;
  minimumQuestionsForClassification: number;
  reliable: boolean;
  insufficientData: string[];
  limitations: string[];
}

export interface PerformanceAnalysis {
  generatedAt: Date;
  range: PerformanceRange;
  filters: {
    subject: string | null;
    spaceId: string | null;
  };
  dataQuality: DataQuality;
  overall: PerformanceCounts & {
    attemptCount: number;
    averageAttemptScore: number | null;
    reliable: boolean;
    trend: AccuracyTrend;
  };
  subjects: SubjectPerformance[];
  topics: TopicPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  attempts: AttemptHistoryItem[];
  studyConsistency: StudyConsistency;
  revision: RevisionMetrics;
}

export type RecommendationType =
  | 'weak-topic'
  | 'due-revision'
  | 'low-memory'
  | 'exam-topic';

export interface RevisionRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  reason: string;
  evidence: string[];
  suggestedMinutes: number;
  topicId: string;
  topicName: string;
  priority: 'high' | 'medium' | 'low';
  examDate: Date | null;
  alreadyScheduled: boolean;
  addable: boolean;
}

export interface PerformanceReport {
  analysis: PerformanceAnalysis;
  recommendations: RevisionRecommendation[];
}

interface AttemptWithEvaluations {
  attempt: QuizAttempt;
  evaluations: QuestionEvaluation[];
}

interface CollectedData {
  now: Date;
  range: PerformanceRange;
  filters: {
    subject: string | null;
    spaceId: string | null;
  };
  attempts: QuizAttempt[];
  sessions: StudySession[];
  plans: ExamPlan[];
  schedules: RevisionSchedule[];
  schedulesByTopicId: Map<string, RevisionSchedule>;
  quizzesById: Map<string, Quiz>;
  spaceById: Map<string, StudySpace>;
  availability: StudentAvailability;
  availabilitySource: 'saved' | 'default';
}

const percent = (correct: number, answered: number): number | null =>
  answered === 0 ? null : roundTo((correct / answered) * 100, 1);

const truncate = (value: string, length = 120): string =>
  value.length <= length ? value : `${value.slice(0, length - 3)}...`;

const countEvaluations = (evaluations: QuestionEvaluation[]): PerformanceCounts => {
  const correctAnswers = evaluations.filter((evaluation) => evaluation.correct).length;
  return {
    answeredQuestions: evaluations.length,
    correctAnswers,
    incorrectAnswers: evaluations.length - correctAnswers,
    accuracy: percent(correctAnswers, evaluations.length),
  };
};

const insufficientTrend = (
  recentQuestions = 0,
  previousQuestions = 0,
): AccuracyTrend => ({
  direction: 'insufficient',
  recentAccuracy: null,
  previousAccuracy: null,
  recentQuestions,
  previousQuestions,
});

const compareAttemptGroups = (groups: AttemptWithEvaluations[]): AccuracyTrend => {
  if (groups.length < 2) {
    return insufficientTrend(
      countEvaluations(groups.flatMap((group) => group.evaluations)).answeredQuestions,
    );
  }

  const split = Math.ceil(groups.length / 2);
  const previous = groups.slice(0, split).flatMap((group) => group.evaluations);
  const recent = groups.slice(split).flatMap((group) => group.evaluations);
  if (
    previous.length < MIN_QUESTIONS_FOR_TREND ||
    recent.length < MIN_QUESTIONS_FOR_TREND
  ) {
    return insufficientTrend(recent.length, previous.length);
  }

  const previousAccuracy = percent(
    previous.filter((evaluation) => evaluation.correct).length,
    previous.length,
  );
  const recentAccuracy = percent(
    recent.filter((evaluation) => evaluation.correct).length,
    recent.length,
  );
  const delta = (recentAccuracy ?? 0) - (previousAccuracy ?? 0);

  return {
    direction:
      delta >= ACCURACY_IMPROVEMENT_DELTA
        ? 'improving'
        : delta <= -ACCURACY_IMPROVEMENT_DELTA
          ? 'declining'
          : 'stable',
    recentAccuracy,
    previousAccuracy,
    recentQuestions: recent.length,
    previousQuestions: previous.length,
  };
};

const calculateLongestStreak = (sessions: StudySession[]): number => {
  const days = [...new Set(sessions.map((session) => dateKey(session.getStartedAt())))].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const day of days) {
    const date = new Date(`${day}T00:00:00`);
    if (previous && dateKey(addDays(previous, 1)) === day) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  }

  return longest;
};

const calculateCurrentStreak = (sessions: StudySession[], now: Date): number => {
  const studiedDays = new Set(sessions.map((session) => dateKey(session.getStartedAt())));
  let cursor = startOfDay(now);
  if (!studiedDays.has(dateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (studiedDays.has(dateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

/**
 * Deterministic academic performance analysis.
 *
 * OOP: SRP - computes measured performance from user-owned repositories without
 * calling an AI provider.
 * OOP: DIP - repositories and revision use cases are injected.
 * OOP: Strategy - personalised recommendations reuse the existing revision
 * service rather than creating a parallel task system.
 */
export class PerformanceAnalysisService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly attemptRepository: QuizAttemptRepository,
    private readonly spaceRepository: StudySpaceRepository,
    private readonly sessionRepository: StudySessionRepository,
    private readonly revisionRepository: RevisionScheduleRepository,
    private readonly examPlanRepository: ExamPlanRepository,
    private readonly availabilityRepository: AvailabilityRepository,
    private readonly revisionService: RevisionService,
  ) {}

  public async analyze(
    userId: string,
    filters: PerformanceFilters = {},
    now: Date = new Date(),
  ): Promise<PerformanceReport> {
    const data = await this.collect(userId, filters, now);
    const analysis = this.buildAnalysis(data);
    return {
      analysis,
      recommendations: this.buildRecommendations(analysis, data),
    };
  }

  public async acceptRecommendation(
    userId: string,
    recommendationId: string,
    filters: PerformanceFilters = {},
    now: Date = new Date(),
  ): Promise<{ schedule: RevisionSchedule; created: boolean }> {
    const report = await this.analyze(userId, filters, now);
    const recommendation = report.recommendations.find(
      (candidate) => candidate.id === recommendationId,
    );
    if (!recommendation) {
      throw new NotFoundError(
        'Revision recommendation not found or no longer available',
      );
    }

    return this.revisionService.addRecommendedTopic(
      userId,
      {
        topicId: recommendation.topicId,
        topicName: recommendation.topicName,
        memoryStrength: 0,
        nextReviewAt: now,
      },
      now,
    );
  }

  public buildAIInput(report: PerformanceReport): AIPerformanceInput {
    const { analysis, recommendations } = report;
    return {
      generatedAt: analysis.generatedAt.toISOString(),
      range: {
        from: analysis.range.from.toISOString(),
        to: analysis.range.to.toISOString(),
        days: analysis.range.days,
      },
      dataQuality: {
        attemptCount: analysis.dataQuality.attemptCount,
        answeredQuestions: analysis.dataQuality.answeredQuestions,
        reliable: analysis.dataQuality.reliable,
        insufficientData: analysis.dataQuality.insufficientData,
        limitations: analysis.dataQuality.limitations,
      },
      overall: {
        attemptCount: analysis.overall.attemptCount,
        answeredQuestions: analysis.overall.answeredQuestions,
        correctAnswers: analysis.overall.correctAnswers,
        incorrectAnswers: analysis.overall.incorrectAnswers,
        accuracy: analysis.overall.accuracy,
        averageAttemptScore: analysis.overall.averageAttemptScore,
        trend: analysis.overall.trend,
      },
      subjects: analysis.subjects.slice(0, 6).map((subject) => ({
        subject: truncate(subject.subject),
        attemptCount: subject.attemptCount,
        answeredQuestions: subject.answeredQuestions,
        correctAnswers: subject.correctAnswers,
        incorrectAnswers: subject.incorrectAnswers,
        accuracy: subject.accuracy,
        studyMinutes: subject.studyMinutes,
      })),
      weakTopics: analysis.weakTopics.slice(0, 6).map((topic) => ({
        topicId: topic.topicId,
        topicName: truncate(topic.topicName),
        accuracy: topic.accuracy,
        answeredQuestions: topic.answeredQuestions,
        incorrectAnswers: topic.incorrectAnswers,
        repeatedMistakes: topic.repeatedMistakes,
        trend: topic.trend,
        evidence: topic.evidence.slice(0, 3).map((item) => truncate(item, 180)),
        revisionMemoryStrength: topic.revisionMemoryStrength,
      })),
      strongTopics: analysis.strongTopics.slice(0, 4).map((topic) => ({
        topicId: topic.topicId,
        topicName: truncate(topic.topicName),
        accuracy: topic.accuracy,
        answeredQuestions: topic.answeredQuestions,
        trend: topic.trend,
      })),
      recentAttempts: analysis.attempts.slice(0, 8).map((attempt) => ({
        quizId: attempt.quizId,
        quizTitle: truncate(attempt.quizTitle),
        subject: truncate(attempt.subject),
        percentage: attempt.percentage,
        answeredQuestions: attempt.answeredQuestions,
        correctAnswers: attempt.correctAnswers,
        completedAt: attempt.completedAt.toISOString(),
      })),
      studyConsistency: {
        totalStudyMinutes: analysis.studyConsistency.totalStudyMinutes,
        sessionCount: analysis.studyConsistency.sessionCount,
        activeDays: analysis.studyConsistency.activeDays,
        daysInRange: analysis.studyConsistency.daysInRange,
        currentStreakDays: analysis.studyConsistency.currentStreakDays,
        availableMinutesPerWeek: analysis.studyConsistency.availableMinutesPerWeek,
        plannedMinutes: analysis.studyConsistency.plannedMinutes,
        completedMinutes: analysis.studyConsistency.completedMinutes,
        planCompletionPercentage: analysis.studyConsistency.planCompletionPercentage,
        upcomingExams: analysis.studyConsistency.upcomingExams.slice(0, 4).map((exam) => ({
          planName: truncate(exam.planName),
          daysRemaining: exam.daysRemaining,
          completionPercentage: exam.completionPercentage,
          pendingTopicCount: exam.pendingTopicCount,
        })),
      },
      revision: analysis.revision,
      recommendations: recommendations.slice(0, 8).map((recommendation) => ({
        id: recommendation.id,
        title: truncate(recommendation.title),
        reason: truncate(recommendation.reason, 220),
        suggestedMinutes: recommendation.suggestedMinutes,
        topicId: recommendation.topicId,
        alreadyScheduled: recommendation.alreadyScheduled,
      })),
    };
  }

  private async collect(
    userId: string,
    filters: PerformanceFilters,
    now: Date,
  ): Promise<CollectedData> {
    const range = this.resolveRange(filters, now);
    const [allAttempts, allSessions, schedules, plans, spaces, quizzes, availability] =
      await Promise.all([
        this.attemptRepository.findByUser(userId),
        this.sessionRepository.findByUser(userId),
        this.revisionRepository.findByUser(userId),
        this.examPlanRepository.findByOwner(userId),
        this.spaceRepository.findByOwner(userId),
        this.quizRepository.findByOwner(userId),
        this.availabilityRepository.findByOwner(userId),
      ]);

    const spaceById = new Map(spaces.map((space) => [space.getId(), space]));
    const quizzesById = new Map(quizzes.map((quiz) => [quiz.getId(), quiz]));
    const subjectNeedle = filters.subject?.trim().toLowerCase() ?? null;
    const spaceId = filters.spaceId?.trim() || null;

    const quizMatchesFilters = (quiz: Quiz): boolean => {
      const space = spaceById.get(quiz.getSpaceId());
      if (spaceId && quiz.getSpaceId() !== spaceId) {
        return false;
      }
      if (subjectNeedle) {
        const subject = space?.getSubject().toLowerCase() ?? '';
        const name = space?.getName().toLowerCase() ?? '';
        if (!subject.includes(subjectNeedle) && !name.includes(subjectNeedle)) {
          return false;
        }
      }
      return true;
    };

    const attempts = allAttempts.filter((attempt) => {
      const completedAt = attempt.getCompletedAt();
      if (completedAt.getTime() < range.from.getTime() || completedAt.getTime() > range.to.getTime()) {
        return false;
      }
      if (!spaceId && !subjectNeedle) {
        return true;
      }
      const quiz = quizzesById.get(attempt.getQuizId());
      return quiz ? quizMatchesFilters(quiz) : false;
    });

    const sessions = allSessions.filter((session) => {
      const startedAt = session.getStartedAt().getTime();
      if (startedAt < range.from.getTime() || startedAt > range.to.getTime()) {
        return false;
      }
      if (spaceId && session.getSpaceId() !== spaceId) {
        return false;
      }
      if (subjectNeedle) {
        const subject = session.getSubject().toLowerCase();
        const sessionSpaceId = session.getSpaceId();
        const linkedSpace = sessionSpaceId
          ? spaceById.get(sessionSpaceId)
          : undefined;
        const linkedSubject = linkedSpace?.getSubject().toLowerCase() ?? '';
        if (!subject.includes(subjectNeedle) && !linkedSubject.includes(subjectNeedle)) {
          return false;
        }
      }
      return true;
    });

    const filteredQuizIds = new Set(
      quizzes.filter((quiz) => quizMatchesFilters(quiz)).map((quiz) => quiz.getId()),
    );
    const scopedSchedules =
      spaceId || subjectNeedle
        ? schedules.filter((schedule) => filteredQuizIds.has(schedule.getTopicId()))
        : schedules;

    const defaultAvailability = StudentAvailability.defaultFor(userId);
    return {
      now,
      range,
      filters: {
        subject: filters.subject?.trim() || null,
        spaceId,
      },
      attempts,
      sessions,
      plans,
      schedules: scopedSchedules,
      schedulesByTopicId: new Map(
        scopedSchedules.map((schedule) => [schedule.getTopicId(), schedule]),
      ),
      quizzesById,
      spaceById,
      availability: availability ?? defaultAvailability,
      availabilitySource: availability ? 'saved' : 'default',
    };
  }

  private resolveRange(filters: PerformanceFilters, now: Date): PerformanceRange {
    const days = Math.max(1, Math.min(365, Math.floor(filters.days ?? 90)));
    const to = filters.to ? endOfDay(filters.to) : endOfDay(now);
    const from = filters.from
      ? startOfDay(filters.from)
      : startOfDay(addDays(to, -(days - 1)));
    const actualDays =
      Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1;
    return { from, to, days: Math.max(1, actualDays) };
  }

  private buildAnalysis(data: CollectedData): PerformanceAnalysis {
    const attemptsWithEvaluations: AttemptWithEvaluations[] = data.attempts.map(
      (attempt) => ({
        attempt,
        evaluations: attempt.getResult().evaluations,
      }),
    );
    const sortedAscending = [...attemptsWithEvaluations].sort(
      (left, right) =>
        left.attempt.getCompletedAt().getTime() - right.attempt.getCompletedAt().getTime(),
    );

    const overallEvaluations = sortedAscending.flatMap((entry) => entry.evaluations);
    const overallCounts = countEvaluations(overallEvaluations);
    const overallTrend = compareAttemptGroups(sortedAscending);
    const averageAttemptScore =
      data.attempts.length === 0
        ? null
        : roundTo(
            data.attempts.reduce((total, attempt) => total + attempt.getPercentage(), 0) /
              data.attempts.length,
            1,
          );

    const topics = this.buildTopics(data, sortedAscending);
    const weakTopics = topics.filter((topic) => topic.classification === 'weak');
    const strongTopics = topics.filter((topic) => topic.classification === 'strong');
    const limitations = [
      'Quiz questions do not store curriculum topic tags. Topic metrics use quiz titles as the finest available grouping, matching the existing revision model.',
      'Quiz difficulty is not recorded, so difficulty-adjusted analysis is unavailable.',
      'Revision records keep only the latest review per topic, so every historical review event cannot be reconstructed.',
    ];
    if (data.filters.subject || data.filters.spaceId) {
      limitations.push(
        'Exam plans are not linked to study spaces or subjects, so plan metrics are omitted from filtered reports.',
      );
    }

    const insufficientData: string[] = [];
    if (overallCounts.answeredQuestions === 0) {
      insufficientData.push('No quiz attempts match the selected period and filters.');
    } else if (overallCounts.answeredQuestions < MIN_QUESTIONS_FOR_CLASSIFICATION) {
      insufficientData.push(
        `Only ${overallCounts.answeredQuestions} question(s) were answered. At least ${MIN_QUESTIONS_FOR_CLASSIFICATION} are needed before treating accuracy as reliable.`,
      );
    }

    const studyConsistency = this.buildStudyConsistency(data);
    const revision = this.buildRevisionMetrics(data);

    return {
      generatedAt: data.now,
      range: data.range,
      filters: data.filters,
      dataQuality: {
        attemptCount: data.attempts.length,
        answeredQuestions: overallCounts.answeredQuestions,
        minimumQuestionsForClassification: MIN_QUESTIONS_FOR_CLASSIFICATION,
        reliable: overallCounts.answeredQuestions >= MIN_QUESTIONS_FOR_CLASSIFICATION,
        insufficientData,
        limitations,
      },
      overall: {
        ...overallCounts,
        attemptCount: data.attempts.length,
        averageAttemptScore,
        reliable: overallCounts.answeredQuestions >= MIN_QUESTIONS_FOR_CLASSIFICATION,
        trend: overallTrend,
      },
      subjects: this.buildSubjects(data, attemptsWithEvaluations),
      topics,
      weakTopics,
      strongTopics,
      attempts: this.buildAttemptHistory(data, sortedAscending),
      studyConsistency,
      revision,
    };
  }

  private buildSubjects(
    data: CollectedData,
    attempts: AttemptWithEvaluations[],
  ): SubjectPerformance[] {
    const grouped = new Map<string, SubjectPerformance>();

    for (const { attempt, evaluations } of attempts) {
      const quiz = data.quizzesById.get(attempt.getQuizId());
      const space = quiz ? data.spaceById.get(quiz.getSpaceId()) : undefined;
      const subject = space?.getSubject() || 'Unassigned subject';
      const key = subject.toLowerCase();
      const current =
        grouped.get(key) ??
        ({
          subject,
          spaceId: space?.getId() ?? null,
          spaceName: space?.getName() ?? 'Unknown space',
          answeredQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: null,
          attemptCount: 0,
          studyMinutes: 0,
          lastAttemptAt: null,
        } satisfies SubjectPerformance);

      const counts = countEvaluations(evaluations);
      current.answeredQuestions += counts.answeredQuestions;
      current.correctAnswers += counts.correctAnswers;
      current.incorrectAnswers += counts.incorrectAnswers;
      current.attemptCount += 1;
      const completedAt = attempt.getCompletedAt();
      if (!current.lastAttemptAt || completedAt > current.lastAttemptAt) {
        current.lastAttemptAt = completedAt;
      }
      current.accuracy = percent(current.correctAnswers, current.answeredQuestions);
      grouped.set(key, current);
    }

    for (const session of data.sessions) {
      const sessionSpaceId = session.getSpaceId();
      const space = sessionSpaceId
        ? data.spaceById.get(sessionSpaceId)
        : undefined;
      const subject = session.getSubject() || space?.getSubject() || 'General';
      const key = subject.toLowerCase();
      const current = grouped.get(key);
      if (current) {
        current.studyMinutes += session.getDurationMinutes();
      }
    }

    return [...grouped.values()].sort(
      (left, right) => (right.accuracy ?? -1) - (left.accuracy ?? -1),
    );
  }

  private buildTopics(
    data: CollectedData,
    attempts: AttemptWithEvaluations[],
  ): TopicPerformance[] {
    const grouped = new Map<
      string,
      {
        topicName: string;
        subject: string;
        spaceId: string | null;
        entries: AttemptWithEvaluations[];
        evaluations: QuestionEvaluation[];
      }
    >();

    for (const entry of attempts) {
      const quizId = entry.attempt.getQuizId();
      const quiz = data.quizzesById.get(quizId);
      const space = quiz ? data.spaceById.get(quiz.getSpaceId()) : undefined;
      const current =
        grouped.get(quizId) ??
        {
          topicName: quiz?.getTitle() ?? 'Unlinked quiz',
          subject: space?.getSubject() || 'Unassigned subject',
          spaceId: space?.getId() ?? null,
          entries: [],
          evaluations: [],
        };
      current.entries.push(entry);
      current.evaluations.push(...entry.evaluations);
      grouped.set(quizId, current);
    }

    const topics: TopicPerformance[] = [];
    for (const [topicId, group] of grouped) {
      const counts = countEvaluations(group.evaluations);
      const repeatedMistakes = this.countRepeatedMistakes(group.evaluations);
      const trend = compareAttemptGroups(
        [...group.entries].sort(
          (left, right) =>
            left.attempt.getCompletedAt().getTime() -
            right.attempt.getCompletedAt().getTime(),
        ),
      );
      const schedule = data.schedulesByTopicId.get(topicId);
      const classification = this.classifyTopic(
        counts,
        repeatedMistakes,
        trend,
        schedule,
      );
      const evidence = this.buildTopicEvidence(
        counts,
        repeatedMistakes,
        trend,
        schedule,
        classification,
        data.now,
      );
      topics.push({
        topicId,
        topicName: group.topicName,
        subject: group.subject,
        spaceId: group.spaceId,
        ...counts,
        attemptCount: group.entries.length,
        repeatedMistakes,
        trend,
        classification,
        evidence,
        revisionMemoryStrength: schedule?.getMemoryStrength() ?? null,
        revisionStatus: schedule?.getStatus(data.now) ?? null,
        lastAttemptAt: group.entries
          .map((entry) => entry.attempt.getCompletedAt())
          .sort((left, right) => right.getTime() - left.getTime())[0] ?? null,
      });
    }

    const rank: Record<TopicClassification, number> = {
      weak: 0,
      insufficient: 1,
      neutral: 2,
      strong: 3,
    };
    return topics.sort((left, right) => {
      const classificationDifference = rank[left.classification] - rank[right.classification];
      if (classificationDifference !== 0) {
        return classificationDifference;
      }
      return (left.accuracy ?? 101) - (right.accuracy ?? 101);
    });
  }

  private countRepeatedMistakes(evaluations: QuestionEvaluation[]): number {
    const misses = new Map<string, number>();
    for (const evaluation of evaluations) {
      if (!evaluation.correct) {
        misses.set(evaluation.questionId, (misses.get(evaluation.questionId) ?? 0) + 1);
      }
    }
    return [...misses.values()].filter((count) => count >= 2).length;
  }

  private classifyTopic(
    counts: PerformanceCounts,
    repeatedMistakes: number,
    trend: AccuracyTrend,
    schedule: RevisionSchedule | undefined,
  ): TopicClassification {
    if (counts.answeredQuestions < MIN_QUESTIONS_FOR_CLASSIFICATION) {
      return 'insufficient';
    }

    const weakEvidence =
      (counts.accuracy !== null && counts.accuracy < 60) ||
      repeatedMistakes >= 2 ||
      (trend.direction === 'declining' &&
        trend.recentAccuracy !== null &&
        trend.previousAccuracy !== null &&
        trend.previousAccuracy - trend.recentAccuracy >= ACCURACY_IMPROVEMENT_DELTA) ||
      (schedule !== undefined && schedule.getMemoryStrength() < 40);

    if (weakEvidence) {
      return 'weak';
    }
    if (
      counts.accuracy !== null &&
      counts.accuracy >= 80 &&
      repeatedMistakes === 0 &&
      trend.direction !== 'declining'
    ) {
      return 'strong';
    }
    return 'neutral';
  }

  private buildTopicEvidence(
    counts: PerformanceCounts,
    repeatedMistakes: number,
    trend: AccuracyTrend,
    schedule: RevisionSchedule | undefined,
    classification: TopicClassification,
    now: Date,
  ): string[] {
    if (classification === 'insufficient') {
      return [
        `Only ${counts.answeredQuestions} question(s) answered; at least ${MIN_QUESTIONS_FOR_CLASSIFICATION} are needed before classifying this topic.`,
      ];
    }

    const evidence = [
      `${counts.correctAnswers}/${counts.answeredQuestions} questions correct (${counts.accuracy}% accuracy).`,
    ];
    if (repeatedMistakes > 0) {
      evidence.push(
        `${repeatedMistakes} question(s) were answered incorrectly in more than one attempt.`,
      );
    }
    if (trend.direction !== 'insufficient') {
      evidence.push(
        `Recent accuracy is ${trend.recentAccuracy}% versus ${trend.previousAccuracy}% previously (${trend.direction}).`,
      );
    }
    if (schedule) {
      evidence.push(
        `Revision memory strength is ${schedule.getMemoryStrength()}% with status "${schedule.getStatus(now)}".`,
      );
    }
    return evidence;
  }

  private buildAttemptHistory(
    data: CollectedData,
    attempts: AttemptWithEvaluations[],
  ): AttemptHistoryItem[] {
    return [...attempts]
      .sort(
        (left, right) =>
          right.attempt.getCompletedAt().getTime() -
          left.attempt.getCompletedAt().getTime(),
      )
      .slice(0, 20)
      .map(({ attempt, evaluations }) => {
        const quiz = data.quizzesById.get(attempt.getQuizId());
        const space = quiz ? data.spaceById.get(quiz.getSpaceId()) : undefined;
        const counts = countEvaluations(evaluations);
        return {
          id: attempt.getId(),
          quizId: attempt.getQuizId(),
          quizTitle: quiz?.getTitle() ?? 'Deleted quiz',
          subject: space?.getSubject() || 'Unassigned subject',
          spaceId: space?.getId() ?? null,
          percentage: attempt.getPercentage(),
          answeredQuestions: counts.answeredQuestions,
          correctAnswers: counts.correctAnswers,
          incorrectAnswers: counts.incorrectAnswers,
          completedAt: attempt.getCompletedAt(),
        };
      });
  }

  private buildStudyConsistency(data: CollectedData): StudyConsistency {
    const totalStudyMinutes = data.sessions.reduce(
      (total, session) => total + session.getDurationMinutes(),
      0,
    );
    const activeDays = new Set(
      data.sessions.map((session) => dateKey(session.getStartedAt())),
    ).size;
    const daysInRange = Math.max(
      1,
      Math.floor(
        (startOfDay(data.range.to).getTime() - startOfDay(data.range.from).getTime()) /
          86_400_000,
      ) + 1,
    );

    const availabilityMinutes = data.availability
      .getDays()
      .reduce((total, day) => total + CapacityCalculator.forDay(day).totalMinutes, 0);

    const subjectFiltered = Boolean(data.filters.subject || data.filters.spaceId);
    const relevantPlans = subjectFiltered ? [] : data.plans;
    let plannedMinutes = 0;
    let completedMinutes = 0;
    let plannedTopicSlots = 0;
    let completedTopicSlots = 0;

    for (const plan of relevantPlans) {
      const topicMinutes = new Map(
        plan.getTopics().map((topic) => [topic.getId(), topic.getEstimatedMinutes()]),
      );
      for (const day of plan.getStudyDays()) {
        const date = day.getDate().getTime();
        if (date < data.range.from.getTime() || date > data.range.to.getTime()) {
          continue;
        }
        const plannedTopicIds = day.getTopicIds();
        const completedTopicIds = day.getCompletedTopicIds();
        plannedTopicSlots += plannedTopicIds.length;
        completedTopicSlots += completedTopicIds.length;
        plannedMinutes +=
          day.getPlannedMinutes() ||
          plannedTopicIds.reduce(
            (total, topicId) => total + (topicMinutes.get(topicId) ?? 0),
            0,
          );
        completedMinutes += completedTopicIds.reduce(
          (total, topicId) => total + (topicMinutes.get(topicId) ?? 0),
          0,
        );
      }
    }

    const upcomingExams = [...relevantPlans]
      .filter((plan) => plan.getExamDate().getTime() >= data.now.getTime())
      .sort((left, right) => left.getExamDate().getTime() - right.getExamDate().getTime())
      .slice(0, 5)
      .map((plan) => ({
        planId: plan.getId(),
        planName: plan.getName(),
        examDate: plan.getExamDate(),
        daysRemaining: plan.getDaysRemaining(data.now),
        completionPercentage: plan.getProgress(),
        pendingTopicCount: plan.getIncompleteTopicIds().length,
      }));

    const pendingPlanTopics: PendingPlanTopic[] = [];
    for (const plan of relevantPlans) {
      const topicById = new Map(plan.getTopics().map((topic) => [topic.getId(), topic]));
      for (const topicId of plan.getIncompleteTopicIds()) {
        const topic = topicById.get(topicId);
        const scheduledDay = plan
          .getStudyDays()
          .find((day) => day.containsTopic(topicId) && !day.isComplete());
        pendingPlanTopics.push({
          planId: plan.getId(),
          planName: plan.getName(),
          topicId,
          topicName: topic?.getName() ?? 'Exam topic',
          examDate: plan.getExamDate(),
          daysRemaining: plan.getDaysRemaining(data.now),
          estimatedMinutes: topic?.getEstimatedMinutes() ?? 30,
          scheduledDate: scheduledDay?.getDate() ?? null,
        });
        if (pendingPlanTopics.length >= 10) {
          break;
        }
      }
      if (pendingPlanTopics.length >= 10) {
        break;
      }
    }

    return {
      totalStudyMinutes,
      sessionCount: data.sessions.length,
      activeDays,
      daysInRange,
      activeDayPercentage: roundTo((activeDays / daysInRange) * 100, 1),
      averageSessionMinutes:
        data.sessions.length === 0
          ? 0
          : roundTo(totalStudyMinutes / data.sessions.length, 1),
      currentStreakDays: calculateCurrentStreak(data.sessions, data.now),
      longestStreakDays: calculateLongestStreak(data.sessions),
      availableMinutesPerWeek: availabilityMinutes,
      availabilitySource: data.availabilitySource,
      plannedMinutes,
      completedMinutes,
      plannedTopicSlots,
      completedTopicSlots,
      planCompletionPercentage:
        plannedTopicSlots === 0
          ? null
          : roundTo((completedTopicSlots / plannedTopicSlots) * 100, 1),
      upcomingExams,
      pendingPlanTopics,
    };
  }

  private buildRevisionMetrics(data: CollectedData): RevisionMetrics {
    const scheduled = data.schedules;
    const reviewedInRange = scheduled.filter((schedule) => {
      const reviewedAt = schedule.getLastReviewedAt();
      return (
        reviewedAt !== null &&
        reviewedAt.getTime() >= data.range.from.getTime() &&
        reviewedAt.getTime() <= data.range.to.getTime()
      );
    }).length;
    const memoryValues = scheduled.map((schedule) => schedule.getMemoryStrength());
    const mastered = scheduled.filter(
      (schedule) => schedule.getStatus(data.now) === 'mastered',
    ).length;

    return {
      trackedTopics: scheduled.length,
      dueNow: scheduled.filter((schedule) => schedule.isDue(data.now)).length,
      needsRevision: scheduled.filter(
        (schedule) => schedule.getStatus(data.now) === 'needs_revision',
      ).length,
      mastered,
      reviewedInRange,
      averageMemoryStrength:
        memoryValues.length === 0
          ? null
          : roundTo(
              memoryValues.reduce((total, value) => total + value, 0) / memoryValues.length,
              1,
            ),
      masteredPercentage:
        scheduled.length === 0 ? null : roundTo((mastered / scheduled.length) * 100, 1),
    };
  }

  private buildRecommendations(
    analysis: PerformanceAnalysis,
    data: CollectedData,
  ): RevisionRecommendation[] {
    const recommendations: RevisionRecommendation[] = [];
    const byTopicId = new Map<string, RevisionRecommendation>();

    const add = (recommendation: RevisionRecommendation): void => {
      if (byTopicId.has(recommendation.topicId)) {
        return;
      }
      byTopicId.set(recommendation.topicId, recommendation);
      recommendations.push(recommendation);
    };

    for (const topic of analysis.weakTopics) {
      const schedule = data.schedulesByTopicId.get(topic.topicId);
      const alreadyScheduled = schedule !== undefined;
      add({
        id: `weak:${topic.topicId}`,
        type: 'weak-topic',
        title: `Revise ${topic.topicName}`,
        description: `A focused review of ${topic.topicName} fits within your ${
          analysis.studyConsistency.availableMinutesPerWeek
        } available minutes per week.`,
        reason:
          topic.evidence[0] ??
          `Accuracy is ${topic.accuracy}% across ${topic.answeredQuestions} questions.`,
        evidence: topic.evidence,
        suggestedMinutes: 25,
        topicId: topic.topicId,
        topicName: topic.topicName,
        priority: 'high',
        examDate: null,
        alreadyScheduled,
        addable: !alreadyScheduled,
      });
    }

    for (const schedule of data.schedules) {
      const status = schedule.getStatus(data.now);
      if (status !== 'due' && status !== 'needs_revision') {
        continue;
      }
      add({
        id: `revision:${schedule.getTopicId()}`,
        type: status === 'due' ? 'due-revision' : 'low-memory',
        title: `Review ${schedule.getTopicName()}`,
        description: `This topic is already in your revision queue with ${schedule.getMemoryStrength()}% memory strength.`,
        reason:
          status === 'due'
            ? 'The scheduled review date has arrived.'
            : 'Memory strength is below the 40% needs-revision threshold.',
        evidence: [
          `Memory strength ${schedule.getMemoryStrength()}%.`,
          `Revision status: ${status}.`,
          `Reviewed ${schedule.getReviewCount()} time(s).`,
        ],
        suggestedMinutes: 20,
        topicId: schedule.getTopicId(),
        topicName: schedule.getTopicName(),
        priority: status === 'due' ? 'high' : 'medium',
        examDate: null,
        alreadyScheduled: true,
        addable: false,
      });
    }

    for (const pending of analysis.studyConsistency.pendingPlanTopics) {
      const topicId = `exam:${pending.planId}:${pending.topicId}`;
      const alreadyScheduled = data.schedulesByTopicId.has(topicId);
      add({
        id: `exam:${pending.planId}:${pending.topicId}`,
        type: 'exam-topic',
        title: `Revise ${pending.topicName}`,
        description: `Incomplete topic in "${pending.planName}". Your exam is in ${pending.daysRemaining} day(s).`,
        reason: `This exam-plan topic is still incomplete with ${pending.daysRemaining} day(s) until the exam.`,
        evidence: [
          `Plan: ${pending.planName}.`,
          `Exam in ${pending.daysRemaining} day(s).`,
          `Estimated study time: ${pending.estimatedMinutes} minutes.`,
        ],
        suggestedMinutes: pending.estimatedMinutes,
        topicId,
        topicName: pending.topicName,
        priority: pending.daysRemaining <= 7 ? 'high' : 'medium',
        examDate: pending.examDate,
        alreadyScheduled,
        addable: !alreadyScheduled,
      });
    }

    const priorityRank = { high: 0, medium: 1, low: 2 };
    return recommendations
      .sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority])
      .slice(0, 8);
  }
}
