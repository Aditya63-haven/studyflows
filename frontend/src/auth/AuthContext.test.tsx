import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../api/types';
import { AuthProvider, useAuth } from './AuthContext';

const api = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
}));

vi.mock('../api', () => ({
  TOKEN_STORAGE_KEY: 'studyflows.token',
  authApi: api,
}));

const initialUser: User = {
  id: 'user-1',
  name: 'Ada Student',
  email: 'ada@example.com',
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const withAvatar: User = {
  ...initialUser,
  avatarUrl: '/api/avatars/uploaded.webp',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const Probe = () => {
  const { user, uploadAvatar, removeAvatar } = useAuth();
  return (
    <div>
      <span data-testid="user-name">{user?.name ?? 'none'}</span>
      <span data-testid="avatar-url">{user?.avatarUrl ?? 'none'}</span>
      <button
        type="button"
        onClick={() =>
          void uploadAvatar(new File(['avatar'], 'avatar.webp', { type: 'image/webp' }))
        }
      >
        Upload
      </button>
      <button type="button" onClick={() => void removeAvatar()}>
        Remove
      </button>
    </div>
  );
};

describe('AuthContext avatar synchronization', () => {
  beforeEach(() => {
    localStorage.setItem('studyflows.token', 'test-token');
    api.me.mockResolvedValue(initialUser);
    api.uploadAvatar.mockResolvedValue(withAvatar);
    api.removeAvatar.mockResolvedValue({ ...initialUser, updatedAt: '2026-01-03T00:00:00.000Z' });
  });

  it('updates the shared user immediately after upload and removal', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Ada Student'));

    await user.click(screen.getByRole('button', { name: 'Upload' }));
    await waitFor(() =>
      expect(screen.getByTestId('avatar-url')).toHaveTextContent('/api/avatars/uploaded.webp'),
    );
    expect(api.uploadAvatar).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getByTestId('avatar-url')).toHaveTextContent('none'));
    expect(api.removeAvatar).toHaveBeenCalledOnce();
  });
});
