import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const Card = ({ title, description, actions, className, children }: CardProps) => (
  <section className={className ? `panel ${className}` : 'panel'}>
    {title || actions ? (
      <div className="card-title-row">
        <div>
          {title ? <h2>{title}</h2> : null}
          {description ? <p className="muted small-text">{description}</p> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);
