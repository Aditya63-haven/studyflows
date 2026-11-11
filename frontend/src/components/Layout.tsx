import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/spaces', label: 'Spaces' },
  { to: '/revision', label: 'Revision' },
  { to: '/exam-plans', label: 'Exam plans' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/search', label: 'Search' },
  { to: '/bookmarks', label: 'Bookmarks' },
];

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">SF</span>
            <span>StudyFlows</span>
          </Link>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            Menu
          </button>

          <nav className={open ? 'nav-links open' : 'nav-links'}>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="user-menu">
            <span className="user-name">{user?.name}</span>
            <button type="button" className="button small secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
};
