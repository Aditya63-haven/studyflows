import { Chip } from './Chip';

interface SessionCardProps {
  chips: string[];
  title: string;
  meta: string;
  recordLabel?: string;
  onRecord?: () => void;
  recordDisabled?: boolean;
  detailsLabel?: string;
  onDetails?: () => void;
}

export const SessionCard = ({
  chips,
  title,
  meta,
  recordLabel = 'Record progress',
  onRecord,
  recordDisabled = false,
  detailsLabel = 'Details',
  onDetails,
}: SessionCardProps) => (
  <article className="session-card">
    {chips.length > 0 ? (
      <div className="chip-row">
        {chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
    ) : null}
    <h3>{title}</h3>
    <p className="muted small-text">{meta}</p>
    <div className="session-actions">
      {onRecord ? (
        <button
          type="button"
          className="button small"
          onClick={onRecord}
          disabled={recordDisabled}
        >
          {recordLabel}
        </button>
      ) : null}
      {onDetails ? (
        <button type="button" className="button small secondary" onClick={onDetails}>
          {detailsLabel}
        </button>
      ) : null}
    </div>
  </article>
);
