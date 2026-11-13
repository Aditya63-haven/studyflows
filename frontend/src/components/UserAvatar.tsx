import { useEffect, useState } from 'react';
import { resolveApiAssetUrl } from '../api';
import { initialsOf } from '../utils/user';
import '../avatar.css';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  alt?: string;
  decorative?: boolean;
}

export const UserAvatar = ({
  name,
  avatarUrl,
  className,
  alt,
  decorative = false,
}: UserAvatarProps) => {
  const [failed, setFailed] = useState(false);
  const source = resolveApiAssetUrl(avatarUrl);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const classes = className ? `user-avatar ${className}` : 'user-avatar';
  const label = alt ?? `${name || 'Student'}'s profile picture`;

  return (
    <span className={classes} aria-hidden={decorative ? 'true' : undefined}>
      {source && !failed ? (
        <img
          src={source}
          alt={decorative ? '' : label}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="user-avatar-fallback"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : label}
        >
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
};
