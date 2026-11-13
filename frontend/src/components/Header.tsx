import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api';
import type { AppNotification } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ACCOUNT_LABEL } from '../utils/user';
import { ThemeSelector } from './ThemeSelector';
import { UserAvatar } from './UserAvatar';
import '../account.css';

type MenuIconName = 'profile' | 'availability' | 'settings' | 'logout';

const MenuIcon = ({ name }: { name: MenuIconName }) => {
  if (name === 'profile') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </svg>
    );
  }

  if (name === 'availability') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2M8 18h2" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="7" cy="17" r="2" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
};

const timeAgo = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const refreshNotifications = () => {
    notificationsApi
      .list()
      .then(({ notifications: list, unreadCount: count }) => {
        setNotifications(list);
        setUnreadCount(count);
      })
      .catch(() => {
        setUnreadCount(null);
      });
  };

  useEffect(refreshNotifications, []);

  useEffect(() => {
    setNotificationsOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen && !menuOpen) {
      return undefined;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (notificationsOpen) {
        setNotificationsOpen(false);
        notificationsButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen, menuOpen]);

  const handleMenuButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown') {
      return;
    }
    event.preventDefault();
    setNotificationsOpen(false);
    setMenuOpen(true);
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[data-profile-first]')?.focus();
    });
  };

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await notificationsApi.markRead(id);
      setNotifications((current) =>
        current.map((notification) => (notification.id === id ? updated : notification)),
      );
      setUnreadCount((current) => (current && current > 0 ? current - 1 : 0));
    } catch {
      setNotificationsOpen(false);
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          Menu
        </button>
        <Link to="/dashboard" className="wordmark" aria-label="StudyFlows home">
          <span className="logo-badge" aria-hidden="true">
            S
          </span>
          StudyFlows
        </Link>
      </div>

      <div className="header-right">
        <div ref={notificationsRef} className="header-popover-anchor">
          <button
            ref={notificationsButtonRef}
            type="button"
            className="notifications-link"
            onClick={() => {
              setMenuOpen(false);
              setNotificationsOpen((value) => !value);
            }}
            aria-expanded={notificationsOpen}
            aria-haspopup="menu"
          >
            Notifications {unreadCount !== null ? <strong>· {unreadCount}</strong> : null}
          </button>
          {notificationsOpen ? (
            <div className="notifications-menu" role="menu">
              {notifications.length === 0 ? (
                <p className="muted small-text notifications-empty">
                  No notifications yet. Missed sessions, upcoming exams and due revision will show
                  up here.
                </p>
              ) : (
                notifications.slice(0, 8).map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item${notification.read ? '' : ' unread'}`}
                  >
                    <div>
                      <strong>{notification.title}</strong>
                      <p className="small-text">{notification.message}</p>
                      <span className="notification-meta muted small-text">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.read ? (
                      <button
                        type="button"
                        className="notification-read-button"
                        onClick={() => void handleMarkRead(notification.id)}
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                ))
              )}
              <div className="notifications-footer">
                <Link
                  to="/revision"
                  className="small-text"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Review revision plan →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div ref={menuRef} className="header-popover-anchor">
          <button
            ref={menuButtonRef}
            type="button"
            className="avatar-button"
            onClick={() => {
              setNotificationsOpen(false);
              setMenuOpen((value) => !value);
            }}
            onKeyDown={handleMenuButtonKeyDown}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-controls="profile-menu"
            aria-label="Account menu"
          >
            <UserAvatar
              name={user?.name ?? ''}
              avatarUrl={user?.avatarUrl}
              className="avatar-button-avatar"
              decorative
            />
          </button>
          {menuOpen ? (
            <div id="profile-menu" className="profile-menu" role="dialog" aria-label="Account menu">
              <div className="profile-menu-identity">
                <UserAvatar
                  name={user?.name ?? ''}
                  avatarUrl={user?.avatarUrl}
                  className="profile-menu-avatar"
                  decorative
                />

                <div className="profile-menu-copy">
                  <strong>{user?.name ?? ACCOUNT_LABEL}</strong>
                  <span>{user?.email ?? 'Signed-in account'}</span>
                  <span className="profile-menu-role">{ACCOUNT_LABEL}</span>
                </div>
              </div>

              <div className="profile-menu-section">
                <span className="profile-menu-label">Appearance</span>
                <ThemeSelector compact />
              </div>

              <div className="profile-menu-section">
                <span className="profile-menu-label">Account</span>
                <Link
                  className="profile-menu-link"
                  to="/profile"
                  data-profile-first
                  onClick={() => setMenuOpen(false)}
                >
                  <MenuIcon name="profile" />
                  My Profile
                </Link>
                <Link
                  className="profile-menu-link"
                  to="/availability"
                  onClick={() => setMenuOpen(false)}
                >
                  <MenuIcon name="availability" />
                  Study Preferences
                </Link>
                <Link
                  className="profile-menu-link"
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                >
                  <MenuIcon name="settings" />
                  Settings
                </Link>
              </div>

              <div className="profile-menu-footer">
                <button type="button" className="profile-menu-logout" onClick={handleLogout}>
                  <MenuIcon name="logout" />
                  Log out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
