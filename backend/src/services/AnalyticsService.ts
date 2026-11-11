import { addDays, startOfDay } from '../domain/base/helpers';
import { QuizAttempt } from '../domain/entities/QuizAttempt';
import { RevisionSchedule } from '../domain/entities/RevisionSchedule';
import { StudySession } from '../domain/entities/StudySession';
import { IObserver } from '../domain/interfaces/IObserver';
import { DomainEvent, QuizCompletedEvent } from '../patterns/observer/events';
import { QuizAttemptRepository } from '../repositories/QuizAttemptRepository';
import { QuizRepository } from '../repositories/QuizRepository';
import { RevisionScheduleRepository } from '../repositories/RevisionScheduleRepository';
import { StudySessionRepository } from '../repositories/StudySessionRepository';

export interface SubjectBreakdown {
  subject: string;
  studyMinutes: number;
  sessionCount: number;
}

export interface QuizTrendPoint {
  quizId: string;
  quizTitle: string;
  percentage: number;
  completedAt: Date;
}

export interface WeakTopic {
  topicId: string;
  topicName: string;
  memoryStrength: number;
  nextReviewAt: Date;
}

export interface AnalyticsOverview {
  totalStudyMinutes: number;
  totalSessions: number;
  streakDays: number;
  averageQuizScore: number;
  quizAttemptCount: number;
  dueToday: number;
  masteredTopics: number;
  subjectBreakdown: SubjectBreakdown[];
  scoreTrend: QuizTrendPoint[];
  weakTopics: WeakTopic[];
  recentQuizEvents: QuizCompletedEvent[];
}

/**
 * Analytics read model.
 *
 * OOP: Observer - caches recent quiz completions published by EventBus.
 * OOP: SRP - aggregates statistics without owning persistence of any entity.
 */
export class AnalyticsService implements IObserver<DomainEvent> {
  private recentQuizEvents: QuizCompletedEvent[] = [];

  constructor(
    private readonly sessionRepository: StudySessionRepository,
    private readonly attemptRepository: QuizAttemptRepository,
    private readonly revisionRepository: RevisionScheduleRepository,
    private readonly quizRepository: QuizRepository,
  ) {}

  public update(event: DomainEvent): void {
    if (event.type !== 'quiz.completed') {
      return;
    }
    this.recentQuizEvents = [event, ...this.recentQuizEvents].slice(0, 50);
  }

  public async getOverview(
    userId: string,
    now: Date = new Date(),
  ): Promise<AnalyticsOverview> {
    const [sessions, attempts, schedules, quizzes] = await Promise.all([
      this.sessionRepository.findByUser(userId),
      this.attemptRepository.findByUser(userId),
      this.revisionRepository.findByUser(userId),
      this.quizRepository.findByOwner(userId),
    ]);

    const totalStudyMinutes = sessions.reduce(
      (total, session) => total + session.getDurationMinutes(),
      0,
    );
    const averageQuizScore =
      attempts.length === 0
        ? 0
        : attempts.reduce((total, attempt) => total + attempt.getPercentage(), 0) /
          attempts.length;

    const quizTitles = new Map(quizzes.map((quiz) => [quiz.getId(), quiz.getTitle()]));
    const scoreTrend = [...attempts]
      .sort((left, right) => left.getCompletedAt().getTime() - right.getCompletedAt().getTime())
      .slice(-20)
      .map((attempt) => this.toTrendPoint(attempt, quizTitles));

    return {
      totalStudyMinutes,
      totalSessions: sessions.length,
      streakDays: this.calculateStreak(sessions, now),
      averageQuizScore: Math.round(averageQuizScore * 100) / 100,
      quizAttemptCount: attempts.length,
      dueToday: schedules.filter((schedule) => schedule.isDue(now)).length,
      masteredTopics: schedules.filter((schedule) => schedule.getStatus(now) === 'mastered')
        .length,
      subjectBreakdown: this.buildSubjectBreakdown(sessions),
      scoreTrend,
      weakTopics: schedules
        .filter((schedule) => schedule.getMemoryStrength() < 40)
        .sort((left, right) => left.getMemoryStrength() - right.getMemoryStrength())
        .map((schedule) => this.toWeakTopic(schedule)),
      recentQuizEvents: [...this.recentQuizEvents],
    };
  }

  private toTrendPoint(
    attempt: QuizAttempt,
    quizTitles: Map<string, string>,
  ): QuizTrendPoint {
    return {
      quizId: attempt.getQuizId(),
      quizTitle: quizTitles.get(attempt.getQuizId()) ?? 'Quiz',
      percentage: attempt.getPercentage(),
      completedAt: attempt.getCompletedAt(),
    };
  }

  private toWeakTopic(schedule: RevisionSchedule): WeakTopic {
    return {
      topicId: schedule.getTopicId(),
      topicName: schedule.getTopicName(),
      memoryStrength: schedule.getMemoryStrength(),
      nextReviewAt: schedule.getNextReviewAt(),
    };
  }

  private buildSubjectBreakdown(sessions: StudySession[]): SubjectBreakdown[] {
    const grouped = new Map<string, SubjectBreakdown>();
    for (const session of sessions) {
      const subject = session.getSubject() || 'General';
      const current = grouped.get(subject) ?? {
        subject,
        studyMinutes: 0,
        sessionCount: 0,
      };
      current.studyMinutes += session.getDurationMinutes();
      current.sessionCount += 1;
      grouped.set(subject, current);
    }
    return [...grouped.values()].sort((left, right) => right.studyMinutes - left.studyMinutes);
  }

  private calculateStreak(sessions: StudySession[], now: Date): number {
    const studiedDays = new Set(sessions.map((session) => this.dateKey(session.getStartedAt())));
    let cursor = startOfDay(now);
    if (!studiedDays.has(this.dateKey(cursor))) {
      cursor = addDays(cursor, -1);
    }

    let streak = 0;
    while (studiedDays.has(this.dateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
