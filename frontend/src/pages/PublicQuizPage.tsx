import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage, sharingApi } from '../api';
import type {
  QuestionResponse,
  Quiz,
  QuizAnswer,
  QuizGradeResult,
} from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { ProgressBar } from '../components/ProgressBar';
import { PublicShell } from '../components/PublicShell';
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

export const PublicQuizPage = () => {
  const { token = '' } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionResponse>>({});
  const [result, setResult] = useState<QuizGradeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    sharingApi
      .getPublicQuiz(token)
      .then((data) => {
        if (active) {
          setQuiz(data);
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
  }, [token]);

  const setAnswer = (questionId: string, response: QuestionResponse) => {
    setAnswers((current) => ({ ...current, [questionId]: response }));
  };

  const toggleMulti = (questionId: string, optionId: string) => {
    const current = answers[questionId];
    const selected = Array.isArray(current) ? current : [];
    setAnswer(
      questionId,
      selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId],
    );
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
      const graded = await sharingApi.submitPublicQuiz(token, payload);
      setResult(graded);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers({});
    setResult(null);
    setError(null);
  };

  return (
    <PublicShell>
      <div className="stack large">
        {loading ? <Loading label="Loading shared quiz..." /> : null}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {!loading && !quiz ? (
          <EmptyState
            title="Shared quiz unavailable"
            description="This link may have expired, been revoked, or never existed."
            actionLabel="Go to StudyFlows"
            actionTo="/login"
          />
        ) : null}

        {quiz ? (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">Shared quiz</p>
                <h1>{quiz.title}</h1>
                <p className="muted">
                  {quiz.description || quiz.summary || 'Attempt this quiz without an account.'}
                </p>
              </div>
              <div className="page-actions">
                <Link className="button secondary" to="/login">
                  Log in
                </Link>
              </div>
            </header>

            {result ? (
              <section className="stack">
                <div className="panel result-summary">
                  <div>
                    <span className="eyebrow">Score</span>
                    <strong className="big-score">
                      {result.score}/{result.maxScore}
                    </strong>
                    <p className="muted">{result.percentage}% correct</p>
                  </div>
                  <div className="result-progress">
                    <ProgressBar value={result.percentage} label={`${result.percentage}%`} />
                  </div>
                </div>

                {result.evaluations.map((evaluation, index) => {
                  const question = quiz.questions.find(
                    (item) => item.id === evaluation.questionId,
                  );
                  return (
                    <article
                      key={evaluation.questionId}
                      className={
                        evaluation.correct ? 'panel answer-correct' : 'panel answer-wrong'
                      }
                    >
                      <div className="question-heading">
                        <span className="eyebrow">Question {index + 1}</span>
                        <span className={evaluation.correct ? 'badge success' : 'badge danger'}>
                          {evaluation.correct ? 'Correct' : 'Incorrect'} -{' '}
                          {evaluation.earnedPoints}/{evaluation.maxPoints}
                        </span>
                      </div>
                      <h3>{question?.prompt ?? 'Question'}</h3>
                      <p className="small-text">
                        <strong>Correct answer:</strong> {evaluation.correctAnswer.join(', ')}
                      </p>
                      {evaluation.explanation ? (
                        <p className="muted small-text">{evaluation.explanation}</p>
                      ) : null}
                    </article>
                  );
                })}

                <div className="form-actions">
                  <button type="button" className="button" onClick={retake}>
                    Try again
                  </button>
                  <Link className="button secondary" to="/register">
                    Create an account
                  </Link>
                </div>
              </section>
            ) : (
              <form className="stack" onSubmit={handleSubmit}>
                <div className="quiz-meta">
                  <span className="badge">{quiz.questions.length} questions</span>
                  <span className="badge">{quiz.maxScore} points</span>
                  {quiz.timeLimitMinutes ? (
                    <span className="badge">{quiz.timeLimitMinutes} min limit</span>
                  ) : null}
                  <span className="muted small-text">
                    {quiz.questions.filter((question) => isAnswered(answers[question.id])).length} of{' '}
                    {quiz.questions.length} answered
                  </span>
                </div>

                {quiz.questions.length === 0 ? (
                  <EmptyState
                    title="This quiz has no questions"
                    description="The owner has not added any questions yet."
                  />
                ) : (
                  quiz.questions.map((question, index) => (
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
                  ))
                )}

                {quiz.questions.length > 0 ? (
                  <div className="form-actions">
                    <button className="button" type="submit" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit quiz'}
                    </button>
                  </div>
                ) : null}
              </form>
            )}
          </>
        ) : null}
      </div>
    </PublicShell>
  );
};
