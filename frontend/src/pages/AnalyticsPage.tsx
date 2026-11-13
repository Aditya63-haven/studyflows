import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, getErrorMessage, sessionsApi, spacesApi } from '../api';
import type {
  AnalyticsOverview,
  StudySession,
  StudySpace,
} from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDateTime, formatMinutes } from '../utils/format';

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);

  useEffect(() => {
    let active = true;
    Promise.all([analyticsApi.overview(), spacesApi.list(), sessionsApi.list()])
      .then(([overview, spaceList, sessionList]) => {
        if (!active) {
          return;
        }
        setAnalytics(overview);
        setSpaces(spaceList);
        setSessions(sessionList);
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

  const refresh = async () => {
    const [overview, sessionList] = await Promise.all([
      analyticsApi.overview(),
      sessionsApi.list(),
    ]);
    setAnalytics(overview);
    setSessions(sessionList);
  };

  const logSession = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLogging(true);
    try {
      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - durationMinutes * 60_000);
      await sessionsApi.create({
        spaceId: spaceId || null,
        subject: subject.trim() || undefined,
        durationMinutes,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      });
      await refresh();
      setNotice(`Logged ${durationMinutes} minutes of study time.`);
      setSubject('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLogging(false);
    }
  };

  if (loading) {
    return <Loading label="Crunching your analytics..." />;
  }

  if (!analytics) {
    return (
      <EmptyState
        title="Analytics unavailable"
        description={error ?? 'Try again in a moment.'}
        actionLabel="Back to dashboard"
        actionTo="/dashboard"
      />
    );
  }

  const maxSubjectMinutes = Math.max(
    1,
    ...analytics.subjectBreakdown.map((entry) => entry.studyMinutes),
  );
  const spaceById = new Map(spaces.map((space) => [space.id, space]));

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Analytics"
        title="Study insights"
        description="Study time, streaks, score trends and the topics that need more attention."
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Total study time</span>
          <strong>{formatMinutes(analytics.totalStudyMinutes)}</strong>
          <span className="muted">{analytics.totalSessions} sessions</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Streak</span>
          <strong>{analytics.streakDays} days</strong>
          <span className="muted">Consecutive study days</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Average quiz score</span>
          <strong>{analytics.averageQuizScore}%</strong>
          <span className="muted">{analytics.quizAttemptCount} attempts</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Revision health</span>
          <strong>{analytics.dueToday} due</strong>
          <span className="muted">{analytics.masteredTopics} mastered</span>
        </article>
      </section>

      <div className="split-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Study time by subject</h2>
              <p className="muted small-text">Based on logged study sessions.</p>
            </div>
          </div>
          {analytics.subjectBreakdown.length === 0 ? (
            <EmptyState
              title="No study sessions yet"
              description="Log a session using the form below."
            />
          ) : (
            <div className="stack">
              {analytics.subjectBreakdown.map((entry) => (
                <div key={entry.subject} className="breakdown-row">
                  <div className="section-heading tight">
                    <strong>{entry.subject || 'Unlabelled'}</strong>
                    <span className="muted small-text">
                      {formatMinutes(entry.studyMinutes)} - {entry.sessionCount} session(s)
                    </span>
                  </div>
                  <ProgressBar
                    value={(entry.studyMinutes / maxSubjectMinutes) * 100}
                    label={formatMinutes(entry.studyMinutes)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Log study time</h2>
              <p className="muted small-text">Add a completed study session.</p>
            </div>
          </div>
          <form className="stack" onSubmit={logSession}>
            <label className="field">
              <span>Study space</span>
              <select value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>
                <option value="">No specific space</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name} ({space.subject})
                  </option>
                ))}
              </select>
            </label>
            {!spaceId ? (
              <label className="field">
                <span>Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="e.g. Biology"
                />
              </label>
            ) : null}
            <label className="field">
              <span>Duration (minutes)</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                required
              />
            </label>
            <button className="button" type="submit" disabled={logging}>
              {logging ? 'Logging...' : 'Log session'}
            </button>
          </form>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Quiz score trend</h2>
              <p className="muted small-text">Most recent attempts first.</p>
            </div>
            <Link to="/spaces">Take a quiz</Link>
          </div>
          {analytics.scoreTrend.length === 0 ? (
            <EmptyState title="No quiz attempts yet" description="Complete a quiz to see your trend." />
          ) : (
            <div className="stack">
              {analytics.scoreTrend.map((point, index) => (
                <div key={`${point.quizId}-${index}`} className="trend-row">
                  <div className="section-heading tight">
                    <span>{point.quizTitle}</span>
                    <strong>{point.percentage}%</strong>
                  </div>
                  <ProgressBar value={point.percentage} />
                  <span className="muted small-text">{formatDateTime(point.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Weak topics</h2>
              <p className="muted small-text">Low memory strength needs attention.</p>
            </div>
            <Link to="/revision">Revise</Link>
          </div>
          {analytics.weakTopics.length === 0 ? (
            <EmptyState
              title="No weak topics"
              description="Your revision schedules are currently healthy."
            />
          ) : (
            <div className="stack">
              {analytics.weakTopics.map((topic) => (
                <div key={topic.topicId} className="breakdown-row">
                  <div className="section-heading tight">
                    <strong>{topic.topicName}</strong>
                    <span className="badge">{topic.memoryStrength}%</span>
                  </div>
                  <ProgressBar value={topic.memoryStrength} />
                  <span className="muted small-text">
                    Next review {formatDateTime(topic.nextReviewAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Recent sessions</h2>
            <p className="muted small-text">Your latest logged study time.</p>
          </div>
          <span className="badge">{sessions.length}</span>
        </div>
        {sessions.length === 0 ? (
          <EmptyState title="No sessions recorded" description="Use the form above to log study time." />
        ) : (
          <div className="stack">
            {sessions.slice(0, 8).map((session) => (
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
      </section>

      {analytics.recentQuizEvents.length > 0 ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Recent quiz activity</h2>
          </div>
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
        </section>
      ) : null}
    </div>
  );
};
