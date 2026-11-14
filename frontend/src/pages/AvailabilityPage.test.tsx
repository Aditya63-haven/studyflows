import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityPage } from './AvailabilityPage';

const state = vi.hoisted(() => ({
  week: Array.from({ length: 7 }, () => ({
    mode: 'budget' as const,
    budgetMinutes: 120,
    windows: [],
    unavailable: false,
  })),
  preferences: { sessionLengthMinutes: 45, breakLengthMinutes: 10 },
  saveDay: vi.fn(),
  savePreferences: vi.fn(),
}));

vi.mock('../availability/useAvailability', () => ({
  useAvailability: () => ({
    week: state.week,
    loading: false,
    preferences: state.preferences,
    saveDay: state.saveDay,
    savePreferences: state.savePreferences,
  }),
}));

describe('AvailabilityPage numeric inputs', () => {
  beforeEach(() => {
    state.saveDay.mockResolvedValue(undefined);
    state.savePreferences.mockResolvedValue(undefined);
  });

  it('lets budget and session preference values be cleared and retyped', async () => {
    const user = userEvent.setup();
    render(<AvailabilityPage />);

    const budget = screen.getByLabelText('Total study budget (minutes)');
    const sessionLength = screen.getByLabelText('Preferred session length (minutes)');
    const breakLength = screen.getByLabelText('Break length (minutes)');

    expect(budget).toHaveValue(120);
    await user.clear(budget);
    expect(budget).toHaveValue(null);
    await user.type(budget, '90');
    expect(budget).toHaveValue(90);

    expect(sessionLength).toHaveValue(45);
    await user.clear(sessionLength);
    expect(sessionLength).toHaveValue(null);
    await user.type(sessionLength, '60');
    expect(sessionLength).toHaveValue(60);

    expect(breakLength).toHaveValue(10);
    await user.clear(breakLength);
    expect(breakLength).toHaveValue(null);
    await user.type(breakLength, '15');
    expect(breakLength).toHaveValue(15);
  });

  it('saves numbers while preserving the existing API shape', async () => {
    const user = userEvent.setup();
    render(<AvailabilityPage />);

    const budget = screen.getByLabelText('Total study budget (minutes)');
    await user.clear(budget);
    await user.type(budget, '90');
    await user.click(screen.getByRole('button', { name: 'Save availability' }));

    await waitFor(() => expect(state.saveDay).toHaveBeenCalledOnce());
    expect(state.saveDay).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ budgetMinutes: 90 }),
    );

    const sessionLength = screen.getByLabelText('Preferred session length (minutes)');
    const breakLength = screen.getByLabelText('Break length (minutes)');
    await user.clear(sessionLength);
    await user.type(sessionLength, '60');
    await user.clear(breakLength);
    await user.type(breakLength, '15');
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => expect(state.savePreferences).toHaveBeenCalledOnce());
    expect(state.savePreferences).toHaveBeenCalledWith({
      sessionLengthMinutes: 60,
      breakLengthMinutes: 15,
    });
  });

  it('shows validation errors instead of saving empty required values', () => {
    render(<AvailabilityPage />);

    fireEvent.change(screen.getByLabelText('Total study budget (minutes)'), {
      target: { value: '' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save availability' }).closest('form')!,
    );

    expect(screen.getByText('Enter a study budget.')).toBeInTheDocument();
    expect(state.saveDay).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Preferred session length (minutes)'), {
      target: { value: '' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Save preferences' }).closest('form')!,
    );

    expect(screen.getByText('Enter a session length and break length.')).toBeInTheDocument();
    expect(state.savePreferences).not.toHaveBeenCalled();
  });
});
