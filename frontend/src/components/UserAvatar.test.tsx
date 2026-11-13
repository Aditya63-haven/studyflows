import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders the uploaded picture', () => {
    render(<UserAvatar name="Ada Student" avatarUrl="/api/avatars/existing.webp" />);

    expect(screen.getByRole('img', { name: "Ada Student's profile picture" })).toHaveAttribute(
      'src',
      '/api/avatars/existing.webp',
    );
  });

  it('falls back to initials when no picture exists', () => {
    render(<UserAvatar name="Ada Student" avatarUrl={null} />);

    expect(screen.getByRole('img', { name: "Ada Student's profile picture" })).toHaveTextContent(
      'AS',
    );
  });

  it('falls back on load failure and retries when the URL changes', () => {
    const { container, rerender } = render(
      <UserAvatar name="Ada Student" avatarUrl="/api/avatars/broken.webp" />,
    );

    fireEvent.error(screen.getByRole('img', { name: "Ada Student's profile picture" }));
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();

    rerender(<UserAvatar name="Ada Student" avatarUrl="/api/avatars/new.webp" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/avatars/new.webp');
  });

  it('renders decoratively when requested', () => {
    const { container } = render(<UserAvatar name="Ada Student" avatarUrl={null} decorative />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
