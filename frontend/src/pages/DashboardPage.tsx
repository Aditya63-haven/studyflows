import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  analyticsApi,
  getErrorMessage,
  revisionApi,
  spacesApi,
} from '../api';
import type { AnalyticsOverview, RevisionDashboard, StudySpace } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDate, formatMinutes } from '../utils/format';

export const DashboardPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [revision, setRevision] = useState<RevisionDashboard | null>(null);
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([analyticsApi.overview(), revisionApi.dashboard(), spacesApi.list()])
      .then(([overview, dashboard, spaceList]) => {
        if (!active) {
          return;
        }
        setAnalytics(overview);
        setRevision(dashboard);
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
    return <Loading label="Loading your dashboard..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Dashboard"
        title="Your study overview"
        description="Keep an eye on study time, quiz performance and what needs revision."
        actions={
          <>
            <Link className="button secondary" to="/analytics">
              Log study time
            </Link>
            <Link className="button" to="/spaces">
              Open spaces
            </Link>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {analytics ? (
        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-label">Study time</span>
            <strong>{formatMinutes(analytics.totalStudyMinutes)}</strong>
            <span className="muted">{analytics.totalSessions} sessions</span>
          </article>
          <article className="stat-card">
            <span className="stat-label">Current streak</span>
            <strong>{analytics.streakDays} days</strong>
            <span className="muted">Keep it going</span>
          </article>
          <article className="stat-card">
            <span className="stat-label">Average quiz score</span>
            <strong>{analytics.averageQuizScore}%</strong>
            <span className="muted">{analytics.quizAttemptCount} attempts</span>
          </article>
          <article className="stat-card">
            <span className="stat-label">Due today</span>
            <strong>{analytics.dueToday}</strong>
            <span className="muted">{analytics.masteredTopics} topics mastered</span>
          </article>
        </section>
      ) : null}

      <div className="split-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Due for revision</h2>
            <Link to="/revision">View all</Link>
          </div>
          {revision && revision.dueToday.length > 0 ? (
            <div className="stack">
              {revision.dueToday.slice(0, 4).map((schedule) => (
                <div key={schedule.id} className="list-row">
                  <div>
                    <strong>{schedule.topicName}</strong>
                    <p className="muted small-text">
                      Next review {formatDate(schedule.nextReviewAt)}
                    </p>
                  </div>
                  <div className="strength">
                    <ProgressBar value={schedule.memoryStrength} />
                    <span>{schedule.memoryStrength}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing due today"
              description="Take a quiz or wait for your next scheduled review."
            />
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Your spaces</h2>
            <Link to="/spaces">Manage</Link>
          </div>
          {spaces.length > 0 ? (
            <div className="stack">
              {spaces.slice(0, 4).map((space) => (
                <Link key={space.id} to={`/spaces/${space.id}`} className="list-row link-row">
                  <div>
                    <strong>{space.name}</strong>
                    <p className="muted small-text">{space.subject}</p>
                  </div>
                  <span className="badge">{space.subject}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No spaces yet"
              description="Create a space for a subject to start adding notes and quizzes."
              actionLabel="Create a space"
              actionTo="/spaces"
            />
          )}
        </section>
      </div>
    </div>
  );
};
