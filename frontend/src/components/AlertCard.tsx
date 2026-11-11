import type { ReactNode } from 'react';

interface AlertCardProps {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const AlertCard = ({ title, children, actionLabel, onAction }: AlertCardProps) => (
  <div className="alert-card" role="note">
    <strong className="alert-title">{title}</strong>
    <p className="alert-body">{children}</p>
    {actionLabel && onAction ? (
      <button type="button" className="button warning" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </div>
);
