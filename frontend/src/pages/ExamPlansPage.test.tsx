import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExamPlansPage } from './ExamPlansPage';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../api', () => ({
  examPlansApi: api,
  getErrorMessage: () => 'Request failed',
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ExamPlansPage />
    </MemoryRouter>,
  );

describe('ExamPlansPage numeric inputs', () => {
  beforeEach(() => {
    api.list.mockResolvedValue([]);
    api.create.mockResolvedValue({ id: 'plan-1' });
  });

  it('lets daily study hours and topic minutes be cleared and retyped', async () => {
    const user = userEvent.setup();
    renderPage();

    const hours = await screen.findByLabelText('Daily study hours');
    const minutes = screen.getByLabelText('Minutes');

    expect(hours).toHaveValue(2);
    await user.clear(hours);
    expect(hours).toHaveValue(null);
    await user.type(hours, '2');
    expect(hours).toHaveValue(2);

    expect(minutes).toHaveValue(45);
    await user.clear(minutes);
    expect(minutes).toHaveValue(null);
    await user.type(minutes, '45');
    expect(minutes).toHaveValue(45);
  });

  it('submits numeric values with the existing API contract', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Exam name'), 'Calculus');
    fireEvent.change(screen.getByLabelText('Exam date'), {
      target: { value: '2026-12-01' },
    });
    await user.type(screen.getByLabelText('Topic 1'), 'Limits');
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '45');
    await user.click(screen.getByRole('button', { name: 'Build exam plan' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyStudyHours: 2,
        topics: [
          expect.objectContaining({
            name: 'Limits',
            estimatedMinutes: 45,
          }),
        ],
      }),
    );
  });

  it('shows a validation error instead of submitting zero when hours are empty', async () => {
    const user = userEvent.setup();
    renderPage();

    const hours = await screen.findByLabelText('Daily study hours');
    fireEvent.change(screen.getByLabelText('Exam date'), {
      target: { value: '2026-12-01' },
    });
    await user.clear(hours);
    fireEvent.submit(screen.getByRole('button', { name: 'Build exam plan' }).closest('form')!);

    expect(await screen.findByText('Enter daily study hours.')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });
});
