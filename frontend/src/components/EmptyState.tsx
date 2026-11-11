import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  children?: ReactNode;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  actionTo,
  children,
}: EmptyStateProps) => (
  <div className="empty-state">
    <h3>{title}</h3>
    {description ? <p>{description}</p> : null}
    {children}
    {actionLabel && actionTo ? (
      <Link className="button" to={actionTo}>
        {actionLabel}
      </Link>
    ) : null}
  </div>
);
