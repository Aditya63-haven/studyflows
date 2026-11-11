import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage, sharingApi } from '../api';
import type { Note } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { Markdown } from '../components/Markdown';
import { PublicShell } from '../components/PublicShell';
import { formatDateTime } from '../utils/format';

export const PublicNotePage = () => {
  const { token = '' } = useParams();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    sharingApi
      .getPublicNote(token)
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
  }, [token]);

  return (
    <PublicShell>
      <div className="stack large">
        {loading ? <Loading label="Loading shared note..." /> : null}
        <ErrorBanner message={error} />

        {!loading && !note ? (
          <EmptyState
            title="Shared note unavailable"
            description="This link may have expired, been revoked, or never existed."
            actionLabel="Go to StudyFlows"
            actionTo="/login"
          />
        ) : null}

        {note ? (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">Shared note</p>
                <h1>{note.title}</h1>
                <p className="muted">
                  Read-only - updated {formatDateTime(note.updatedAt)}
                </p>
              </div>
              <div className="page-actions">
                <Link className="button" to="/login">
                  Study with StudyFlows
                </Link>
              </div>
            </header>

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
                <span className="eyebrow">Summary</span>
                <p>{note.aiSummary}</p>
              </section>
            ) : null}

            <section className="panel note-content">
              <Markdown content={note.content} />
            </section>
          </>
        ) : null}
      </div>
    </PublicShell>
  );
};
