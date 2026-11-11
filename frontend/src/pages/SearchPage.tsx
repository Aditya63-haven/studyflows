import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage, searchApi } from '../api';
import type { SearchResult } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { itemRoute, itemTypeLabel } from '../utils/format';

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const found = await searchApi.search(trimmed);
      setResults(found);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!initialQuery) {
      return;
    }
    let active = true;
    setSearching(true);
    searchApi
      .search(initialQuery)
      .then((found) => {
        if (active) {
          setResults(found);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialQuery]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch(query);
  };

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Global search"
        title="Find anything"
        description="Search titles and summaries across notes, quizzes and flashcard decks."
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <form className="search-bar" onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes, quizzes and decks..."
          autoFocus
        />
        <button className="button" type="submit" disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searching ? (
        <Loading label="Searching your study library..." />
      ) : results === null ? (
        <EmptyState
          title="Start with a keyword"
          description="Try a subject, topic or phrase from your notes and quizzes."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No matches found"
          description="Try a shorter or more general search term."
        />
      ) : (
        <section className="panel">
          <div className="section-heading">
            <h2>Results</h2>
            <span className="badge">{results.length}</span>
          </div>
          <div className="stack">
            {results.map((result) => (
              <article key={`${result.type}-${result.id}`} className="search-result">
                <div>
                  <span className="eyebrow">{itemTypeLabel(result.type)}</span>
                  <h3>
                    <Link to={itemRoute(result.type, result.id)}>{result.title}</Link>
                  </h3>
                  <p className="muted small-text">{result.summary}</p>
                </div>
                <div className="result-actions">
                  <Link className="button small" to={itemRoute(result.type, result.id)}>
                    Open
                  </Link>
                  <Link className="button small secondary" to={`/spaces/${result.spaceId}`}>
                    Space
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
