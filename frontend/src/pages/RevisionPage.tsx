import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, revisionApi } from '../api';
import type {
  ReviewRating,
  RevisionDashboard,
  RevisionSchedule,
} from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDate } from '../utils/format';

const ratings: Array<{ value: ReviewRating; label: string; className: string }> = [
  { value: 'again', label: 'Again', className: 'danger' },
  { value: 'hard', label: 'Hard', className: 'secondary' },
  { value: 'good', label: 'Good', className: '' },
  { value: 'easy', label: 'Easy', className: 'success' },
];

export const RevisionPage = () => {
  const [dashboard, setDashboard] = useState<RevisionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    const data = await revisionApi.dashboard();
    setDashboard(data);
  };

  useEffect(() => {
    let active = true;
    revisionApi
      .dashboard()
      .then((data) => {
        if (active) {
          setDashboard(data);
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

  const review = async (schedule: RevisionSchedule, rating: ReviewRating) => {
    setBusyId(schedule.id);
    setError(null);
    setNotice(null);
    try {
      await revisionApi.review(schedule.id, rating);
      await load();
      setNotice(`Reviewed "${schedule.topicName}" as ${rating}.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Loading label="Loading revision schedule..." />;
  }

  if (!dashboard) {
    return (
      <EmptyState
        title="Unable to load revision"
        description={error ?? 'Try again in a moment.'}
        actionLabel="Back to dashboard"
        actionTo="/dashboard"
      />
    );
  }

  const total = dashboard.counts.total;

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Spaced repetition"
        title="Revision mode"
        description="Strengthen weak topics with scheduled reviews. Ratings update each topic's memory strength."
        actions={
          <Link className="button secondary" to="/analytics">
            View analytics
          </Link>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Tracked topics</span>
          <strong>{total}</strong>
          <span className="muted">Across quizzes</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Due today</span>
          <strong>{dashboard.counts.due}</strong>
          <span className="muted">Review now</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Needs revision</span>
          <strong>{dashboard.counts.needsRevision}</strong>
          <span className="muted">Below target strength</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Mastered</span>
          <strong>{dashboard.counts.mastered}</strong>
          <span className="muted">Strong recall</span>
        </article>
      </section>

      {total === 0 ? (
        <EmptyState
          title="No revision topics yet"
          description="Complete a quiz to create revision schedules for its topics."
          actionLabel="Go to spaces"
          actionTo="/spaces"
        />
      ) : (
        <ScheduleSection
          title="Due today"
          description="These topics are ready for review."
          schedules={dashboard.dueToday}
          busyId={busyId}
          onReview={review}
        />
      )}

      {dashboard.needsRevision.length > 0 ? (
        <ScheduleSection
          title="Needs revision"
          description="Memory strength is low, so revisit these soon."
          schedules={dashboard.needsRevision}
          busyId={busyId}
          onReview={review}
        />
      ) : null}

      {dashboard.scheduled.length > 0 ? (
        <ScheduleSection
          title="Scheduled"
          description="Upcoming reviews."
          schedules={dashboard.scheduled}
          busyId={busyId}
          onReview={review}
        />
      ) : null}

      {dashboard.mastered.length > 0 ? (
        <ScheduleSection
          title="Mastered"
          description="Keep these fresh with occasional reviews."
          schedules={dashboard.mastered}
          busyId={busyId}
          onReview={review}
        />
      ) : null}
    </div>
  );
};

interface ScheduleSectionProps {
  title: string;
  description: string;
  schedules: RevisionSchedule[];
  busyId: string | null;
  onReview: (schedule: RevisionSchedule, rating: ReviewRating) => Promise<void>;
}

const ScheduleSection = ({
  title,
  description,
  schedules,
  busyId,
  onReview,
}: ScheduleSectionProps) => {
  if (schedules.length === 0) {
    return null;
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p className="muted small-text">{description}</p>
        </div>
        <span className="badge">{schedules.length}</span>
      </div>
      <div className="stack">
        {schedules.map((schedule) => (
          <article key={schedule.id} className="revision-row">
            <div className="revision-main">
              <div>
                <strong>{schedule.topicName}</strong>
                <p className="muted small-text">
                  Next review {formatDate(schedule.nextReviewAt)} - {schedule.intervalDays} day
                  interval - reviewed {schedule.reviewCount} time(s)
                </p>
              </div>
              <span className={`badge status-${schedule.status}`}>
                {schedule.status.replace('_', ' ')}
              </span>
            </div>
            <div className="strength">
              <ProgressBar value={schedule.memoryStrength} label={`${schedule.memoryStrength}%`} />
            </div>
            <div className="rating-row">
              {ratings.map((rating) => (
                <button
                  key={rating.value}
                  type="button"
                  className={`button small ${rating.className}`}
                  onClick={() => void onReview(schedule, rating.value)}
                  disabled={busyId !== null}
                >
                  {busyId === schedule.id ? 'Saving...' : rating.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
