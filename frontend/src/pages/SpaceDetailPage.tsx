import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  flashcardsApi,
  getErrorMessage,
  notesApi,
  quizzesApi,
  spacesApi,
} from '../api';
import type { FlashcardDeck, Note, Quiz, StudySpace } from '../api/types';
import { BookmarkButton } from '../components/BookmarkButton';
import { DocumentLibrary } from '../components/DocumentLibrary';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { formatDate } from '../utils/format';

export const SpaceDetailPage = () => {
  const { spaceId = '' } = useParams();
  const navigate = useNavigate();
  const [space, setSpace] = useState<StudySpace | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      spacesApi.get(spaceId),
      notesApi.listBySpace(spaceId),
      quizzesApi.listBySpace(spaceId),
      flashcardsApi.listBySpace(spaceId),
    ])
      .then(([spaceData, noteList, quizList, deckList]) => {
        if (!active) {
          return;
        }
        setSpace(spaceData);
        setNotes(noteList);
        setQuizzes(quizList);
        setDecks(deckList);
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
  }, [spaceId]);

  const deleteSpace = async () => {
    if (!space || !window.confirm(`Delete "${space.name}" and all of its content?`)) {
      return;
    }
    setError(null);
    try {
      await spacesApi.remove(space.id);
      navigate('/spaces');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <Loading label="Opening study space..." />;
  }

  if (!space) {
    return (
      <EmptyState
        title="Study space not found"
        description={error ?? 'It may have been deleted.'}
        actionLabel="Back to spaces"
        actionTo="/spaces"
      />
    );
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow={space.subject}
        title={space.name}
        description={space.description || 'A workspace for your notes, quizzes and flashcards.'}
        actions={
          <>
            <Link className="button secondary" to="/spaces">
              All spaces
            </Link>
            <button type="button" className="button small danger" onClick={() => void deleteSpace()}>
              Delete space
            </button>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <DocumentLibrary spaceId={space.id} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Notes</h2>
            <p className="muted small-text">Markdown notes with AI summaries.</p>
          </div>
          <Link className="button small" to={`/spaces/${space.id}/notes/new`}>
            New note
          </Link>
        </div>
        {notes.length === 0 ? (
          <EmptyState title="No notes yet" description="Write your first note for this subject." />
        ) : (
          <div className="card-grid compact">
            {notes.map((note) => (
              <article key={note.id} className="mini-card">
                <h3>
                  <Link to={`/notes/${note.id}`}>{note.title}</Link>
                </h3>
                <p className="muted small-text">{note.summary}</p>
                {note.tags.length > 0 ? (
                  <div className="tag-row">
                    {note.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="muted small-text">Updated {formatDate(note.updatedAt)}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Quizzes</h2>
            <p className="muted small-text">Practice with auto-graded questions.</p>
          </div>
          <Link className="button small" to={`/spaces/${space.id}/quizzes/new`}>
            New quiz
          </Link>
        </div>
        {quizzes.length === 0 ? (
          <EmptyState title="No quizzes yet" description="Create a quiz or generate one from a note." />
        ) : (
          <div className="card-grid compact">
            {quizzes.map((quiz) => (
              <article key={quiz.id} className="mini-card">
                <h3>
                  <Link to={`/quizzes/${quiz.id}/take`}>{quiz.title}</Link>
                </h3>
                <p className="muted small-text">{quiz.summary}</p>
                <div className="card-actions">
                  <Link className="button small" to={`/quizzes/${quiz.id}/take`}>
                    Take quiz
                  </Link>
                  <Link className="button small secondary" to={`/quizzes/${quiz.id}/edit`}>
                    Edit
                  </Link>
                  <BookmarkButton itemId={quiz.id} itemType="quiz" compact />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Flashcard decks</h2>
            <p className="muted small-text">Flip, shuffle and rate cards.</p>
          </div>
          <Link className="button small" to={`/spaces/${space.id}/decks/new`}>
            New deck
          </Link>
        </div>
        {decks.length === 0 ? (
          <EmptyState title="No decks yet" description="Create a deck to start active recall." />
        ) : (
          <div className="card-grid compact">
            {decks.map((deck) => (
              <article key={deck.id} className="mini-card">
                <h3>
                  <Link to={`/decks/${deck.id}`}>{deck.title}</Link>
                </h3>
                <p className="muted small-text">{deck.summary}</p>
                <div className="card-actions">
                  <Link className="button small" to={`/decks/${deck.id}`}>
                    Study
                  </Link>
                  <Link className="button small secondary" to={`/decks/${deck.id}/edit`}>
                    Edit
                  </Link>
                  <BookmarkButton itemId={deck.id} itemType="flashcarddeck" compact />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
