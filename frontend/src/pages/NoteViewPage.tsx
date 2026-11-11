import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, notesApi, sharingApi } from '../api';
import type { Note } from '../api/types';
import { BookmarkButton } from '../components/BookmarkButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { Markdown } from '../components/Markdown';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../utils/format';

export const NoteViewPage = () => {
  const { noteId = '' } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    notesApi
      .get(noteId)
      .then((result) => {
        if (active) {
          setNote(result);
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
  }, [noteId]);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  const condense = () =>
    runAction('condense', async () => {
      const updated = await notesApi.condense(noteId);
      setNote(updated);
      setNotice('AI summary generated and saved.');
    });

  const generateQuiz = () =>
    runAction('generate', async () => {
      const quiz = await notesApi.generateQuiz(noteId);
      navigate(`/quizzes/${quiz.id}/edit`);
    });

  const share = () =>
    runAction('share', async () => {
      const link = await sharingApi.shareNote(noteId);
      const url = `${window.location.origin}/share/note/${link.token}`;
      setShareUrl(url);
      setNotice('Share link created.');
      try {
        await navigator.clipboard.writeText(url);
        setNotice('Share link created and copied to your clipboard.');
      } catch {
        setNotice('Share link created.');
      }
    });

  const deleteNote = () => {
    if (!note || !window.confirm(`Delete "${note.title}"?`)) {
      return;
    }
    void runAction('delete', async () => {
      await notesApi.remove(noteId);
      navigate(`/spaces/${note.spaceId}`);
    });
  };

  if (loading) {
    return <Loading label="Loading note..." />;
  }

  if (!note) {
    return (
      <EmptyState
        title="Note not found"
        description={error ?? 'It may have been deleted.'}
        actionLabel="Back to spaces"
        actionTo="/spaces"
      />
    );
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Study note"
        title={note.title}
        description={`Updated ${formatDateTime(note.updatedAt)}`}
        actions={
          <>
            <Link className="button secondary" to={`/spaces/${note.spaceId}`}>
              Back to space
            </Link>
            <Link className="button" to={`/notes/${note.id}/edit`}>
              Edit
            </Link>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <div className="toolbar">
        <button
          type="button"
          className="button small secondary"
          onClick={() => void condense()}
          disabled={busy !== null}
        >
          {busy === 'condense' ? 'Condensing...' : 'Condense to summary'}
        </button>
        <button
          type="button"
          className="button small secondary"
          onClick={() => void generateQuiz()}
          disabled={busy !== null}
        >
          {busy === 'generate' ? 'Generating...' : 'Generate quiz'}
        </button>
        <button
          type="button"
          className="button small secondary"
          onClick={() => void share()}
          disabled={busy !== null}
        >
          {busy === 'share' ? 'Sharing...' : 'Share note'}
        </button>
        <BookmarkButton itemId={note.id} itemType="note" compact />
        <button
          type="button"
          className="button small danger"
          onClick={deleteNote}
          disabled={busy !== null}
        >
          {busy === 'delete' ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {shareUrl ? (
        <div className="share-box">
          <span>Public link</span>
          <input readOnly value={shareUrl} onFocus={(event) => event.target.select()} />
        </div>
      ) : null}

      {note.tags.length > 0 ? (
        <div className="tag-row">
          {note.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {note.aiSummary ? (
        <section className="panel summary-panel">
          <span className="eyebrow">AI summary</span>
          <p>{note.aiSummary}</p>
        </section>
      ) : null}

      <section className="panel note-content">
        <Markdown content={note.content} />
      </section>
    </div>
  );
};
