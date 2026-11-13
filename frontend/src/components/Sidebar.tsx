import { NavLink } from 'react-router-dom';

interface SidebarLink {
  to: string;
  label: string;
  end?: boolean;
}

const mainLinks: SidebarLink[] = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/exam-plans', label: 'Planner' },
  { to: '/spaces', label: 'Subjects' },
  { to: '/tasks', label: 'Tasks & assessments' },
  { to: '/analytics', label: 'Progress' },
];

const planningLinks: SidebarLink[] = [
  { to: '/availability', label: 'Availability' },
  { to: '/history', label: 'Progress & history' },
  { to: '/revision', label: 'Revision' },
];

const libraryLinks: SidebarLink[] = [
  { to: '/search', label: 'Search' },
  { to: '/bookmarks', label: 'Bookmarks' },
];

const SidebarLinkItem = ({ link }: { link: SidebarLink }) => (
  <NavLink
    to={link.to}
    end={link.end}
    className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
  >
    {link.label}
  </NavLink>
);

export const Sidebar = ({ open }: { open: boolean }) => (
  <aside className={open ? 'app-sidebar open' : 'app-sidebar'} aria-label="Main navigation">
    <div className="sidebar-inner">
      <nav className="nav-group">
        {mainLinks.map((link) => (
          <SidebarLinkItem key={link.to} link={link} />
        ))}
      </nav>
      <nav className="nav-group">
        <span className="nav-group-label">Study planning</span>
        {planningLinks.map((link) => (
          <SidebarLinkItem key={link.to} link={link} />
        ))}
      </nav>
      <nav className="nav-group">
        <span className="nav-group-label">Library</span>
        {libraryLinks.map((link) => (
          <SidebarLinkItem key={link.to} link={link} />
        ))}
      </nav>
    </div>
  </aside>
);
