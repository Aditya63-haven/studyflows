import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage, quizzesApi } from '../api';
import type { Quiz, QuizAttempt } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDateTime } from '../utils/format';

export const QuizResultPage = () => {
  const { quizId = '', attemptId = '' } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([quizzesApi.get(quizId), quizzesApi.attempts(quizId)])
      .then(([quizData, attempts]) => {
        if (!active) {
          return;
        }
        setQuiz(quizData);
        setAttempt(attempts.find((item) => item.id === attemptId) ?? null);
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
  }, [quizId, attemptId]);

  if (loading) {
    return <Loading label="Loading quiz result..." />;
  }

  if (!quiz || !attempt) {
    return (
      <EmptyState
        title="Result not found"
        description={error ?? 'This attempt may no longer exist.'}
        actionLabel="Back to spaces"
        actionTo="/spaces"
      />
    );
  }

  const questionById = new Map(quiz.questions.map((question) => [question.id, question]));
  const answerById = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Quiz result"
        title={quiz.title}
        description={`Completed ${formatDateTime(attempt.completedAt)}`}
        actions={
          <>
            <Link className="button secondary" to={`/spaces/${quiz.spaceId}`}>
              Back to space
            </Link>
            <Link className="button" to={`/quizzes/${quiz.id}/take`}>
              Retake quiz
            </Link>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <section className="panel result-summary">
        <div>
          <span className="eyebrow">Score</span>
          <strong className="big-score">
            {attempt.score}/{attempt.maxScore}
          </strong>
          <p className="muted">{attempt.percentage}% correct</p>
        </div>
        <div className="result-progress">
          <ProgressBar value={attempt.percentage} label={`${attempt.percentage}%`} />
          <p className="muted small-text">
            {attempt.result.evaluations.filter((evaluation) => evaluation.correct).length} of{' '}
            {attempt.result.evaluations.length} questions correct
          </p>
        </div>
      </section>

      <section className="stack">
        {attempt.result.evaluations.map((evaluation, index) => {
          const question = questionById.get(evaluation.questionId);
          const answer = answerById.get(evaluation.questionId);
          return (
            <article
              key={evaluation.questionId}
              className={evaluation.correct ? 'panel answer-correct' : 'panel answer-wrong'}
            >
              <div className="question-heading">
                <span className="eyebrow">Question {index + 1}</span>
                <span className={evaluation.correct ? 'badge success' : 'badge danger'}>
                  {evaluation.correct ? 'Correct' : 'Incorrect'} - {evaluation.earnedPoints}/
                  {evaluation.maxPoints}
                </span>
              </div>
              <h3>{question?.prompt ?? 'Question'}</h3>
              <p className="small-text">
                <strong>Your answer:</strong>{' '}
                {Array.isArray(answer?.response)
                  ? answer?.response.join(', ') || 'No answer'
                  : String(answer?.response ?? 'No answer')}
              </p>
              <p className="small-text">
                <strong>Correct answer:</strong> {evaluation.correctAnswer.join(', ')}
              </p>
              {evaluation.explanation ? (
                <p className="muted small-text">{evaluation.explanation}</p>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
};
