import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { examPlansApi, getErrorMessage, spacesApi } from '../api';
import type {
  ExamPlan,
  ExamPreparationOverview,
  ExamPreparationPreview,
  ExamPreparationSelection,
  StudySpace,
} from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, Notice } from '../components/ErrorBanner';
import { Loading } from '../components/Loading';
import { PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatDate, formatDateTime, formatMinutes } from '../utils/format';

const statusLabel = (status: string): string =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusBadgeClass = (status: string): string => {
  if (status === 'completed' || status === 'strong' || status === 'mastered') {
    return 'badge success';
  }
  if (status === 'weak' || status === 'needs_revision') {
    return 'badge danger';
  }
  if (status === 'due') {
    return 'badge status-due';
  }
  return 'badge';
};

export const ExamPlanDetailPage = () => {
  const { planId = '' } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ExamPlan | null>(null);
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [preparation, setPreparation] = useState<ExamPreparationOverview | null>(null);
  const [preview, setPreview] = useState<ExamPreparationPreview | null>(null);
  const [spaceId, setSpaceId] = useState('');
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [acknowledgeConflicts, setAcknowledgeConflicts] = useState(false);
  const [preparationLoading, setPreparationLoading] = useState(true);
  const [preparationAction, setPreparationAction] = useState<'preview' | 'approve' | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    examPlansApi
      .get(planId)
      .then((result) => {
        if (active) {
          setPlan(result);
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
  }, [planId]);

  useEffect(() => {
    let active = true;
    Promise.all([
      examPlansApi.getPreparation(planId),
      spacesApi.list().catch(() => [] as StudySpace[]),
    ])
      .then(([overview, spaceList]) => {
        if (!active) {
          return;
        }
        setPreparation(overview);
        setPreview(null);
        setSpaceId(overview.space?.id ?? '');
        setDocumentIds(overview.selectedDocumentIds);
        setSpaces(spaceList);
      })
      .catch((requestError) => {
        if (active) {
          setPreparationError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setPreparationLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [planId]);

  const loadPreparation = async (requestedSpaceId: string | null) => {
    setPreparationLoading(true);
    setPreparationError(null);
    setPreview(null);
    setAcknowledgeConflicts(false);
    try {
      const overview = await examPlansApi.getPreparation(planId, requestedSpaceId);
      setPreparation(overview);
      setSpaceId(overview.space?.id ?? '');
      setDocumentIds(overview.selectedDocumentIds);
    } catch (requestError) {
      setPreparationError(getErrorMessage(requestError));
    } finally {
      setPreparationLoading(false);
    }
  };

  const changeSpace = (nextSpaceId: string) => {
    void loadPreparation(nextSpaceId || null);
  };

  const toggleDocument = (documentId: string) => {
    setDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
    setPreview(null);
    setAcknowledgeConflicts(false);
  };

  const buildSelection = (): ExamPreparationSelection =>
    spaceId
      ? { spaceId, documentIds }
      : { spaceId: null };

  const generatePreview = async () => {
    setPreparationAction('preview');
    setPreparationError(null);
    setNotice(null);
    try {
      const result = await examPlansApi.previewPreparation(planId, buildSelection());
      setPreview(result);
      setAcknowledgeConflicts(false);
    } catch (requestError) {
      setPreparationError(getErrorMessage(requestError));
    } finally {
      setPreparationAction(null);
    }
  };

  const approvePreparation = async () => {
    if (!preview) {
      return;
    }
    if (preview.requiresAcknowledgement && !acknowledgeConflicts) {
      setPreparationError(
        'Acknowledge the unscheduled minutes before approving this plan.',
      );
      return;
    }
    setPreparationAction('approve');
    setPreparationError(null);
    try {
      const result = await examPlansApi.approvePreparation(planId, {
        ...buildSelection(),
        topicOrder: preview.topicOrder,
        approvalFingerprint: preview.approvalFingerprint,
        acknowledgeConflicts: preview.requiresAcknowledgement
          ? acknowledgeConflicts
          : undefined,
        strategySummary: preview.strategy.summary,
        provider: preview.strategy.provider,
      });
      setPlan(result.plan);
      setNotice(
        result.created
          ? 'Preparation schedule approved. Your study days now match the preview.'
          : 'This preparation schedule was already approved.',
      );
      await loadPreparation(spaceId || null);
    } catch (requestError) {
      setPreparationError(getErrorMessage(requestError));
    } finally {
      setPreparationAction(null);
    }
  };

  const markComplete = async (dayId: string, topicId: string, topicName: string) => {
    const key = `${dayId}:${topicId}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await examPlansApi.markTopicComplete(planId, topicId, dayId);
      setPlan(updated);
      setNotice(`Marked "${topicName}" complete.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyKey(null);
    }
  };

  const deletePlan = async () => {
    if (!plan || !window.confirm(`Delete "${plan.name}"?`)) {
      return;
    }
    setError(null);
    try {
      await examPlansApi.remove(plan.id);
      navigate('/exam-plans');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  if (loading) {
    return <Loading label="Loading exam plan..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        title="Exam plan not found"
        description={error ?? 'It may have been deleted.'}
        actionLabel="Back to exam plans"
        actionTo="/exam-plans"
      />
    );
  }

  const topicById = new Map(plan.topics.map((topic) => [topic.id, topic]));
  const completedTopicIds = new Set(
    plan.studyDays.flatMap((day) => day.completedTopicIds),
  );
  const preparationView = preview ?? preparation;
  const preparationTopicById = new Map(
    (preparationView?.topics ?? []).map((topic) => [topic.id, topic]),
  );
  const hasSavedSpace =
    Boolean(spaceId) && spaces.some((space) => space.id === spaceId);

  return (
    <div className="stack large">
      <PageHeader
        eyebrow={`Exam on ${formatDate(plan.examDate)}`}
        title={plan.name}
        description={`${plan.topics.length} topics - ${plan.dailyStudyHours} study hour(s) per day`}
        actions={
          <>
            <Link className="button secondary" to="/exam-plans">
              All plans
            </Link>
            <button type="button" className="button small danger" onClick={() => void deletePlan()}>
              Delete plan
            </button>
          </>
        }
      />

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      <section className="panel stack">
        <div className="section-heading">
          <div>
            <h2>Overall progress</h2>
            <p className="muted small-text">
              {completedTopicIds.size} of {plan.topics.length} topics complete -{' '}
              {plan.daysRemaining >= 0
                ? `${plan.daysRemaining} day(s) remaining`
                : `${Math.abs(plan.daysRemaining)} day(s) past`}
            </p>
          </div>
          <span className="badge">{plan.progress}%</span>
        </div>
        <ProgressBar value={plan.progress} label={`${plan.progress}%`} />
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Topics</h2>
          <span className="badge">{plan.topics.length}</span>
        </div>
        {plan.topics.length === 0 ? (
          <EmptyState title="No topics" description="This plan does not contain topics." />
        ) : (
          <div className="tag-row">
            {plan.topics.map((topic) => (
              <span
                key={topic.id}
                className={completedTopicIds.has(topic.id) ? 'topic-pill complete' : 'topic-pill'}
              >
                {topic.name}
                <small>{formatMinutes(topic.estimatedMinutes)}</small>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="panel stack">
        <div className="section-heading">
          <div>
            <h2>AI exam preparation</h2>
            <p className="muted small-text">
              Combine quiz performance, revision status, source documents and availability
              into a deterministic day-by-day schedule.
            </p>
          </div>
          {preparationView?.existingPreparation ? (
            <span className="badge success">Approved</span>
          ) : (
            <span className="badge">Not approved</span>
          )}
        </div>

        <ErrorBanner
          message={preparationError}
          onDismiss={() => setPreparationError(null)}
        />

        {preparationLoading ? (
          <p className="muted small-text">Loading preparation context...</p>
        ) : preparationView ? (
          <>
            <div className="prep-toolbar">
              <label className="field grow">
                <span>Study space</span>
                <select
                  value={spaceId}
                  onChange={(event) => changeSpace(event.target.value)}
                  disabled={preparationAction !== null}
                >
                  <option value="">No study space (no document grounding)</option>
                  {spaceId && !hasSavedSpace ? (
                    <option value={spaceId}>
                      {preparationView.space?.name ?? 'Saved study space'}
                    </option>
                  ) : null}
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name} - {space.subject}
                    </option>
                  ))}
                </select>
              </label>
              <div className="prep-meta">
                <span className="chip">
                  Availability: {preparationView.availability.source}
                </span>
                <span className="chip">
                  {formatMinutes(preparationView.availability.weeklyMinutes)}/week
                </span>
                <span className="chip">
                  {preparationView.documents.length} document(s)
                </span>
              </div>
            </div>

            {preparationView.existingPreparation ? (
              <div className="inset-panel prep-summary">
                <div>
                  <strong>Approved preparation</strong>
                  <p className="muted small-text">
                    {preparationView.existingPreparation.provider} - approved{' '}
                    {formatDateTime(preparationView.existingPreparation.approvedAt)}
                  </p>
                </div>
                <div className="prep-meta">
                  <span className="chip">
                    Scheduled{' '}
                    {formatMinutes(preparationView.existingPreparation.scheduledMinutes)}
                  </span>
                  <span
                    className={
                      preparationView.existingPreparation.shortfallMinutes > 0
                        ? 'chip warn'
                        : 'chip accent'
                    }
                  >
                    {preparationView.existingPreparation.shortfallMinutes > 0
                      ? `${formatMinutes(
                          preparationView.existingPreparation.shortfallMinutes,
                        )} unscheduled`
                      : 'Fits before exam'}
                  </span>
                </div>
                {preparationView.existingPreparation.strategySummary ? (
                  <p className="muted small-text">
                    {preparationView.existingPreparation.strategySummary}
                  </p>
                ) : null}
              </div>
            ) : null}

            {preparationView.documents.length > 0 ? (
              <fieldset className="prep-documents">
                <legend>Source documents</legend>
                <p className="muted small-text">
                  Selected documents ground topic reasons and references. Changing the
                  selection requires a new preview.
                </p>
                <div className="prep-document-grid">
                  {preparationView.documents.map((document) => (
                    <label key={document.id} className="prep-document">
                      <input
                        type="checkbox"
                        checked={documentIds.includes(document.id)}
                        onChange={() => toggleDocument(document.id)}
                        disabled={preparationAction !== null}
                      />
                      <span>
                        <strong>{document.title}</strong>
                        <small>
                          {document.format.toUpperCase()} - {document.chunkCount} chunk(s)
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="muted small-text">
                No processed source documents are available for this study space.
              </p>
            )}

            {!preparationView.dataQuality.reliable ? (
              <div className="prep-warning">
                <strong>Limited evidence</strong>
                <p>
                  {preparationView.dataQuality.insufficientData.length > 0
                    ? preparationView.dataQuality.insufficientData.join(' ')
                    : 'There is not enough quiz history for confident topic classification.'}
                </p>
              </div>
            ) : null}

            <div className="section-heading tight">
              <div>
                <h3>Topic evidence</h3>
                <p className="muted small-text">
                  Weak and due topics are prioritized automatically.
                </p>
              </div>
              <span className="badge">{preparationView.topics.length}</span>
            </div>
            <div className="prep-topic-list">
              {preparationView.topics.map((topic) => (
                <article key={topic.id} className="prep-topic">
                  <div className="section-heading tight">
                    <div>
                      <strong>{topic.name}</strong>
                      <p className="muted small-text">
                        {formatMinutes(topic.estimatedMinutes)}
                        {topic.performance
                          ? ` - ${
                              topic.performance.accuracy === null
                                ? 'no accuracy yet'
                                : `${Math.round(topic.performance.accuracy)}% accuracy`
                            }`
                          : ''}
                      </p>
                    </div>
                    <span className={statusBadgeClass(topic.status)}>
                      {statusLabel(topic.status)}
                    </span>
                  </div>
                  <ul className="evidence-list">
                    {topic.evidence.map((evidence) => (
                      <li key={evidence}>{evidence}</li>
                    ))}
                  </ul>
                  {topic.revision ? (
                    <p className="muted small-text">
                      Revision: {topic.revision.memoryStrength}% memory strength - next
                      review {formatDate(topic.revision.nextReviewAt)}
                    </p>
                  ) : null}
                  {topic.sources.length > 0 ? (
                    <details>
                      <summary>Source references ({topic.sources.length})</summary>
                      <div className="prep-source-list">
                        {topic.sources.map((source) => (
                          <div key={source.chunkId} className="prep-source">
                            <span className="muted small-text">
                              {[
                                source.documentTitle,
                                source.pageNumber ? `page ${source.pageNumber}` : null,
                                source.section,
                              ]
                                .filter(Boolean)
                                .join(' - ')}
                            </span>
                            <p>{source.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="section-heading tight">
              <div>
                <h3>Proposed schedule</h3>
                <p className="muted small-text">
                  {formatMinutes(preparationView.schedule.scheduledMinutes)} scheduled of{' '}
                  {formatMinutes(preparationView.schedule.requiredMinutes)} required.
                </p>
              </div>
              {preparationView.schedule.shortfallMinutes > 0 ? (
                <span className="badge danger">
                  {formatMinutes(preparationView.schedule.shortfallMinutes)} unscheduled
                </span>
              ) : (
                <span className="badge success">Fits before exam</span>
              )}
            </div>
            {preparationView.schedule.days.length === 0 ? (
              <p className="muted small-text">
                No incomplete topics remain to schedule.
              </p>
            ) : (
              <div className="prep-schedule-list">
                {preparationView.schedule.days.map((day) => (
                  <div key={day.date} className="prep-schedule-day">
                    <div>
                      <strong>{formatDate(day.date)}</strong>
                      <p className="muted small-text">
                        {formatMinutes(day.plannedMinutes)}
                      </p>
                    </div>
                    <div className="tag-row">
                      {day.topicIds.map((topicId) => (
                        <span key={topicId} className="topic-pill">
                          {preparationTopicById.get(topicId)?.name ?? 'Topic'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {preparationView.schedule.warnings.length > 0 ? (
              <ul className="evidence-list">
                {preparationView.schedule.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={() => void generatePreview()}
                disabled={preparationAction !== null}
              >
                {preparationAction === 'preview'
                  ? 'Generating preview...'
                  : preview
                    ? 'Regenerate AI preview'
                    : 'Generate AI preview'}
              </button>
            </div>

            {preview ? (
              <div className="prep-preview stack">
                <div className="inset-panel stack">
                  <div className="section-heading tight">
                    <div>
                      <h3>AI sequencing preview</h3>
                      <p className="muted small-text">
                        {preview.strategy.provider}
                        {preview.strategy.fallback ? ' - deterministic fallback' : ''}
                      </p>
                    </div>
                    <span className="badge">
                      {preview.strategy.fallback ? 'Fallback' : 'AI suggested'}
                    </span>
                  </div>
                  <p>{preview.strategy.summary}</p>
                  {preview.strategy.warning ? (
                    <div className="prep-warning">
                      <strong>AI unavailable</strong>
                      <p>{preview.strategy.warning}</p>
                    </div>
                  ) : null}
                  <div className="prep-strategy-list">
                    {preview.strategy.items.map((item) => (
                      <div key={item.topicId} className="prep-strategy-item">
                        <div className="section-heading tight">
                          <strong>{item.topicName}</strong>
                          <span className="chip">{item.source}</span>
                        </div>
                        <p>{item.reason}</p>
                        <p className="muted small-text">{item.practiceActivity}</p>
                      </div>
                    ))}
                  </div>
                  {preview.strategy.cautions.length > 0 ? (
                    <ul className="evidence-list">
                      {preview.strategy.cautions.map((caution) => (
                        <li key={caution}>{caution}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {preview.conflicts.length > 0 ? (
                  <div className="prep-warning">
                    <strong>Schedule conflicts</strong>
                    <ul className="evidence-list">
                      {preview.conflicts.map((conflict) => (
                        <li key={conflict}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {preview.requiresAcknowledgement ? (
                  <label className="prep-acknowledgement">
                    <input
                      type="checkbox"
                      checked={acknowledgeConflicts}
                      onChange={(event) =>
                        setAcknowledgeConflicts(event.target.checked)
                      }
                    />
                    <span>
                      I understand that{' '}
                      {formatMinutes(preview.schedule.shortfallMinutes)} cannot fit before
                      the exam and want to approve the partial schedule.
                    </span>
                  </label>
                ) : null}

                <div className="form-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => void approvePreparation()}
                    disabled={
                      preparationAction !== null ||
                      (preview.requiresAcknowledgement && !acknowledgeConflicts)
                    }
                  >
                    {preparationAction === 'approve'
                      ? 'Approving...'
                      : 'Approve preparation schedule'}
                  </button>
                  <span className="muted small-text">
                    Approval fingerprint: {preview.approvalFingerprint.slice(0, 12)}...
                  </span>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted small-text">
            Preparation context is unavailable. Choose a study space and retry.
          </p>
        )}
      </section>

      <section className="stack">
        <div className="section-heading">
          <div>
            <h2>Daily schedule</h2>
            <p className="muted small-text">Mark topics complete as you finish them.</p>
          </div>
        </div>

        {plan.studyDays.length === 0 ? (
          <EmptyState
            title="No study days"
            description="There are no scheduled study days for this plan."
          />
        ) : (
          plan.studyDays.map((day, index) => (
            <article key={day.id} className={day.isComplete ? 'panel day-card complete' : 'panel day-card'}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Day {index + 1}</span>
                  <h3>{formatDate(day.date)}</h3>
                  <p className="muted small-text">
                    {formatMinutes(day.plannedMinutes)} planned - {day.completedTopicIds.length}/
                    {day.topicIds.length} topics complete
                  </p>
                </div>
                <span className={day.isComplete ? 'badge success' : 'badge'}>
                  {day.progress}%
                </span>
              </div>
              <ProgressBar value={day.progress} />
              <div className="stack">
                {day.topicIds.map((topicId) => {
                  const topic = topicById.get(topicId);
                  const complete = day.completedTopicIds.includes(topicId);
                  const key = `${day.id}:${topicId}`;
                  return (
                    <div key={topicId} className="topic-row">
                      <div>
                        <strong>{topic?.name ?? 'Topic'}</strong>
                        {topic?.description ? (
                          <p className="muted small-text">{topic.description}</p>
                        ) : null}
                        <span className="muted small-text">
                          {topic ? formatMinutes(topic.estimatedMinutes) : 'Unknown duration'}
                        </span>
                      </div>
                      {complete ? (
                        <span className="badge success">Complete</span>
                      ) : (
                        <button
                          type="button"
                          className="button small"
                          onClick={() => void markComplete(day.id, topicId, topic?.name ?? 'Topic')}
                          disabled={busyKey !== null}
                        >
                          {busyKey === key ? 'Saving...' : 'Mark complete'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};
