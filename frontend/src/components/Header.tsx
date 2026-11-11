import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api';
import type { AppNotification } from '../api/types';
import { useAuth } from '../auth/AuthContext';

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'S';

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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!notificationsOpen && !menuOpen) {
      return undefined;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [notificationsOpen, menuOpen]);

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
        <Link to="/" className="wordmark" aria-label="StudyFlows home">
          <span className="logo-badge" aria-hidden="true">
            S
          </span>
          StudyFlows
        </Link>
      </div>

      <div className="header-right">
        <div ref={notificationsRef}>
          <button
            type="button"
            className="notifications-link"
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-expanded={notificationsOpen}
            aria-haspopup="menu"
          >
            Notifications {unreadCount !== null ? <strong>· {unreadCount}</strong> : null}
          </button>
          {notificationsOpen ? (
            <div className="notifications-menu" role="menu">
              {notifications.length === 0 ? (
                <p className="muted small-text notifications-empty">
                  No notifications yet. Missed sessions, upcoming exams and due revision
                  will show up here.
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
                <Link to="/revision" className="small-text" onClick={() => setNotificationsOpen(false)}>
                  Review revision plan →
                </Link>
              </div>
            </div>
          ) : null}
        </div>
        <div ref={menuRef}>
          <button
            type="button"
            className="avatar-button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            {initialsOf(user?.name ?? '')}
          </button>
          {menuOpen ? (
            <div className="avatar-menu" role="menu">
              <div className="avatar-menu-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <button type="button" role="menuitem" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
