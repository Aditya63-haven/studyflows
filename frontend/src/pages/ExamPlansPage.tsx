import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examPlansApi, getErrorMessage } from '../api';
import type { ExamPlan, ExamTopicInput } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDate } from '../utils/format';
import { parseNumericInput } from '../utils/numericInput';

interface TopicDraft {
  key: string;
  name: string;
  description: string;
  estimatedMinutes: string;
}

const createTopic = (): TopicDraft => ({
  key: crypto.randomUUID(),
  name: '',
  description: '',
  estimatedMinutes: '45',
});

export const ExamPlansPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyStudyHours, setDailyStudyHours] = useState('2');
  const [topics, setTopics] = useState<TopicDraft[]>([createTopic()]);

  useEffect(() => {
    let active = true;
    examPlansApi
      .list()
      .then((result) => {
        if (active) {
          setPlans(result);
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
  }, []);

  const updateTopic = (key: string, patch: Partial<TopicDraft>) => {
    setTopics((current) =>
      current.map((topic) => (topic.key === key ? { ...topic, ...patch } : topic)),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!examDate) {
      setError('Choose an exam date.');
      return;
    }
    if (topics.length === 0) {
      setError('Add at least one topic.');
      return;
    }

    const hours = parseNumericInput(dailyStudyHours);
    if (hours === null) {
      setError('Enter daily study hours.');
      return;
    }
    if (hours < 0.5 || hours > 24) {
      setError('Daily study hours must be between 0.5 and 24.');
      return;
    }

    const topicInputs: ExamTopicInput[] = [];
    for (const [index, topic] of topics.entries()) {
      const estimatedMinutes = parseNumericInput(topic.estimatedMinutes);
      if (
        estimatedMinutes !== null &&
        (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1 || estimatedMinutes > 1440)
      ) {
        setError(`Topic ${index + 1} minutes must be between 1 and 1440.`);
        return;
      }
      topicInputs.push({
        name: topic.name,
        description: topic.description || undefined,
        ...(estimatedMinutes !== null ? { estimatedMinutes } : {}),
      });
    }

    setSaving(true);
    try {
      const plan = await examPlansApi.create({
        name,
        examDate: new Date(`${examDate}T00:00:00`).toISOString(),
        dailyStudyHours: hours,
        topics: topicInputs,
      });
      navigate(`/exam-plans/${plan.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading label="Loading exam plans..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Exam planning"
        title="Exam plans"
        description="Turn a topic list and exam date into a day-by-day study schedule."
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Create an exam plan</h2>
            <p className="muted small-text">
              Topics are distributed across days based on your daily study hours.
            </p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Exam name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Data Structures Final"
                required
              />
            </label>
            <label className="field">
              <span>Exam date</span>
              <input
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Daily study hours</span>
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={dailyStudyHours}
                onChange={(event) => setDailyStudyHours(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="section-heading">
            <div>
              <h3>Topics</h3>
              <p className="muted small-text">{topics.length} topic(s)</p>
            </div>
            <button
              type="button"
              className="button small secondary"
              onClick={() => setTopics((current) => [...current, createTopic()])}
            >
              Add topic
            </button>
          </div>

          {topics.map((topic, index) => (
            <div key={topic.key} className="topic-editor-row">
              <label className="field grow">
                <span>Topic {index + 1}</span>
                <input
                  value={topic.name}
                  onChange={(event) => updateTopic(topic.key, { name: event.target.value })}
                  placeholder="Topic name"
                  required
                />
              </label>
              <label className="field grow">
                <span>Description</span>
                <input
                  value={topic.description}
                  onChange={(event) =>
                    updateTopic(topic.key, { description: event.target.value })
                  }
                  placeholder="Optional focus area"
                />
              </label>
              <label className="field narrow">
                <span>Minutes</span>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={topic.estimatedMinutes}
                  onChange={(event) =>
                    updateTopic(topic.key, { estimatedMinutes: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="button small danger"
                onClick={() =>
                  setTopics((current) => current.filter((item) => item.key !== topic.key))
                }
                disabled={topics.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Building plan...' : 'Build exam plan'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Your plans</h2>
          <span className="badge">{plans.length}</span>
        </div>
        {plans.length === 0 ? (
          <EmptyState
            title="No exam plans yet"
            description="Create your first plan above to get a day-by-day schedule."
          />
        ) : (
          <div className="card-grid">
            {plans.map((plan) => (
              <article key={plan.id} className="mini-card">
                <span className="eyebrow">{formatDate(plan.examDate)}</span>
                <h3>
                  <Link to={`/exam-plans/${plan.id}`}>{plan.name}</Link>
                </h3>
                <p className="muted small-text">
                  {plan.topics.length} topics - {plan.dailyStudyHours} hr/day
                </p>
                <ProgressBar value={plan.progress} label={`${plan.progress}%`} />
                <p className="muted small-text">
                  {plan.daysRemaining >= 0
                    ? `${plan.daysRemaining} day(s) remaining`
                    : `${Math.abs(plan.daysRemaining)} day(s) past`}
                </p>
                <Link className="button small" to={`/exam-plans/${plan.id}`}>
                  Open plan
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
