import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  assistantApi,
  attentionApi,
  examPlansApi,
  getErrorMessage,
  revisionApi,
  sessionsApi,
} from '../api';
import type {
  AssistantProposal,
  AttentionItem,
  ExamPlan,
  RevisionDashboard,
  StudySession,
} from '../api/types';
import { AlertCard } from '../components/AlertCard';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { ProgressBar } from '../components/ProgressBar';
import { SessionCard } from '../components/SessionCard';
import { Toast } from '../components/Toast';
import {
  availabilityApi,
  currentDayIndex,
  dayWindowMinutes,
  formatTimeLabel,
  timeToMinutes,
  type DayAvailability,
  type SessionPreferences,
} from '../availability/availabilityApi';
import { formatDate } from '../utils/format';

interface PlannedSession {
  key: string;
  title: string;
  durationMinutes: number;
  chips: string[];
  metaSuffix: string;
  record: () => void | Promise<void>;
  detailsTo: string;
}

const todayEyebrow = (): string =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();

const isToday = (value: string): boolean => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const sameLocalDay = (value: string, reference: Date): boolean => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
};

const importanceFor = (daysRemaining: number): string => {
  if (daysRemaining <= 3) {
    return 'High importance';
  }
  if (daysRemaining <= 7) {
    return 'Medium importance';
  }
  return 'Planned';
};

const DEFAULT_PREFERENCES: SessionPreferences = {
  sessionLengthMinutes: 45,
  breakLengthMinutes: 10,
};

const DEFAULT_DAY: DayAvailability = {
  mode: 'budget',
  budgetMinutes: 120,
  windows: [],
  unavailable: false,
};

