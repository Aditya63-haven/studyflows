import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { flashcardsApi, getErrorMessage } from '../api';
import type { FlashcardDeck, ReviewRating } from '../api/types';
import { BookmarkButton } from '../components/BookmarkButton';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';

const ratings: Array<{ value: ReviewRating; label: string; className: string }> = [
  { value: 'again', label: 'Again', className: 'danger' },
  { value: 'hard', label: 'Hard', className: 'secondary' },
  { value: 'good', label: 'Good', className: '' },
  { value: 'easy', label: 'Easy', className: 'success' },
];

export const FlashcardDeckPage = () => {
  const { deckId = '' } = useParams();
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    flashcardsApi
      .get(deckId)
      .then((result) => {
        if (!active) {
          return;
        }
        setDeck(result);
        setOrder(result.cards.map((card) => card.id));
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
  }, [deckId]);

  const currentCard = deck?.cards.find((card) => card.id === order[index]) ?? null;

  const advance = () => {
    setFlipped(false);
    setIndex((current) => (order.length === 0 ? 0 : (current + 1) % order.length));
  };

  const review = async (rating: ReviewRating) => {
    if (!deck || !currentCard) {
      return;
    }
    setReviewing(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await flashcardsApi.reviewCard(deck.id, currentCard.id, rating);
      setDeck(updated);
      advance();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setReviewing(false);
    }
  };

  const shuffle = () => {
    setOrder((current) => {
      const shuffled = [...current];
      for (let cursor = shuffled.length - 1; cursor > 0; cursor -= 1) {
        const swapIndex = Math.floor(Math.random() * (cursor + 1));
        [shuffled[cursor], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[cursor]];
      }
      return shuffled;
    });
    setIndex(0);
    setFlipped(false);
    setNotice('Deck shuffled.');
  };

  const restoreOrder = () => {
    if (!deck) {
      return;
    }
    setOrder(deck.cards.map((card) => card.id));
    setIndex(0);
    setFlipped(false);
    setNotice(null);
  };

  if (loading) {
    return <Loading label="Opening flashcard deck..." />;
  }

  if (!deck) {
    return (
      <EmptyState
        title="Deck not found"
        description={error ?? 'It may have been deleted.'}
        actionLabel="Back to spaces"
        actionTo="/spaces"
      />
    );
  }

  const dueCount = deck.cards.filter((card) => card.isDue).length;
  const progress = order.length > 0 ? ((index + 1) / order.length) * 100 : 0;

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Flashcards"
        title={deck.title}
        description={deck.description || deck.summary}
        actions={
          <>
            <Link className="button secondary" to={`/spaces/${deck.spaceId}`}>
              Back to space
            </Link>
            <Link className="button secondary" to={`/decks/${deck.id}/edit`}>
              Edit deck
            </Link>
            <BookmarkButton itemId={deck.id} itemType="flashcarddeck" />
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      {deck.cards.length === 0 || !currentCard ? (
        <EmptyState
          title="No flashcards yet"
          description="Add cards to this deck to start studying."
          actionLabel="Edit deck"
          actionTo={`/decks/${deck.id}/edit`}
        />
      ) : (
        <>
          <div className="quiz-meta">
            <span className="badge">{deck.cards.length} cards</span>
            <span className="badge">{dueCount} due</span>
            <span className="muted small-text">
              Card {index + 1} of {order.length}
            </span>
            <div className="deck-controls">
              <button type="button" className="button small secondary" onClick={shuffle}>
                Shuffle
              </button>
              <button type="button" className="button small secondary" onClick={restoreOrder}>
                Restore order
              </button>
            </div>
          </div>

          <ProgressBar value={progress} />

          <button
            type="button"
            className={flipped ? 'flashcard flipped' : 'flashcard'}
            onClick={() => setFlipped((value) => !value)}
            aria-label={flipped ? 'Show card front' : 'Show card back'}
          >
            <span className="eyebrow">{flipped ? 'Answer' : 'Prompt'}</span>
            <span className="flashcard-text">
              {flipped ? currentCard.back : currentCard.front}
            </span>
            <span className="flashcard-hint">Click to {flipped ? 'flip back' : 'reveal'}</span>
          </button>

          <section className="panel stack">
            <div className="section-heading">
              <div>
                <h2>Rate this card</h2>
                <p className="muted small-text">
                  Ratings update the card's memory strength and next review date.
                </p>
              </div>
            </div>
            <div className="rating-row">
              {ratings.map((rating) => (
                <button
                  key={rating.value}
                  type="button"
                  className={`button ${rating.className}`}
                  onClick={() => void review(rating.value)}
                  disabled={!flipped || reviewing}
                >
                  {rating.label}
                </button>
              ))}
            </div>
            {!flipped ? (
              <p className="muted small-text">Reveal the answer before rating the card.</p>
            ) : null}
          </section>

          <div className="toolbar">
            <button type="button" className="button secondary" onClick={advance} disabled={reviewing}>
              Skip card
            </button>
            <span className="muted small-text">
              {currentCard.reviewCount === 0
                ? 'New card'
                : `Reviewed ${currentCard.reviewCount} time(s)`}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
