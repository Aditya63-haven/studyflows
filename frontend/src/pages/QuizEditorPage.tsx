import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, quizzesApi } from '../api';
import type {
  QuestionInput,
  QuestionOption,
  QuestionType,
  Quiz,
} from '../api/types';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';

interface QuestionDraft {
  key: string;
  id?: string;
  type: QuestionType;
  prompt: string;
  points: number;
  explanation: string;
  options: QuestionOption[];
  correctOptionId: string;
  correctOptionIds: string[];
  correctAnswer: boolean;
}

const newKey = (): string => crypto.randomUUID();

const newOptionId = (): string => crypto.randomUUID().slice(0, 8);

const optionPair = (): QuestionOption[] => [
  { id: newOptionId(), text: '' },
  { id: newOptionId(), text: '' },
];

const createDraft = (type: QuestionType): QuestionDraft => {
  const options = type === 'true_false' ? [] : optionPair();
  return {
    key: newKey(),
    type,
    prompt: '',
    points: 1,
    explanation: '',
    options,
    correctOptionId: options[0]?.id ?? '',
    correctOptionIds: options[0] ? [options[0].id] : [],
    correctAnswer: true,
  };
};

const toDraft = (question: Quiz['questions'][number]): QuestionDraft => {
  const options = question.options ?? [];
  return {
    key: newKey(),
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    explanation: question.explanation ?? '',
    options,
    correctOptionId: question.correctOptionId ?? options[0]?.id ?? '',
    correctOptionIds: question.correctOptionIds ?? [],
    correctAnswer: question.correctAnswer ?? true,
  };
};

const toInput = (draft: QuestionDraft): QuestionInput => {
  const base: QuestionInput = {
    id: draft.id,
    type: draft.type,
    prompt: draft.prompt,
    points: draft.points,
    explanation: draft.explanation.trim() || undefined,
  };

  if (draft.type === 'mcq') {
    return {
      ...base,
      options: draft.options,
      correctOptionId: draft.correctOptionId,
    };
  }
  if (draft.type === 'multi_select') {
    return {
      ...base,
      options: draft.options,
      correctOptionIds: draft.correctOptionIds,
    };
  }
  return { ...base, correctAnswer: draft.correctAnswer };
};

