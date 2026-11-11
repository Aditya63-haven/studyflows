import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { examPlansApi, getErrorMessage } from '../api';
import type { ExamPlan } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDate, formatMinutes } from '../utils/format';

export const ExamPlanDetailPage = () => {
  const { planId = '' } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ExamPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    examPlansApi
      .get(planId)
      .then((result) => {
        if (active) {
          setPlan(result);
        }
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
  }, [planId]);

  const markComplete = async (dayId: string, topicId: string, topicName: string) => {
    const key = `${dayId}:${topicId}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await examPlansApi.markTopicComplete(planId, topicId, dayId);
      setPlan(updated);
      setNotice(`Marked "${topicName}" complete.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  };

  const deletePlan = async () => {
    if (!plan || !window.confirm(`Delete "${plan.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await examPlansApi.remove(plan.id);
      navigate('/exam-plans');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <Loading label="Loading exam plan..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        title="Exam plan not found"
        description={error ?? 'It may have been deleted.'}
        actionLabel="Back to exam plans"
        actionTo="/exam-plans"
      />
    );
  }

  const topicById = new Map(plan.topics.map((topic) => [topic.id, topic]));
  const completedTopicIds = new Set(
    plan.studyDays.flatMap((day) => day.completedTopicIds),
  );

  return (
    <div className="stack large">
      <PageHeader
        eyebrow={`Exam on ${formatDate(plan.examDate)}`}
        title={plan.name}
        description={`${plan.topics.length} topics - ${plan.dailyStudyHours} study hour(s) per day`}
        actions={
          <>
            <Link className="button secondary" to="/exam-plans">
              All plans
            </Link>
            <button type="button" className="button small danger" onClick={() => void deletePlan()}>
              Delete plan
            </button>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <section className="panel stack">
        <div className="section-heading">
          <div>
            <h2>Overall progress</h2>
            <p className="muted small-text">
              {completedTopicIds.size} of {plan.topics.length} topics complete -{' '}
              {plan.daysRemaining >= 0
                ? `${plan.daysRemaining} day(s) remaining`
                : `${Math.abs(plan.daysRemaining)} day(s) past`}
            </p>
          </div>
          <span className="badge">{plan.progress}%</span>
        </div>
        <ProgressBar value={plan.progress} label={`${plan.progress}%`} />
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Topics</h2>
          <span className="badge">{plan.topics.length}</span>
        </div>
        {plan.topics.length === 0 ? (
          <EmptyState title="No topics" description="This plan does not contain topics." />
        ) : (
          <div className="tag-row">
            {plan.topics.map((topic) => (
              <span
                key={topic.id}
                className={completedTopicIds.has(topic.id) ? 'topic-pill complete' : 'topic-pill'}
              >
                {topic.name}
                <small>{formatMinutes(topic.estimatedMinutes)}</small>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        <div className="section-heading">
          <div>
            <h2>Daily schedule</h2>
            <p className="muted small-text">Mark topics complete as you finish them.</p>
          </div>
        </div>

        {plan.studyDays.length === 0 ? (
          <EmptyState
            title="No study days"
            description="There are no scheduled study days for this plan."
          />
        ) : (
          plan.studyDays.map((day, index) => (
            <article key={day.id} className={day.isComplete ? 'panel day-card complete' : 'panel day-card'}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Day {index + 1}</span>
                  <h3>{formatDate(day.date)}</h3>
                  <p className="muted small-text">
                    {formatMinutes(day.plannedMinutes)} planned - {day.completedTopicIds.length}/
                    {day.topicIds.length} topics complete
                  </p>
                </div>
                <span className={day.isComplete ? 'badge success' : 'badge'}>
                  {day.progress}%
                </span>
              </div>
              <ProgressBar value={day.progress} />
              <div className="stack">
                {day.topicIds.map((topicId) => {
                  const topic = topicById.get(topicId);
                  const complete = day.completedTopicIds.includes(topicId);
                  const key = `${day.id}:${topicId}`;
                  return (
                    <div key={topicId} className="topic-row">
                      <div>
                        <strong>{topic?.name ?? 'Topic'}</strong>
                        {topic?.description ? (
                          <p className="muted small-text">{topic.description}</p>
                        ) : null}
                        <span className="muted small-text">
                          {topic ? formatMinutes(topic.estimatedMinutes) : 'Unknown duration'}
                        </span>
                      </div>
                      {complete ? (
                        <span className="badge success">Complete</span>
                      ) : (
                        <button
                          type="button"
                          className="button small"
                          onClick={() => void markComplete(day.id, topicId, topic?.name ?? 'Topic')}
                          disabled={busyKey !== null}
                        >
                          {busyKey === key ? 'Saving...' : 'Mark complete'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};