const withTimeRanges = <T extends { durationMinutes: number }>(
  sessions: T[],
  day: DayAvailability,
  preferences: SessionPreferences,
): Array<T & { range: string }> => {
  const windows =
    day.mode === 'budget-windows' && day.windows.length > 0
      ? day.windows.map((window) => ({
          start: timeToMinutes(window.start),
          end: timeToMinutes(window.end),
        }))
      : [
          {
            start: 16 * 60,
            end: 16 * 60 + Math.max(day.budgetMinutes, 60),
          },
        ];

  let cursor = windows[0].start;
  let windowEnd = windows[0].end;
  let windowIndex = 0;

  return sessions.map((session) => {
    if (cursor + session.durationMinutes > windowEnd && windowIndex < windows.length - 1) {
      windowIndex += 1;
      cursor = windows[windowIndex].start;
      windowEnd = windows[windowIndex].end;
    }
    const start = cursor;
    cursor += session.durationMinutes + preferences.breakLengthMinutes;
    return {
      ...session,
      range: `${formatTimeLabel(start)}-${formatTimeLabel(start + session.durationMinutes)}`,
    };
  });
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [revision, setRevision] = useState<RevisionDashboard | null>(null);
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [dayAvailability, setDayAvailability] = useState<DayAvailability>(DEFAULT_DAY);
  const [preferences, setPreferences] = useState<SessionPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [applying, setApplying] = useState(false);
  const [recording, setRecording] = useState(false);

  const refreshAttention = () => {
    attentionApi
      .list()
      .then((report) => setAttentionItems(report.items))
      .catch(() => setAttentionItems([]));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      revisionApi.dashboard(),
      examPlansApi.list(),
      sessionsApi.list(),
      attentionApi.list(),
      availabilityApi.getWeek(),
      availabilityApi.getPreferences(),
    ])
      .then(([revisionData, planList, sessionList, attention, week, storedPreferences]) => {
        if (!active) {
          return;
        }
        setRevision(revisionData);
        setPlans(planList);
        setSessions(sessionList);
        setAttentionItems(attention.items);
        setDayAvailability(week[currentDayIndex()] ?? DEFAULT_DAY);
        setPreferences(storedPreferences);
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

  const budgetMinutes = dayAvailability.unavailable ? 0 : dayAvailability.budgetMinutes;
  const studiedToday = useMemo(
    () =>
      sessions
        .filter((session) => isToday(session.startedAt))
        .reduce((total, session) => total + session.durationMinutes, 0),
    [sessions],
  );
  const remaining = Math.max(0, budgetMinutes - studiedToday);

  const examSessions = useMemo(() => {
    const today = new Date();
    return plans.flatMap((plan) => {
      const topicById = new Map(plan.topics.map((topic) => [topic.id, topic]));
      const day = plan.studyDays.find((studyDay) => sameLocalDay(studyDay.date, today));
      if (!day) {
        return [];
      }
      return day.topicIds
        .filter((topicId) => !day.completedTopicIds.includes(topicId))
        .map((topicId) => {
          const topic = topicById.get(topicId);
          return {
            key: `${plan.id}:${day.id}:${topicId}`,
            title: topic?.name ?? 'Topic',
            durationMinutes: topic?.estimatedMinutes ?? 45,
            chips: [plan.name, importanceFor(plan.daysRemaining)],
            metaSuffix: `Exam ${formatDate(plan.examDate)}`,
            planId: plan.id,
            dayId: day.id,
            topicId,
            topicName: topic?.name ?? 'Topic',
          };
        });
    });
  }, [plans]);

  const revisionSessions = useMemo(() => {
    if (!revision) {
      return [];
    }
    return revision.dueToday.map((schedule) => ({
      key: `revision:${schedule.id}`,
      title: `Review ${schedule.topicName}`,
      durationMinutes: preferences.sessionLengthMinutes,
      chips: ['Revision', 'Due today'],
      metaSuffix: `Next review ${formatDate(schedule.nextReviewAt)}`,
      scheduleId: schedule.id,
    }));
  }, [revision, preferences.sessionLengthMinutes]);

  const recordExamTopic = async (session: (typeof examSessions)[number]) => {
    setRecording(true);
    setError(null);
    try {
      const updated = await examPlansApi.markTopicComplete(
        session.planId,
        session.topicId,
        session.dayId,
      );
      setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
      setToast(`Recorded "${session.topicName}" as complete.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRecording(false);
    }
  };

  const sendCommand = async () => {
    const text = command.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    setError(null);
    setProposal(null);
    try {
      const result = await assistantApi.command(text);
      if (result.understood && result.needsConfirmation) {
        setProposal(result);
      } else {
        setToast(result.response);
      }
      setCommand('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const confirmProposal = async () => {
    if (!proposal?.planId || !proposal.strategy || applying) {
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const { examPlan, applied } = await assistantApi.apply(
        proposal.planId,
        proposal.strategy,
      );
      setPlans((current) => current.map((plan) => (plan.id === examPlan.id ? examPlan : plan)));
      setToast(`Moved ${applied.minutes} minutes to ${formatDate(applied.targetDate)}.`);
      setProposal(null);
      refreshAttention();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setApplying(false);
    }
  };

  const applySuggestion = async (item: AttentionItem, strategy: AttentionItem['suggestions'][number]['strategy']) => {
    if (applying) {
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const { examPlan, applied } = await attentionApi.apply(item.id, strategy);
      setPlans((current) => current.map((plan) => (plan.id === examPlan.id ? examPlan : plan)));
      setToast(`${item.planName}: moved ${applied.minutes} minutes to ${formatDate(applied.targetDate)}.`);
      setAttentionItems((current) => current.filter((entry) => entry.id !== item.id));
      refreshAttention();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setApplying(false);
    }
  };

  const plannedSessions: PlannedSession[] = useMemo(() => {
    const examItems: PlannedSession[] = examSessions.map((session) => ({
      key: session.key,
      title: session.title,
      durationMinutes: session.durationMinutes,
      chips: session.chips,
      metaSuffix: session.metaSuffix,
      record: () => void recordExamTopic(session),
      detailsTo: `/exam-plans/${session.planId}`,
    }));
    const revisionItems: PlannedSession[] = revisionSessions.map((session) => ({
      key: session.key,
      title: session.title,
      durationMinutes: session.durationMinutes,
      chips: session.chips,
      metaSuffix: session.metaSuffix,
      record: () => navigate('/revision'),
      detailsTo: '/revision',
    }));
    return [...examItems, ...revisionItems];
  }, [examSessions, revisionSessions, navigate]);

  const timedSessions = useMemo(
    () => withTimeRanges(plannedSessions, dayAvailability, preferences),
    [plannedSessions, dayAvailability, preferences],
  );

  const awaitingUpdate = examSessions.length;

  const urgentPlan = useMemo(() => {
    const upcoming = plans
      .filter((plan) => plan.daysRemaining >= 0)
      .sort((left, right) => left.daysRemaining - right.daysRemaining);
    return upcoming[0] ?? null;
  }, [plans]);

  const incompleteTopics = useMemo(() => {
    if (!urgentPlan) {
      return 0;
    }
    const completed = new Set(urgentPlan.studyDays.flatMap((day) => day.completedTopicIds));
    return urgentPlan.topics.filter((topic) => !completed.has(topic.id)).length;
  }, [urgentPlan]);

  const needsRevisionCount = revision?.needsRevision.length ?? 0;

  if (loading) {
    return <Loading label="Loading your dashboard..." />;
  }

  return (
    <div className="stack large">
      <header className="page-header">
        <div>
          <p className="eyebrow">{todayEyebrow()}</p>
          <h1>A little progress, every day.</h1>
          <p className="muted">Here's your study plan for today.</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button"
            onClick={() => navigate('/availability')}
          >
            Review adjustment
          </button>
        </div>
      </header>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form
        className="command-bar"
        onSubmit={(event) => {
          event.preventDefault();
          void sendCommand();
        }}
      >
        <span className="command-sparkle" aria-hidden="true">
          ✦
        </span>
        <input
          type="text"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="e.g. Move unfinished Maths work to the weekend"
          aria-label="Ask the study assistant"
        />
        <button type="submit" className="button secondary" disabled={sending}>
          {sending ? 'Thinking...' : 'Send'}
        </button>
      </form>

      {proposal && proposal.understood ? (
        <div className="assistant-proposal">
          <strong>{proposal.response}</strong>
          {proposal.suggestion ? (
            <p className="muted small-text">{proposal.suggestion.description}</p>
          ) : null}
          <div className="form-actions">
            <Button onClick={() => void confirmProposal()} disabled={applying}>
              {applying ? 'Applying...' : 'Confirm change'}
            </Button>
            <Button variant="secondary" onClick={() => setProposal(null)} disabled={applying}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="split-grid">
        <Card>
          <div className="capacity-line">
            <h2>Today's sessions</h2>
            <p className="muted small-text">
              {studiedToday} min / {budgetMinutes} min available
            </p>
          </div>
          <ProgressBar
            value={budgetMinutes > 0 ? Math.min(100, (studiedToday / budgetMinutes) * 100) : 0}
            label={`${Math.min(studiedToday, budgetMinutes)}/${budgetMinutes}`}
          />
          <p className="muted small-text capacity-note">
            {remaining > 0
              ? `${remaining} minute${remaining === 1 ? '' : 's'} of study capacity remain.`
              : 'Your study budget for today is used up.'}
          </p>
          <div className="stack session-list">
            {timedSessions.length === 0 ? (
              <EmptyState
                title="No sessions planned today"
                description="Mark an exam plan topic or finish a quiz review to see sessions here."
                actionLabel="Plan your day"
                actionTo="/availability"
              />
            ) : (
              timedSessions.map((session) => (
                <SessionCard
                  key={session.key}
                  chips={session.chips}
                  title={session.title}
                  meta={`${session.range} · ${session.durationMinutes} minutes · ${session.metaSuffix}`}
                  onRecord={session.record}
                  recordDisabled={recording}
                  onDetails={() => navigate(session.detailsTo)}
                />
              ))
            )}
          </div>
        </Card>

        <Card title="Needs attention">
          {attentionItems.length > 0 ? (
            <div className="stack attention-list">
              {attentionItems.map((item) => (
                <div key={item.id} className="attention-item">
                  <AlertCard title={item.title}>{item.description}</AlertCard>
                  {item.suggestions.length > 0 ? (
                    <div className="attention-suggestions">
                      {item.suggestions.map((suggestion) => (
                        <Button
                          key={suggestion.strategy}
                          variant="warning"
                          small
                          disabled={applying}
                          onClick={() => void applySuggestion(item, suggestion.strategy)}
                        >
                          {suggestion.label} · {formatDate(suggestion.targetDate)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : urgentPlan && urgentPlan.daysRemaining <= 7 ? (
            <AlertCard
              title={`${urgentPlan.name} needs adjusting`}
              actionLabel="Review adjusted plan"
              onAction={() => navigate(`/exam-plans/${urgentPlan.id}`)}
            >
              Your exam is in {urgentPlan.daysRemaining} day
              {urgentPlan.daysRemaining === 1 ? '' : 's'} and {incompleteTopics} topic
              {incompleteTopics === 1 ? '' : 's'} still need work.
            </AlertCard>
          ) : needsRevisionCount > 0 ? (
            <AlertCard
              title="Revision needs adjusting"
              actionLabel="Review adjusted plan"
              onAction={() => navigate('/revision')}
            >
              {needsRevisionCount} topic{needsRevisionCount === 1 ? '' : 's'} fell below target
              memory strength and should be revisited soon.
            </AlertCard>
          ) : (
            <p className="muted small-text">
              Nothing needs attention right now. Keep up the steady progress.
            </p>
          )}

          {awaitingUpdate > 0 ? (
            <div className="stack awaiting-section">
              <h3>
                {awaitingUpdate} session{awaitingUpdate === 1 ? '' : 's'} awaiting update
              </h3>
              <p className="muted small-text">
                Marking topics complete keeps your exam plan progress and daily schedule on track.
              </p>
              <Link to="/tasks" className="small-text">
                Update progress →
              </Link>
            </div>
          ) : null}

          <p className="footnote">
            {dayAvailability.unavailable
              ? 'Today is marked unavailable in your study availability.'
              : dayAvailability.mode === 'budget-windows' && dayWindowMinutes(dayAvailability) > 0
                ? `Planned against ${dayWindowMinutes(dayAvailability)} minutes of exact windows.`
                : `Planned against a ${budgetMinutes}-minute daily budget.`}
          </p>
        </Card>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
};
