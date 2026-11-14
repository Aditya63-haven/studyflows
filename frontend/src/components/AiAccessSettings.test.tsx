import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiAccessSettings } from './AiAccessSettings';

const state = vi.hoisted(() => ({
  status: vi.fn(),
  list: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock('../api', () => ({
  aiAccessApi: {
    status: state.status,
    list: state.list,
    grant: state.grant,
    revoke: state.revoke,
  },
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Request failed',
}));

const grant = (overrides: Record<string, unknown> = {}) => ({
  id: 'grant-1',
  email: 'student@example.com',
  status: 'pending',
  invitedBy: 'admin@example.com',
  revokedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('AiAccessSettings', () => {
  beforeEach(() => {
    state.status.mockReset();
    state.list.mockReset();
    state.grant.mockReset();
    state.revoke.mockReset();
  });

  it('renders only for administrators', async () => {
    state.status.mockResolvedValue({
      allowed: false,
      isAdmin: false,
      email: 'student@example.com',
      status: 'none',
    });

    const { container } = render(<AiAccessSettings />);

    await waitFor(() => expect(state.status).toHaveBeenCalledOnce());
    expect(container).toBeEmptyDOMElement();
    expect(state.list).not.toHaveBeenCalled();
  });

  it('adds an invite and revokes an existing grant', async () => {
    state.status.mockResolvedValue({
      allowed: true,
      isAdmin: true,
      email: 'admin@example.com',
      status: 'admin',
    });
    state.list.mockResolvedValue([grant()]);
    state.grant.mockResolvedValue(grant({ id: 'grant-2', email: 'new@example.com' }));
    state.revoke.mockResolvedValue(
      grant({ status: 'revoked', revokedAt: '2026-02-01T00:00:00.000Z' }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(<AiAccessSettings />);

    expect(await screen.findByText('student@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending sign-up')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Student email'), 'new@example.com');
    await user.click(screen.getByRole('button', { name: 'Grant access' }));

    await waitFor(() =>
      expect(state.grant).toHaveBeenCalledWith('new@example.com'),
    );
    expect(await screen.findByText('new@example.com')).toBeInTheDocument();
    expect(
      screen.getByText('AI assistant access granted to new@example.com.'),
    ).toBeInTheDocument();

    const studentRow = screen
      .getByText('student@example.com')
      .closest('.ai-access-row') as HTMLElement;
    await user.click(within(studentRow).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(state.revoke).toHaveBeenCalledWith('grant-1'));
    expect(await screen.findByText('Revoked')).toBeInTheDocument();
    expect(
      screen.getByText('AI assistant access revoked for student@example.com.'),
    ).toBeInTheDocument();
  });
});
