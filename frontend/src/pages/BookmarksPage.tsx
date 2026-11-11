import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookmarksApi, getErrorMessage } from '../api';
import type { BookmarkView } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, itemRoute, itemTypeLabel } from '../utils/format';

export const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    bookmarksApi
      .list()
      .then((result) => {
        if (active) {
          setBookmarks(result);
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

  const remove = async (bookmark: BookmarkView) => {
    setBusyId(bookmark.id);
    setError(null);
    try {
      await bookmarksApi.remove(bookmark.id);
      setBookmarks((current) => current.filter((item) => item.id !== bookmark.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <Loading label="Loading bookmarks..." />;
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Saved items"
        title="Bookmarks"
        description="Quick access to notes, quizzes and decks you want to revisit."
        actions={
          <Link className="button secondary" to="/search">
            Search library
          </Link>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {bookmarks.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          description="Bookmark a note, quiz or deck to keep it close at hand."
          actionLabel="Browse spaces"
          actionTo="/spaces"
        />
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>Saved items</h2>
            <span className="badge">{bookmarks.length}</span>
          </div>
          <div className="stack">
            {bookmarks.map((bookmark) => (
              <article key={bookmark.id} className="search-result">
                <div>
                  <span className="eyebrow">{itemTypeLabel(bookmark.itemType)}</span>
                  <h3>
                    <Link to={itemRoute(bookmark.itemType, bookmark.itemId)}>
                      {bookmark.title}
                    </Link>
                  </h3>
                  <p className="muted small-text">{bookmark.summary}</p>
                  <span className="muted small-text">
                    Saved {formatDateTime(bookmark.createdAt)}
                  </span>
                </div>
                <div className="result-actions">
                  <Link className="button small" to={itemRoute(bookmark.itemType, bookmark.itemId)}>
                    Open
                  </Link>
                  <Link className="button small secondary" to={`/spaces/${bookmark.spaceId}`}>
                    Space
                  </Link>
                  <button
                    type="button"
                    className="button small danger"
                    onClick={() => void remove(bookmark)}
                    disabled={busyId !== null}
                  >
                    {busyId === bookmark.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
