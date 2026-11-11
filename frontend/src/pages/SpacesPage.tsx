import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, spacesApi } from '../api';
import type { StudySpace } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { formatDate } from '../utils/format';

const emptyForm = {
  name: '',
  subject: '',
  description: '',
  color: '#b2d8c6',
};

export const SpacesPage = () => {
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    spacesApi
      .list()
      .then((result) => {
        if (active) {
          setSpaces(result);
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

  const createSpace = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const space = await spacesApi.create({
        name: form.name,
        subject: form.subject,
        description: form.description || undefined,
        color: form.color || undefined,
      });
      setSpaces((current) => [space, ...current]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const deleteSpace = async (space: StudySpace) => {
    if (!window.confirm(`Delete "${space.name}" and all of its notes, quizzes and decks?`)) {
      return;
    }
    setError(null);
    try {
      await spacesApi.remove(space.id);
      setSpaces((current) => current.filter((item) => item.id !== space.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <Loading label="Loading study spaces..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Study spaces"
        title="Your subject workspaces"
        description="Each space keeps notes, quizzes and flashcard decks together."
        actions={
          <button type="button" className="button" onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Cancel' : 'New space'}
          </button>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {showForm ? (
        <form className="panel form-grid" onSubmit={createSpace}>
          <label className="field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Subject</span>
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              required
            />
          </label>
          <label className="field full">
            <span>Description</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Color</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm({ ...form, color: event.target.value })}
            />
          </label>
          <div className="form-actions full">
            <button className="button" type="submit">
              Create space
            </button>
          </div>
        </form>
      ) : null}

      {spaces.length === 0 ? (
        <EmptyState
          title="No study spaces yet"
          description="Create your first subject workspace to get started."
        />
      ) : (
        <div className="card-grid">
          {spaces.map((space) => (
            <article key={space.id} className="card space-card">
              <div className="space-color" style={{ background: space.color }} />
              <div className="space-card-body">
                <span className="eyebrow">{space.subject}</span>
                <h2>
                  <Link to={`/spaces/${space.id}`}>{space.name}</Link>
                </h2>
                <p className="muted">{space.description || 'No description yet.'}</p>
                <p className="muted small-text">Created {formatDate(space.createdAt)}</p>
                <div className="card-actions">
                  <Link className="button small" to={`/spaces/${space.id}`}>
                    Open
                  </Link>
                  <button
                    type="button"
                    className="button small danger"
                    onClick={() => void deleteSpace(space)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