export const QuizEditorPage = () => {
  const { spaceId, quizId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(quizId);
  const [sourceSpaceId, setSourceSpaceId] = useState(spaceId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    let active = true;
    quizzesApi
      .get(quizId)
      .then((quiz) => {
        if (!active) {
          return;
        }
        setTitle(quiz.title);
        setDescription(quiz.description);
        setTimeLimit(quiz.timeLimitMinutes ? String(quiz.timeLimitMinutes) : '');
        setQuestions(quiz.questions.map(toDraft));
        setSourceSpaceId(quiz.spaceId);
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

  const updateQuestion = (key: string, patch: Partial<QuestionDraft>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.key === key ? { ...question, ...patch } : question,
      ),
    );
  };

  const addQuestion = (type: QuestionType) => {
    setQuestions((current) => [...current, createDraft(type)]);
  };

  const removeQuestion = (key: string) => {
    setQuestions((current) => current.filter((question) => question.key !== key));
  };

  const updateOption = (key: string, optionId: string, text: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.key === key
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, text } : option,
              ),
            }
          : question,
      ),
    );
  };

  const addOption = (key: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.key !== key) {
          return question;
        }
        const option = { id: newOptionId(), text: '' };
        return { ...question, options: [...question.options, option] };
      }),
    );
  };

  const removeOption = (key: string, optionId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.key !== key) {
          return question;
        }
        const options = question.options.filter((option) => option.id !== optionId);
        return {
          ...question,
          options,
          correctOptionId:
            question.correctOptionId === optionId
              ? options[0]?.id ?? ''
              : question.correctOptionId,
          correctOptionIds: question.correctOptionIds.filter((id) => id !== optionId),
        };
      }),
    );
  };

  const toggleCorrect = (question: QuestionDraft, optionId: string) => {
    if (question.type === 'mcq') {
      updateQuestion(question.key, { correctOptionId: optionId });
      return;
    }
    const selected = question.correctOptionIds.includes(optionId)
      ? question.correctOptionIds.filter((id) => id !== optionId)
      : [...question.correctOptionIds, optionId];
    updateQuestion(question.key, { correctOptionIds: selected });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (questions.length === 0) {
      setError('Add at least one question.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        title,
        description: description || undefined,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
        questions: questions.map(toInput),
      };
      const quiz = quizId
        ? await quizzesApi.update(quizId, input)
        : await quizzesApi.create(sourceSpaceId, input);
      setNotice('Quiz saved.');
      if (!quizId) {
        navigate(`/quizzes/${quiz.id}/edit`, { replace: true });
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async () => {
    if (!quizId || !window.confirm('Delete this quiz and its attempts?')) {
      return;
    }
    setError(null);
    try {
      await quizzesApi.remove(quizId);
      navigate(`/spaces/${sourceSpaceId}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <Loading label="Loading quiz editor..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow={editing ? 'Edit quiz' : 'New quiz'}
        title={editing ? 'Quiz editor' : 'Create a quiz'}
        description="Mix multiple-choice, multi-select and true/false questions."
        actions={
          <>
            {sourceSpaceId ? (
              <Link className="button secondary" to={`/spaces/${sourceSpaceId}`}>
                Back to space
              </Link>
            ) : null}
            {quizId ? (
              <Link className="button" to={`/quizzes/${quizId}/take`}>
                Take quiz
              </Link>
            ) : null}
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <form onSubmit={handleSubmit} className="stack">
        <div className="form-grid panel">
          <label className="field full">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field full">
            <span>Description</span>
            <textarea
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Time limit (minutes)</span>
            <input
              type="number"
              min={1}
              max={600}
              value={timeLimit}
              onChange={(event) => setTimeLimit(event.target.value)}
              placeholder="No limit"
            />
          </label>
        </div>

        <div className="section-heading">
          <div>
            <h2>Questions</h2>
            <p className="muted small-text">{questions.length} question(s)</p>
          </div>
          <div className="toolbar">
            <button type="button" className="button small secondary" onClick={() => addQuestion('mcq')}>
              Add MCQ
            </button>
            <button
              type="button"
              className="button small secondary"
              onClick={() => addQuestion('multi_select')}
            >
              Add multi-select
            </button>
            <button
              type="button"
              className="button small secondary"
              onClick={() => addQuestion('true_false')}
            >
              Add true/false
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="empty-state">
            <h3>No questions yet</h3>
            <p className="muted">Choose a question type to start building the quiz.</p>
          </div>
        ) : null}

        {questions.map((question, index) => (
          <article key={question.key} className="panel question-editor">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  Question {index + 1} - {question.type.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                className="button small danger"
                onClick={() => removeQuestion(question.key)}
              >
                Remove
              </button>
            </div>

            <div className="form-grid">
              <label className="field full">
                <span>Prompt</span>
                <textarea
                  rows={2}
                  value={question.prompt}
                  onChange={(event) =>
                    updateQuestion(question.key, { prompt: event.target.value })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Points</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.5}
                  value={question.points}
                  onChange={(event) =>
                    updateQuestion(question.key, {
                      points: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="field full">
                <span>Explanation (optional)</span>
                <input
                  value={question.explanation}
                  onChange={(event) =>
                    updateQuestion(question.key, {
                      explanation: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            {question.type === 'true_false' ? (
              <label className="field">
                <span>Correct answer</span>
                <select
                  value={question.correctAnswer ? 'true' : 'false'}
                  onChange={(event) =>
                    updateQuestion(question.key, {
                      correctAnswer: event.target.value === 'true',
                    })
                  }
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </label>
            ) : (
              <div className="stack">
                <div className="section-heading">
                  <span className="field-label">Options</span>
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={() => addOption(question.key)}
                  >
                    Add option
                  </button>
                </div>
                {question.options.map((option, optionIndex) => {
                  const checked =
                    question.type === 'mcq'
                      ? question.correctOptionId === option.id
                      : question.correctOptionIds.includes(option.id);
                  return (
                    <div key={option.id} className="option-row">
                      <input
                        type={question.type === 'mcq' ? 'radio' : 'checkbox'}
                        checked={checked}
                        onChange={() => toggleCorrect(question, option.id)}
                        aria-label={`Mark option ${optionIndex + 1} correct`}
                      />
                      <input
                        value={option.text}
                        onChange={(event) =>
                          updateOption(question.key, option.id, event.target.value)
                        }
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      <button
                        type="button"
                        className="button small danger"
                        onClick={() => removeOption(question.key, option.id)}
                        disabled={question.options.length <= 2}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        ))}

        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save quiz' : 'Create quiz'}
          </button>
          {quizId ? (
            <button
              type="button"
              className="button danger"
              onClick={() => void deleteQuiz()}
            >
              Delete quiz
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
};
