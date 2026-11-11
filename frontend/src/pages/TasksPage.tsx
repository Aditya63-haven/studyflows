import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { examPlansApi, getErrorMessage, quizzesApi, spacesApi } from '../api';
import type { ExamPlan, StudySpace } from '../api/types';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatMinutes } from '../utils/format';

interface QuizTask {
  quizId: string;
  spaceId: string;
  spaceName: string;
  subject: string;
  title: string;
  summary: string;
  questionCount: number;
  timeLimitMinutes: number | null;
}

interface TopicTask {
  planId: string;
  planName: string;
  examDate: string;
  dayId: string;
  topicId: string;
  topicName: string;
  dayDate: string;
  estimatedMinutes: number;
}

export const TasksPage = () => {
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [quizTasks, setQuizTasks] = useState<QuizTask[]>([]);
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([spacesApi.list(), examPlansApi.list()])
      .then(async ([spaceList, planList]) => {
        const quizLists = await Promise.all(
          spaceList.map((space) => quizzesApi.listBySpace(space.id)),
        );
        if (!active) {
          return;
        }
        setSpaces(spaceList);
        setPlans(planList);
        setQuizTasks(
          spaceList.flatMap((space, index) =>
            quizLists[index].map((quiz) => ({
              quizId: quiz.id,
              spaceId: space.id,
              spaceName: space.name,
              subject: space.subject,
              title: quiz.title,
              summary: quiz.summary,
              questionCount: quiz.questions.length,
              timeLimitMinutes: quiz.timeLimitMinutes,
            })),
          ),
        );
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

  const topicTasks: TopicTask[] = plans.flatMap((plan) => {
    const topicById = new Map(plan.topics.map((topic) => [topic.id, topic]));
    return plan.studyDays.flatMap((day) =>
      day.topicIds
        .filter((topicId) => !day.completedTopicIds.includes(topicId))
        .map((topicId) => ({
          planId: plan.id,
          planName: plan.name,
          examDate: plan.examDate,
          dayId: day.id,
          topicId,
          topicName: topicById.get(topicId)?.name ?? 'Topic',
          dayDate: day.date,
          estimatedMinutes: topicById.get(topicId)?.estimatedMinutes ?? 45,
        })),
    );
  });

  const markComplete = async (task: TopicTask) => {
    const key = `${task.planId}:${task.dayId}:${task.topicId}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await examPlansApi.markTopicComplete(task.planId, task.topicId, task.dayId);
      setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
      setNotice(`Marked "${task.topicName}" complete.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <Loading label="Loading your tasks..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Tasks & assessments"
        title="Quizzes and topics to complete"
        description="Everything you can work on today, across every subject and exam plan."
        actions={
          <Link className="button secondary" to="/spaces">
            Browse subjects
          </Link>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <Card
        title="Quizzes"
        description="Practice assessments across all of your study spaces."
        actions={<span className="badge">{quizTasks.length}</span>}
      >
        {quizTasks.length === 0 ? (
          <EmptyState
            title="No quizzes yet"
            description="Create a quiz inside a study space, or generate one from a note."
            actionLabel="Open subjects"
            actionTo="/spaces"
          />
        ) : (
          <div className="stack">
            {quizTasks.map((task) => (
              <article key={task.quizId} className="search-result">
                <div>
                  <span className="eyebrow">
                    {task.subject} · {task.spaceName}
                  </span>
                  <h3>
                    <Link to={`/quizzes/${task.quizId}/take`}>{task.title}</Link>
                  </h3>
                  <p className="muted small-text">{task.summary}</p>
                </div>
                <div className="result-actions">
                  <Link className="button small" to={`/quizzes/${task.quizId}/take`}>
                    Take quiz
                  </Link>
                  <Link className="button small secondary" to={`/quizzes/${task.quizId}/edit`}>
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Exam plan topics"
        description="Topics from your plans that are not marked complete yet."
        actions={<span className="badge">{topicTasks.length}</span>}
      >
        {topicTasks.length === 0 ? (
          <EmptyState
            title="Nothing outstanding"
            description="Every topic in your exam plans is marked complete, or you have no plans yet."
            actionLabel="Open planner"
            actionTo="/exam-plans"
          />
        ) : (
          <div className="stack">
            {topicTasks.map((task) => {
              const key = `${task.planId}:${task.dayId}:${task.topicId}`;
              return (
                <article key={key} className="search-result">
                  <div>
                    <span className="eyebrow">
                      {task.planName} · exam {formatDate(task.examDate)}
                    </span>
                    <h3>{task.topicName}</h3>
                    <p className="muted small-text">
                      Planned {formatDate(task.dayDate)} · {formatMinutes(task.estimatedMinutes)}
                    </p>
                  </div>
                  <div className="result-actions">
                    <button
                      type="button"
                      className="button small"
                      onClick={() => void markComplete(task)}
                      disabled={busyKey !== null}
                    >
                      {busyKey === key ? 'Saving...' : 'Mark complete'}
                    </button>
                    <Link className="button small secondary" to={`/exam-plans/${task.planId}`}>
                      Open plan
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {spaces.length === 0 ? (
        <EmptyState
          title="No subjects yet"
          description="Create a study space to start collecting quizzes and topics."
          actionLabel="Create a space"
          actionTo="/spaces"
        />
      ) : null}
    </div>
  );
};
