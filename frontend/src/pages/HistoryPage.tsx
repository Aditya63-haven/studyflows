import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, getErrorMessage, sessionsApi, spacesApi } from '../api';
import type { AnalyticsOverview, StudySession, StudySpace } from '../api/types';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, formatMinutes } from '../utils/format';

export const HistoryPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([analyticsApi.overview(), sessionsApi.list(), spacesApi.list()])
      .then(([overview, sessionList, spaceList]) => {
        if (!active) {
          return;
        }
        setAnalytics(overview);
        setSessions(sessionList);
        setSpaces(spaceList);
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <Loading label="Loading your history..." />;
  }

  const spaceById = new Map(spaces.map((space) => [space.id, space]));

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Progress & history"
        title="Your study history"
        description="Every logged study session and quiz attempt, newest first."
        actions={
          <Link className="button secondary" to="/analytics">
            Open analytics
          </Link>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Study time</span>
          <strong>{formatMinutes(analytics?.totalStudyMinutes ?? 0)}</strong>
          <span className="muted">{analytics?.totalSessions ?? 0} sessions</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Quiz attempts</span>
          <strong>{analytics?.quizAttemptCount ?? 0}</strong>
          <span className="muted">{analytics?.averageQuizScore ?? 0}% average</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Current streak</span>
          <strong>{analytics?.streakDays ?? 0} days</strong>
          <span className="muted">Keep it going</span>
        </article>
      </section>

      <Card title="Study sessions" actions={<span className="badge">{sessions.length}</span>}>
        {sessions.length === 0 ? (
          <EmptyState
            title="No sessions recorded"
            description="Log study time from the analytics page to build your history."
            actionLabel="Open analytics"
            actionTo="/analytics"
          />
        ) : (
          <div className="stack">
            {sessions.map((session) => (
              <div key={session.id} className="list-row">
                <div>
                  <strong>
                    {session.subject ||
                      (session.spaceId ? spaceById.get(session.spaceId)?.subject : '') ||
                      'Study session'}
                  </strong>
                  <p className="muted small-text">{formatDateTime(session.startedAt)}</p>
                </div>
                <div className="align-right">
                  <strong>{formatMinutes(session.durationMinutes)}</strong>
                  <p className="muted small-text">
                    {session.spaceId ? spaceById.get(session.spaceId)?.name ?? 'Space' : 'No space'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Recent quiz attempts">
        {!analytics || analytics.recentQuizEvents.length === 0 ? (
          <EmptyState
            title="No quiz attempts yet"
            description="Complete a quiz to start building your attempt history."
            actionLabel="Find a quiz"
            actionTo="/tasks"
          />
        ) : (
          <div className="stack">
            {analytics.recentQuizEvents.map((event, index) => (
              <div key={`${event.quizId}-${index}`} className="list-row">
                <div>
                  <strong>{event.quizTitle}</strong>
                  <p className="muted small-text">{formatDateTime(event.occurredAt)}</p>
                </div>
                <span className="badge">{event.percentage}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
