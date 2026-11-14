import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsOverview } from '../api/types';
import { AnalyticsPage } from './AnalyticsPage';

const api = vi.hoisted(() => ({
  overview: vi.fn(),
  listSpaces: vi.fn(),
  listSessions: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock('../api', () => ({
  analyticsApi: { overview: api.overview },
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );

describe('AnalyticsPage duration input', () => {
  beforeEach(() => {
    api.overview.mockResolvedValue(overview);
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
});
