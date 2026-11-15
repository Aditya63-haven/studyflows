import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsOverview, PerformanceReport } from '../api/types';
import { AnalyticsPage } from './AnalyticsPage';

const api = vi.hoisted(() => ({
  overview: vi.fn(),
  performance: vi.fn(),
  acceptRecommendation: vi.fn(),
  listSpaces: vi.fn(),
  listSessions: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock('../api', () => ({
  analyticsApi: {
    overview: api.overview,
    performance: api.performance,
    acceptRecommendation: api.acceptRecommendation,
  },
  spacesApi: { list: api.listSpaces },
  sessionsApi: { list: api.listSessions, create: api.createSession },
  getErrorMessage: () => 'Request failed',
}));

const overview: AnalyticsOverview = {
  totalStudyMinutes: 0,
  totalSessions: 0,
  streakDays: 0,
  averageQuizScore: 0,
  quizAttemptCount: 0,
  dueToday: 0,
  masteredTopics: 0,
  subjectBreakdown: [],
  scoreTrend: [],
  weakTopics: [],
  recentQuizEvents: [],
};


const performanceReport: PerformanceReport = {
  analysis: {
    generatedAt: '2026-05-15T12:00:00.000Z',
    range: { from: '2026-04-16T00:00:00.000Z', to: '2026-05-15T23:59:59.999Z', days: 30 },
    filters: { subject: null, spaceId: null },
    dataQuality: {
      attemptCount: 1,
      answeredQuestions: 5,
      minimumQuestionsForClassification: 5,
      reliable: true,
      insufficientData: [],
      limitations: ['Quiz questions do not store curriculum topic tags.'],
    },
    overall: {
      attemptCount: 1,
      answeredQuestions: 5,
      correctAnswers: 2,
      incorrectAnswers: 3,
      accuracy: 40,
      averageAttemptScore: 40,
      reliable: true,
      trend: {
        direction: 'insufficient',
        recentAccuracy: null,
        previousAccuracy: null,
        recentQuestions: 0,
        previousQuestions: 0,
      },
    },
    subjects: [
      {
        subject: 'Biology',
        spaceId: 'space-1',
        spaceName: 'Biology',
        attemptCount: 1,
        answeredQuestions: 5,
        correctAnswers: 2,
        incorrectAnswers: 3,
        accuracy: 40,
        studyMinutes: 60,
        lastAttemptAt: '2026-05-10T10:00:00.000Z',
      },
    ],
    topics: [
      {
        topicId: 'quiz-1',
        topicName: 'Cell Biology',
        subject: 'Biology',
        spaceId: 'space-1',
        attemptCount: 1,
        answeredQuestions: 5,
        correctAnswers: 2,
        incorrectAnswers: 3,
        accuracy: 40,
        repeatedMistakes: 0,
        trend: {
          direction: 'insufficient',
          recentAccuracy: null,
          previousAccuracy: null,
          recentQuestions: 0,
          previousQuestions: 0,
        },
        classification: 'weak',
        evidence: ['2/5 questions correct (40% accuracy).'],
        revisionMemoryStrength: null,
        revisionStatus: null,
        lastAttemptAt: '2026-05-10T10:00:00.000Z',
      },
    ],
    weakTopics: [],
    strongTopics: [],
    attempts: [],
    studyConsistency: {
      totalStudyMinutes: 60,
      sessionCount: 1,
      activeDays: 1,
      daysInRange: 30,
      activeDayPercentage: 3.3,
      averageSessionMinutes: 60,
      currentStreakDays: 0,
      longestStreakDays: 1,
      availableMinutesPerWeek: 600,
      availabilitySource: 'default',
      plannedMinutes: 0,
      completedMinutes: 0,
      plannedTopicSlots: 0,
      completedTopicSlots: 0,
      planCompletionPercentage: null,
      upcomingExams: [],
      pendingPlanTopics: [],
    },
    revision: {
      trackedTopics: 0,
      dueNow: 0,
      needsRevision: 0,
      mastered: 0,
      reviewedInRange: 0,
      averageMemoryStrength: null,
      masteredPercentage: null,
    },
  },
  recommendations: [
    {
      id: 'weak:quiz-1',
      type: 'weak-topic',
      title: 'Revise Cell Biology',
      description: 'A focused review fits within your available time.',
      reason: '2/5 questions correct (40% accuracy).',
      evidence: ['2/5 questions correct (40% accuracy).'],
      suggestedMinutes: 25,
      topicId: 'quiz-1',
      topicName: 'Cell Biology',
      priority: 'high',
      examDate: null,
      alreadyScheduled: false,
      addable: true,
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );

describe('AnalyticsPage duration input', () => {
  beforeEach(() => {
    api.overview.mockResolvedValue(overview);
    api.performance.mockResolvedValue(performanceReport);
    api.acceptRecommendation.mockResolvedValue({ created: true });
    api.listSpaces.mockResolvedValue([]);
    api.listSessions.mockResolvedValue([]);
    api.createSession.mockResolvedValue({});
  });

  it('lets the duration be cleared and retyped, then submits a number', async () => {
    const user = userEvent.setup();
    renderPage();

    const duration = await screen.findByLabelText('Duration (minutes)');
    expect(duration).toHaveValue(30);
    await user.clear(duration);
    expect(duration).toHaveValue(null);
    await user.type(duration, '45');
    expect(duration).toHaveValue(45);

    await user.click(screen.getByRole('button', { name: 'Log session' }));

    await waitFor(() => expect(api.createSession).toHaveBeenCalledOnce());
    expect(api.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ durationMinutes: 45 }),
    );
  });

  it('shows a validation error instead of submitting zero when duration is empty', async () => {
    const user = userEvent.setup();
    renderPage();

    const duration = await screen.findByLabelText('Duration (minutes)');
    await user.clear(duration);
    fireEvent.submit(screen.getByRole('button', { name: 'Log session' }).closest('form')!);

    expect(await screen.findByText('Enter a study duration.')).toBeInTheDocument();
    expect(api.createSession).not.toHaveBeenCalled();
  });
  it('shows performance evidence and accepts a revision recommendation', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Performance intelligence')).toBeInTheDocument();
    expect(screen.getAllByText('2/5 questions correct (40% accuracy).').length).toBeGreaterThan(0);
    expect(screen.getByText(/topic tags/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to revision' }));

    await waitFor(() =>
      expect(api.acceptRecommendation).toHaveBeenCalledWith('weak:quiz-1', {
        days: 90,
        spaceId: undefined,
      }),
    );
    expect(
      await screen.findByText('Added "Cell Biology" to your revision schedule.'),
    ).toBeInTheDocument();
  });
});
