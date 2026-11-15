import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, getErrorMessage, sessionsApi, spacesApi } from '../api';
import type {
  AnalyticsOverview,
  PerformanceReport,
  PerformanceTrend,
  RevisionRecommendation,
  StudySession,
  StudySpace,
} from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDateTime, formatMinutes } from '../utils/format';
import { parseNumericInput } from '../utils/numericInput';

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [performance, setPerformance] = useState<PerformanceReport | null>(null);
  const [performanceDays, setPerformanceDays] = useState('90');
  const [performanceSpaceId, setPerformanceSpaceId] = useState('');
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [acceptingRecommendation, setAcceptingRecommendation] = useState<string | null>(
    null,
  );
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState('');
  const [subject, setSubject] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');

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

  useEffect(() => {
    let active = true;
    setPerformanceLoading(true);
    analyticsApi
      .performance({
        days: Number(performanceDays),
        spaceId: performanceSpaceId || undefined,
      })
      .then((report) => {
        if (active) {
          setPerformance(report);
          setPerformanceError(null);
        }
      })
      .catch((requestError) => {
        if (active) {
          setPerformanceError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setPerformanceLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [performanceDays, performanceSpaceId]);

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

    const minutes = parseNumericInput(durationMinutes);
    if (minutes === null) {
      setError('Enter a study duration.');
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError('Duration must be between 1 and 1440 minutes.');
      return;
    }

    setLogging(true);
    try {
      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - minutes * 60_000);
      await sessionsApi.create({
        spaceId: spaceId || null,
        subject: subject.trim() || undefined,
        durationMinutes: minutes,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      });
      await refresh();
      setNotice(`Logged ${minutes} minutes of study time.`);
      setSubject('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLogging(false);
    }
  };

  const acceptRecommendation = async (recommendation: RevisionRecommendation) => {
    setError(null);
    setNotice(null);
    setAcceptingRecommendation(recommendation.id);
    try {
      const filters = {
        days: Number(performanceDays),
        spaceId: performanceSpaceId || undefined,
      };
      const result = await analyticsApi.acceptRecommendation(recommendation.id, filters);
      setNotice(
        result.created
          ? `Added "${recommendation.topicName}" to your revision schedule.`
          : `"${recommendation.topicName}" already has a revision schedule.`,
      );
      setPerformance(await analyticsApi.performance(filters));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAcceptingRecommendation(null);
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
  const trendLabel = (trend: PerformanceTrend): string => {
    if (trend.direction === 'insufficient') {
      return 'Not enough data yet';
    }
    if (trend.direction === 'improving') {
      return `Improving (${trend.previousAccuracy ?? 0}% to ${trend.recentAccuracy ?? 0}%)`;
    }
    if (trend.direction === 'declining') {
      return `Declining (${trend.previousAccuracy ?? 0}% to ${trend.recentAccuracy ?? 0}%)`;
    }
    return `Stable at ${trend.recentAccuracy ?? 0}%`;
  };

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

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Performance intelligence</h2>
            <p className="muted small-text">
              Accuracy, trends and evidence from graded quiz attempts in the selected
              period.
            </p>
          </div>
          <div className="performance-filters">
            <label className="field narrow">
              <span>Range</span>
              <select
                value={performanceDays}
                onChange={(event) => setPerformanceDays(event.target.value)}
              >
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 180 days</option>
                <option value="365">Last 365 days</option>
              </select>
            </label>
            <label className="field narrow">
              <span>Study space</span>
              <select
                value={performanceSpaceId}
                onChange={(event) => setPerformanceSpaceId(event.target.value)}
              >
                <option value="">All spaces</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <ErrorBanner
          message={performanceError}
          onDismiss={() => setPerformanceError(null)}
        />

        {performanceLoading ? (
          <p className="muted small-text">Calculating performance...</p>
        ) : performance ? (
          <div className="stack large">
            {!performance.analysis.dataQuality.reliable ? (
              <Notice>
                This report has limited evidence: only{' '}
                {performance.analysis.dataQuality.answeredQuestions} graded question(s)
                in the selected period. Complete more quizzes for reliable topic
                classification.
              </Notice>
            ) : null}

            <div className="stats-grid">
              <article className="stat-card">
                <span className="stat-label">Accuracy</span>
                <strong>{performance.analysis.overall.accuracy ?? '—'}%</strong>
                <span className="muted">
                  {performance.analysis.overall.correctAnswers} of{' '}
                  {performance.analysis.overall.answeredQuestions} correct
                </span>
              </article>
              <article className="stat-card">
                <span className="stat-label">Average attempt score</span>
                <strong>{performance.analysis.overall.averageAttemptScore ?? '—'}%</strong>
                <span className="muted">
                  {performance.analysis.overall.attemptCount} attempt(s)
                </span>
              </article>
              <article className="stat-card">
                <span className="stat-label">Performance trend</span>
                <strong>{trendLabel(performance.analysis.overall.trend)}</strong>
                <span className="muted">
                  {performance.analysis.overall.trend.recentQuestions} recent answer(s)
                </span>
              </article>
              <article className="stat-card">
                <span className="stat-label">Study consistency</span>
                <strong>
                  {performance.analysis.studyConsistency.activeDays}/
                  {performance.analysis.studyConsistency.daysInRange} days
                </strong>
                <span className="muted">
                  {formatMinutes(performance.analysis.studyConsistency.totalStudyMinutes)}{' '}
                  studied
                </span>
              </article>
            </div>

            <div className="split-grid">
              <section className="panel inset-panel">
                <div className="section-heading tight">
                  <h3>Subject accuracy</h3>
                  <span className="badge">
                    {performance.analysis.subjects.length} subject(s)
                  </span>
                </div>
                {performance.analysis.subjects.length === 0 ? (
                  <p className="muted small-text">
                    No graded attempts matched these filters.
                  </p>
                ) : (
                  <div className="stack">
                    {performance.analysis.subjects.map((subject) => (
                      <div key={subject.subject} className="breakdown-row">
                        <div className="section-heading tight">
                          <strong>{subject.subject}</strong>
                          <span className="badge">{subject.accuracy ?? '—'}%</span>
                        </div>
                        <ProgressBar
                          value={subject.accuracy ?? 0}
                          label={`${subject.correctAnswers}/${subject.answeredQuestions} correct`}
                        />
                        <span className="muted small-text">
                          {formatMinutes(subject.studyMinutes)} studied ·{' '}
                          {subject.attemptCount} attempt(s)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel inset-panel">
                <div className="section-heading tight">
                  <h3>Topic evidence</h3>
                  <span className="badge">
                    {performance.analysis.weakTopics.length} weak ·{' '}
                    {performance.analysis.strongTopics.length} strong
                  </span>
                </div>
                {performance.analysis.topics.length === 0 ? (
                  <p className="muted small-text">
                    No topic-level evidence in this period.
                  </p>
                ) : (
                  <div className="stack">
                    {[...performance.analysis.weakTopics, ...performance.analysis.strongTopics]
                      .slice(0, 6)
                      .map((topic) => (
                        <div key={topic.topicId} className="breakdown-row">
                          <div className="section-heading tight">
                            <strong>{topic.topicName}</strong>
                            <span
                              className={`badge ${
                                topic.classification === 'strong'
                                  ? 'success'
                                  : topic.classification === 'weak'
                                    ? 'danger'
                                    : ''
                              }`}
                            >
                              {topic.accuracy ?? '—'}%
                            </span>
                          </div>
                          <p className="muted small-text">
                            {topic.classification} · {topic.answeredQuestions} question(s) ·{' '}
                            {trendLabel(topic.trend)}
                          </p>
                          {topic.evidence.length > 0 ? (
                            <ul className="evidence-list">
                              {topic.evidence.slice(0, 3).map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </div>

            <section className="panel inset-panel">
              <div className="section-heading tight">
                <div>
                  <h3>Recommended revision</h3>
                  <p className="muted small-text">
                    Add at most one activity you choose. Recommendations use the same
                    revision schedule as the rest of the app.
                  </p>
                </div>
                <span className="badge">
                  {performance.recommendations.length} suggestion(s)
                </span>
              </div>
              {performance.recommendations.length === 0 ? (
                <p className="muted small-text">
                  No revision recommendations for this period.
                </p>
              ) : (
                <div className="stack">
                  {performance.recommendations.map((recommendation) => (
                    <article key={recommendation.id} className="recommendation-card">
                      <div className="section-heading tight">
                        <div>
                          <strong>{recommendation.title}</strong>
                          <p className="muted small-text">{recommendation.description}</p>
                        </div>
                        <span className={`badge priority-${recommendation.priority}`}>
                          {recommendation.priority} priority
                        </span>
                      </div>
                      <p className="small-text">{recommendation.reason}</p>
                      <ul className="evidence-list">
                        {recommendation.evidence.slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <div className="recommendation-actions">
                        <span className="muted small-text">
                          {recommendation.suggestedMinutes} minutes suggested
                        </span>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={
                            !recommendation.addable ||
                            recommendation.alreadyScheduled ||
                            acceptingRecommendation === recommendation.id
                          }
                          onClick={() => void acceptRecommendation(recommendation)}
                        >
                          {recommendation.alreadyScheduled
                            ? 'Already scheduled'
                            : acceptingRecommendation === recommendation.id
                              ? 'Adding...'
                              : 'Add to revision'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {performance.analysis.dataQuality.limitations.length > 0 ? (
              <details className="panel inset-panel">
                <summary>Data limitations</summary>
                <ul className="evidence-list">
                  {performance.analysis.dataQuality.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
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
                onChange={(event) => setDurationMinutes(event.target.value)}
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
