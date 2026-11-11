import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export const PublicShell = ({ children }: { children: ReactNode }) => (
  <div className="app-shell">
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">SF</span>
          <span>StudyFlows</span>
        </Link>
        <div className="user-menu">
          <span className="badge">Shared view</span>
          <Link className="button small" to="/login">
            Log in
          </Link>
        </div>
      </div>
    </header>
    <main className="container">{children}</main>
  </div>
);
