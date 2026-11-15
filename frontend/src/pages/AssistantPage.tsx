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
  analyticsApi,
  assistantApi,
  documentsApi,
  getErrorMessage,
  notesApi,
  spacesApi,
} from '../api';
import type {
  AiAccessStatus,
  AssistantChatMode,
  AssistantCitation,
  AssistantDocumentCitation,
  AssistantPerformanceResult,
  Note,
  RevisionRecommendation,
  StudyDocument,
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
  documentCitations?: AssistantDocumentCitation[];
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
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [mode, setMode] = useState<AssistantChatMode>('answer');
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [performance, setPerformance] = useState<AssistantPerformanceResult | null>(null);
  const [analyzingPerformance, setAnalyzingPerformance] = useState(false);
  const [acceptingRecommendation, setAcceptingRecommendation] = useState<string | null>(
    null,
  );
  const [performanceNotice, setPerformanceNotice] = useState<string | null>(null);
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
      setDocuments([]);
      setSelectedDocumentIds([]);
      return undefined;
    }

    let active = true;
    setNotes([]);
    setSelectedNoteIds([]);
    setDocuments([]);
    setSelectedDocumentIds([]);
    setNotesLoading(true);
    Promise.all([notesApi.listBySpace(spaceId), documentsApi.listBySpace(spaceId)])
      .then(([noteList, documentList]) => {
        if (!active) {
          return;
        }
        setNotes(noteList);
        setSelectedNoteIds(noteList.map((note) => note.id));
        const ready = documentList.filter((document) => document.status === 'ready');
        setDocuments(ready);
        setSelectedDocumentIds(ready.map((document) => document.id));
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
    setPerformance(null);
    setPerformanceNotice(null);
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

  const toggleDocument = (documentId: string) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
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
        documentIds: selectedDocumentIds,
        history,
      });
      setMessages((current) => [
        ...current,
        {
          id: makeEntryId(),
          role: 'assistant',
          content: result.answer,
          citations: result.citations,
          documentCitations: result.documentCitations,
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

  const analyzePerformance = async () => {
    setAnalyzingPerformance(true);
    setError(null);
    setPerformanceNotice(null);
    try {
      setPerformance(
        await assistantApi.performance({
          days: 90,
          spaceId: spaceId || undefined,
        }),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAnalyzingPerformance(false);
    }
  };

  const acceptRecommendation = async (recommendation: RevisionRecommendation) => {
    setAcceptingRecommendation(recommendation.id);
    setError(null);
    setPerformanceNotice(null);
    try {
      const filters = { days: 90, spaceId: spaceId || undefined };
      const result = await analyticsApi.acceptRecommendation(recommendation.id, filters);
      setPerformanceNotice(
        result.created
          ? `Added "${recommendation.topicName}" to your revision schedule.`
          : `"${recommendation.topicName}" already has a revision schedule.`,
      );
      setPerformance((current) =>
        current
          ? {
              ...current,
              recommendations: current.recommendations.map((candidate) =>
                candidate.id === recommendation.id
                  ? { ...candidate, alreadyScheduled: true, addable: false }
                  : candidate,
              ),
            }
          : current,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAcceptingRecommendation(null);
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
        title="Ask your material"
        description="Choose notes and documents to include, then ask for explanations, summaries or answers."
        actions={
          <div className="toolbar">
            <Button
              variant="secondary"
              onClick={() => void analyzePerformance()}
              disabled={analyzingPerformance}
            >
              {analyzingPerformance ? 'Analyzing...' : 'Analyze my performance'}
            </Button>
            {messages.length > 0 ? (
              <Button variant="secondary" onClick={() => setMessages([])}>
                Clear chat
              </Button>
            ) : null}
          </div>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {performanceNotice ? (
        <p className="notice">{performanceNotice}</p>
      ) : null}

      {performance ? (
        <section className="panel assistant-performance" aria-label="Performance interpretation">
          <div className="section-heading">
            <div>
              <h2>Performance interpretation</h2>
              <p className="muted small-text">
                AI interpretation of measured quiz and revision data from the last 90
                days. The numbers below come from the backend, not the model.
              </p>
            </div>
            <span className="badge">{performance.provider}</span>
          </div>

          <p>{performance.summary}</p>
          <p className="muted small-text">{performance.trendInterpretation}</p>

          <div className="split-grid">
            <div>
              <h3>Strengths</h3>
              {performance.strengths.length === 0 ? (
                <p className="muted small-text">No clear strengths yet.</p>
              ) : (
                <ul className="evidence-list">
                  {performance.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Improvement areas</h3>
              {performance.improvementAreas.length === 0 ? (
                <p className="muted small-text">No weak areas identified.</p>
              ) : (
                <ul className="evidence-list">
                  {performance.improvementAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {performance.focusTopics.length > 0 ? (
            <div>
              <h3>Focus topics</h3>
              <div className="tag-row">
                {performance.focusTopics.map((topic) => (
                  <span key={topic.topicId} className="tag">
                    {topic.topicName} · {topic.accuracy ?? '—'}%
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {performance.practiceSuggestions.length > 0 ? (
            <div>
              <h3>Practice suggestions</h3>
              <div className="stack">
                {performance.practiceSuggestions.map((suggestion) => (
                  <div key={`${suggestion.title}-${suggestion.topicId ?? 'general'}`}>
                    <strong>{suggestion.title}</strong>
                    <p className="muted small-text">{suggestion.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {performance.recommendations.length > 0 ? (
            <div>
              <h3>Recommended revision</h3>
              <div className="stack">
                {performance.recommendations.slice(0, 3).map((recommendation) => (
                  <article key={recommendation.id} className="recommendation-card">
                    <div className="section-heading tight">
                      <div>
                        <strong>{recommendation.title}</strong>
                        <p className="muted small-text">{recommendation.reason}</p>
                      </div>
                      <span className={`badge priority-${recommendation.priority}`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <div className="recommendation-actions">
                      <span className="muted small-text">
                        {recommendation.suggestedMinutes} minutes
                      </span>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={
                          !recommendation.addable ||
                          recommendation.alreadyScheduled ||
                          acceptingRecommendation === recommendation.id
                        }
                        onClick={() => void acceptRecommendation(recommendation)}
                      >
                        {recommendation.alreadyScheduled
                          ? 'Already scheduled'
                          : acceptingRecommendation === recommendation.id
                            ? 'Adding...'
                            : 'Add to revision'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {performance.dataQuality.limitations.length > 0 ? (
            <details>
              <summary>Data limitations</summary>
              <ul className="evidence-list">
                {performance.dataQuality.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <div className="assistant-layout">
        <div className="stack">
          <Card
            title="Study context"
            description="Only selected notes and documents from a space you own are sent to Gemini."
          >
            <div className="stack">
              <label className="field">
                <span>Study space</span>
                <select
                  value={spaceId}
                  onChange={(event) => setSpaceId(event.target.value)}
                >
                  <option value="">General chat (no study context)</option>
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

              <div className="assistant-note-head">
                <div>
                  <strong>Documents</strong>
                  <p className="muted small-text">
                    {spaceId
                      ? `${selectedDocumentIds.length} of ${documents.length} selected`
                      : 'Select a study space to include documents.'}
                  </p>
                </div>
                {documents.length > 0 ? (
                  <button
                    type="button"
                    className="assistant-text-button"
                    onClick={() =>
                      setSelectedDocumentIds(
                        selectedDocumentIds.length === documents.length
                          ? []
                          : documents.map((document) => document.id),
                      )
                    }
                  >
                    {selectedDocumentIds.length === documents.length
                      ? 'Clear all'
                      : 'Select all'}
                  </button>
                ) : null}
              </div>

              {notesLoading ? (
                <p className="muted small-text">Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="muted small-text">
                  {spaceId
                    ? 'This space has no processed documents yet. Upload files from the study space.'
                    : 'No documents will be included in this conversation.'}
                </p>
              ) : (
                <div className="assistant-note-list">
                  {documents.map((document) => (
                    <label key={document.id} className="assistant-note-option">
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={() => toggleDocument(document.id)}
                      />
                      <span>
                        <strong>{document.originalName}</strong>
                        <small>
                          {document.format.toUpperCase()}
                          {document.pageCount > 0 ? ` · ${document.pageCount} pages` : ''}
                          {` · ${document.chunkCount} chunks`}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="Privacy">
            <p className="muted small-text">
              Selected notes, document excerpts and your prompts are processed by Google
              Gemini. On Google's Free tier, submitted data may be used to improve Google
              products. Do not include sensitive personal information.
            </p>
            <p className="footnote">
              AI answers can be wrong. Check important details against your source material.
            </p>
          </Card>
        </div>

        <section className="panel assistant-chat" aria-label="AI assistant conversation">
          <header className="assistant-chat-head">
            <div>
              <h2>{spaces.find((space) => space.id === spaceId)?.name ?? 'General chat'}</h2>
              <p className="muted small-text">
                {selectedNoteIds.length > 0 || selectedDocumentIds.length > 0
                  ? [
                      selectedNoteIds.length > 0
                        ? `${selectedNoteIds.length} note${
                            selectedNoteIds.length === 1 ? '' : 's'
                          }`
                        : '',
                      selectedDocumentIds.length > 0
                        ? `${selectedDocumentIds.length} document${
                            selectedDocumentIds.length === 1 ? '' : 's'
                          }`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' and ') + ' in context'
                  : 'No study context selected'}
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
                        {entry.documentCitations?.map((citation) => (
                          <span
                            key={citation.id}
                            className="assistant-citation document"
                            title={citation.excerpt}
                          >
                            {citation.title}
                            {citation.pageNumber ? ` · p. ${citation.pageNumber}` : ''}
                            {citation.section ? ` · ${citation.section}` : ''}
                          </span>
                        ))}
                        {entry.usedExternalKnowledge ? (
                          <span className="badge warning">General knowledge</span>
                        ) : entry.documentCitations?.length && entry.citations?.length ? (
                          <span className="badge success">
                            From your notes and documents
                          </span>
                        ) : entry.documentCitations?.length ? (
                          <span className="badge success">From your documents</span>
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
