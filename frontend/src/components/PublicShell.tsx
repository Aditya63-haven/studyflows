import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Chip } from './Chip';

export const PublicShell = ({ children }: { children: ReactNode }) => (
  <div className="public-shell">
    <div className="public-card">
      <header className="public-brand">
        <Link to="/" className="wordmark">
          <span className="logo-badge" aria-hidden="true">
            S
          </span>
          StudyFlows
        </Link>
        <Chip>Shared view</Chip>
      </header>
      {children}
    </div>
  </div>
);
