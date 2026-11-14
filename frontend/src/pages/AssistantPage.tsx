import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  aiAccessApi,
  assistantApi,
  getErrorMessage,
  notesApi,
  spacesApi,
} from '../api';
import type {
  AiAccessStatus,
  AssistantChatMode,
  AssistantCitation,
  Note,
  StudySpace,
} from '../api/types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { Markdown } from '../components/Markdown';
import { PageHeader } from '../components/PageHeader';
import '../assistant.css';

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AssistantCitation[];
  usedExternalKnowledge?: boolean;
  provider?: string;
}

const MODE_OPTIONS: Array<{ value: AssistantChatMode; label: string }> = [
  { value: 'answer', label: 'Direct answer' },
  { value: 'explain', label: 'Explain' },
  { value: 'summary', label: 'Summarize' },
  { value: 'detailed', label: 'Detailed' },
];

const makeEntryId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const AssistantPage = () => {
  const [status, setStatus] = useState<AiAccessStatus | null>(null);
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [spaceId, setSpaceId] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [mode, setMode] = useState<AssistantChatMode>('answer');
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([aiAccessApi.status(), spacesApi.list()])
      .then(([accessStatus, spaceList]) => {
        if (!active) {
          return;
        }
        setStatus(accessStatus);
        setSpaces(spaceList);
        setSpaceId(spaceList[0]?.id ?? '');
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

  useEffect(() => {
    if (!spaceId) {
      setNotes([]);
      setSelectedNoteIds([]);
      return undefined;
    }

    let active = true;
    setNotes([]);
    setSelectedNoteIds([]);
    setNotesLoading(true);
    notesApi
      .listBySpace(spaceId)
      .then((result) => {
        if (!active) {
          return;
        }
        setNotes(result);
        setSelectedNoteIds(result.map((note) => note.id));
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setNotesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [spaceId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const toggleNote = (noteId: string) => {
    setSelectedNoteIds((current) =>
      current.includes(noteId)
        ? current.filter((id) => id !== noteId)
        : [...current, noteId],
    );
  };

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || sending) {
      return;
    }

    const history = messages.slice(-12).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));
    const userEntry: ChatEntry = {
      id: makeEntryId(),
      role: 'user',
      content: message,
    };

    setMessages((current) => [...current, userEntry]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const result = await assistantApi.chat({
        message,
        mode,
        spaceId: spaceId || null,
        noteIds: selectedNoteIds,
        history,
      });
      setMessages((current) => [
        ...current,
        {
          id: makeEntryId(),
          role: 'assistant',
          content: result.answer,
          citations: result.citations,
          usedExternalKnowledge: result.usedExternalKnowledge,
          provider: result.provider,
        },
      ]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  if (loading) {
    return <Loading label="Checking AI assistant access..." />;
  }

  if (!status?.allowed) {
    const revoked = status?.status === 'revoked';
    return (
      <div className="stack large">
        <PageHeader
          eyebrow="Study assistant"
          title="Ask your notes"
          description="A private, invite-only workspace for grounded study questions."
        />
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <Card title={revoked ? 'Access revoked' : 'Invite-only access'}>
          <div className="assistant-restricted">
            <p>
              {revoked
                ? 'Your AI assistant access was revoked by the administrator.'
                : 'The AI assistant is available to invited accounts only.'}
            </p>
            {status?.email ? (
              <p className="muted">
                Signed in as <strong>{status.email}</strong>. Ask the administrator to grant
                access to this email address.
              </p>
            ) : (
              <p className="muted">
                Ask the administrator to grant access to your account email.
              </p>
            )}
            <Link className="button secondary" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack large">
      <PageHeader
        eyebrow="Study assistant"
        title="Ask your notes"
        description="Choose the material to include, then ask for explanations, summaries or answers."
        actions={
          messages.length > 0 ? (
            <Button variant="secondary" onClick={() => setMessages([])}>
              Clear chat
            </Button>
          ) : null
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div className="assistant-layout">
        <div className="stack">
          <Card
            title="Study context"
            description="Only selected notes from a space you own are sent to Gemini."
          >
            <div className="stack">
              <label className="field">
                <span>Study space</span>
                <select
                  value={spaceId}
                  onChange={(event) => setSpaceId(event.target.value)}
                >
                  <option value="">General chat (no notes)</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} - {space.subject}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Answer style</span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as AssistantChatMode)}
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="assistant-note-head">
                <div>
                  <strong>Notes</strong>
                  <p className="muted small-text">
                    {spaceId
                      ? `${selectedNoteIds.length} of ${notes.length} selected`
                      : 'Select a study space to include notes.'}
                  </p>
                </div>
                {notes.length > 0 ? (
                  <button
                    type="button"
                    className="assistant-text-button"
                    onClick={() =>
                      setSelectedNoteIds(
                        selectedNoteIds.length === notes.length
                          ? []
                          : notes.map((note) => note.id),
                      )
                    }
                  >
                    {selectedNoteIds.length === notes.length ? 'Clear all' : 'Select all'}
                  </button>
                ) : null}
              </div>

              {notesLoading ? (
                <p className="muted small-text">Loading notes...</p>
              ) : notes.length === 0 ? (
                <p className="muted small-text">
                  {spaceId
                    ? 'This space has no notes yet. You can still ask a general question.'
                    : 'No notes will be included in this conversation.'}
                </p>
              ) : (
                <div className="assistant-note-list">
                  {notes.map((note) => (
                    <label key={note.id} className="assistant-note-option">
                      <input
                        type="checkbox"
                        checked={selectedNoteIds.includes(note.id)}
                        onChange={() => toggleNote(note.id)}
                      />
                      <span>
                        <strong>{note.title}</strong>
                        <small>{note.tags.join(', ') || 'No tags'}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="Privacy">
            <p className="muted small-text">
              Selected notes and your prompts are processed by Google Gemini. On Google's
              Free tier, submitted data may be used to improve Google products. Do not
              include sensitive personal information.
            </p>
            <p className="footnote">
              AI answers can be wrong. Check important details against your notes.
            </p>
          </Card>
        </div>

        <section className="panel assistant-chat" aria-label="AI assistant conversation">
          <header className="assistant-chat-head">
            <div>
              <h2>{spaces.find((space) => space.id === spaceId)?.name ?? 'General chat'}</h2>
              <p className="muted small-text">
                {selectedNoteIds.length > 0
                  ? `${selectedNoteIds.length} note${selectedNoteIds.length === 1 ? '' : 's'} in context`
                  : 'No note context selected'}
              </p>
            </div>
            <span className="badge">Gemini</span>
          </header>

          <div className="assistant-messages">
            {messages.length === 0 ? (
              <div className="assistant-welcome">
                <h3>Start with a question about your material.</h3>
                <p className="muted">
                  Try “Explain this topic simply”, “Summarize the key ideas” or “What
                  should I revise first?”
                </p>
                <div className="assistant-suggestions">
                  {[
                    'Explain the hardest idea in these notes.',
                    'Summarize the selected notes for revision.',
                    'Give me three likely exam questions.',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="assistant-suggestion"
                      onClick={() => setInput(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((entry) => (
                <article
                  key={entry.id}
                  className={`assistant-message ${entry.role}`}
                >
                  <div className="assistant-message-meta">
                    <strong>{entry.role === 'user' ? 'You' : 'Study assistant'}</strong>
                    {entry.role === 'assistant' && entry.provider ? (
                      <span className="badge">{entry.provider}</span>
                    ) : null}
                  </div>
                  {entry.role === 'assistant' ? (
                    <>
                      <Markdown content={entry.content} />
                      <div className="assistant-citation-row">
                        {entry.citations?.map((citation) => (
                          <Link
                            key={citation.id}
                            className="assistant-citation"
                            to={`/notes/${citation.id}`}
                          >
                            {citation.title}
                          </Link>
                        ))}
                        {entry.usedExternalKnowledge ? (
                          <span className="badge warning">General knowledge</span>
                        ) : entry.citations?.length ? (
                          <span className="badge success">From your notes</span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p>{entry.content}</p>
                  )}
                </article>
              ))
            )}
            {sending ? (
              <div className="assistant-thinking" role="status">
                <span className="spinner" aria-hidden="true" />
                Checking your notes...
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form className="assistant-composer" onSubmit={submit}>
            <textarea
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask about your selected notes..."
              aria-label="Ask the study assistant"
              maxLength={4000}
            />
            <div className="assistant-composer-footer">
              <span className="muted small-text">
                Enter to send. Shift+Enter for a new line.
              </span>
              <Button type="submit" disabled={sending || input.trim().length === 0}>
                {sending ? 'Thinking...' : 'Send'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
