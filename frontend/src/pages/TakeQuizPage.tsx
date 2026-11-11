import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, quizzesApi } from '../api';
import type { QuestionResponse, Quiz, QuizAnswer } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { QuizQuestionInput } from '../components/QuizQuestionInput';

const isAnswered = (response: QuestionResponse | undefined): boolean => {
  if (response === undefined) {
    return false;
  }
  if (Array.isArray(response)) {
    return response.length > 0;
  }
  if (typeof response === 'string') {
    return response.length > 0;
  }
  return true;
};

export const TakeQuizPage = () => {
  const { quizId = '' } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionResponse>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    quizzesApi
      .get(quizId)
      .then((result) => {
        if (active) {
          setQuiz(result);
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
  }, [quizId]);

  const setAnswer = (questionId: string, response: QuestionResponse) => {
    setAnswers((current) => ({ ...current, [questionId]: response }));
  };

  const toggleMulti = (questionId: string, optionId: string) => {
    const current = answers[questionId];
    const selected = Array.isArray(current) ? current : [];
    const next = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    setAnswer(questionId, next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!quiz) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: QuizAnswer[] = quiz.questions.map((question) => ({
        questionId: question.id,
        response: answers[question.id] ?? (question.type === 'multi_select' ? [] : ''),
      }));
      const attempt = await quizzesApi.submit(quiz.id, payload);
      navigate(`/quizzes/${quiz.id}/result/${attempt.id}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading label="Preparing quiz..." />;
  }

  if (!quiz) {
    return (
      <EmptyState
        title="Quiz not found"
        description={error ?? 'It may have been deleted.'}
        actionLabel="Back to spaces"
        actionTo="/spaces"
      />
    );
  }

  const answeredCount = quiz.questions.filter((question) =>
    isAnswered(answers[question.id]),
  ).length;

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Take quiz"
        title={quiz.title}
        description={quiz.description || quiz.summary}
        actions={
          <>
            <Link className="button secondary" to={`/spaces/${quiz.spaceId}`}>
              Back to space
            </Link>
            <Link className="button secondary" to={`/quizzes/${quiz.id}/edit`}>
              Edit quiz
            </Link>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="quiz-meta">
        <span className="badge">{quiz.questions.length} questions</span>
        <span className="badge">{quiz.maxScore} points</span>
        {quiz.timeLimitMinutes ? (
          <span className="badge">{quiz.timeLimitMinutes} min limit</span>
        ) : null}
        <span className="muted small-text">
          {answeredCount} of {quiz.questions.length} answered
        </span>
      </div>

      {quiz.questions.length === 0 ? (
        <EmptyState title="This quiz has no questions" description="Edit the quiz to add some." />
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          {quiz.questions.map((question, index) => (
            <article key={question.id} className="panel question-card">
              <div className="question-heading">
                <span className="eyebrow">Question {index + 1}</span>
                <span className="badge">{question.points} pt</span>
              </div>
              <h2>{question.prompt}</h2>
              <QuizQuestionInput
                question={question}
                response={answers[question.id]}
                onChange={(response) => setAnswer(question.id, response)}
                onToggleMulti={(optionId) => toggleMulti(question.id, optionId)}
              />
            </article>
          ))}

          <div className="form-actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit quiz'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
