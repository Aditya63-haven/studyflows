import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { flashcardsApi, getErrorMessage } from '../api';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';

interface CardDraft {
  key: string;
  id?: string;
  front: string;
  back: string;
}

const createCard = (): CardDraft => ({
  key: crypto.randomUUID(),
  front: '',
  back: '',
});

export const DeckEditorPage = () => {
  const { spaceId, deckId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(deckId);
  const [sourceSpaceId, setSourceSpaceId] = useState(spaceId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<CardDraft[]>([createCard()]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      return;
    }

    let active = true;
    flashcardsApi
      .get(deckId)
      .then((deck) => {
        if (!active) {
          return;
        }
        setTitle(deck.title);
        setDescription(deck.description);
        setCards(
          deck.cards.map((card) => ({
            key: crypto.randomUUID(),
            id: card.id,
            front: card.front,
            back: card.back,
          })),
        );
        setSourceSpaceId(deck.spaceId);
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

  const updateCard = (key: string, patch: Partial<CardDraft>) => {
    setCards((current) =>
      current.map((card) => (card.key === key ? { ...card, ...patch } : card)),
    );
  };

  const removeCard = (key: string) => {
    setCards((current) => current.filter((card) => card.key !== key));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const input = {
        title,
        description: description || undefined,
        cards: cards.map((card) => ({
          id: card.id,
          front: card.front,
          back: card.back,
        })),
      };
      const deck = deckId
        ? await flashcardsApi.update(deckId, input)
        : await flashcardsApi.create(sourceSpaceId, input);
      setNotice('Deck saved.');
      if (!deckId) {
        navigate(`/decks/${deck.id}`, { replace: true });
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deleteDeck = async () => {
    if (!deckId || !window.confirm('Delete this deck and its review history?')) {
      return;
    }
    setError(null);
    try {
      await flashcardsApi.remove(deckId);
      navigate(`/spaces/${sourceSpaceId}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <Loading label="Loading deck editor..." />;
  }

  if (editing && !sourceSpaceId && error) {
    return (
      <EmptyState
        title="Deck not found"
        description={error}
        actionLabel="Back to spaces"
        actionTo="/spaces"
      />
    );
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow={editing ? 'Edit deck' : 'New deck'}
        title={editing ? 'Flashcard deck editor' : 'Create a flashcard deck'}
        description="Keep prompts short and answers focused for active recall."
        actions={
          <>
            {sourceSpaceId ? (
              <Link className="button secondary" to={`/spaces/${sourceSpaceId}`}>
                Back to space
              </Link>
            ) : null}
            {deckId ? (
              <Link className="button" to={`/decks/${deckId}`}>
                Study deck
              </Link>
            ) : null}
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <form className="stack" onSubmit={handleSubmit}>
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
        </div>

        <div className="section-heading">
          <div>
            <h2>Cards</h2>
            <p className="muted small-text">{cards.length} card(s)</p>
          </div>
          <button
            type="button"
            className="button small secondary"
            onClick={() => setCards((current) => [...current, createCard()])}
          >
            Add card
          </button>
        </div>

        {cards.length === 0 ? (
          <EmptyState
            title="No cards in this deck"
            description="Add at least one flashcard before saving."
          />
        ) : null}

        {cards.map((card, index) => (
          <article key={card.key} className="panel">
            <div className="section-heading">
              <span className="eyebrow">Card {index + 1}</span>
              <button
                type="button"
                className="button small danger"
                onClick={() => removeCard(card.key)}
              >
                Remove
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Front</span>
                <textarea
                  rows={3}
                  value={card.front}
                  onChange={(event) => updateCard(card.key, { front: event.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Back</span>
                <textarea
                  rows={3}
                  value={card.back}
                  onChange={(event) => updateCard(card.key, { back: event.target.value })}
                  required
                />
              </label>
            </div>
          </article>
        ))}

        <div className="form-actions">
          <button className="button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save deck' : 'Create deck'}
          </button>
          {deckId ? (
            <button type="button" className="button danger" onClick={() => void deleteDeck()}>
              Delete deck
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
};
