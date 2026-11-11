import { useId } from 'react';

interface TimeRangeRowProps {
  id: string;
  start: string;
  end: string;
  onChange: (id: string, start: string, end: string) => void;
  onRemove: (id: string) => void;
  removeDisabled?: boolean;
}

export const TimeRangeRow = ({
  id,
  start,
  end,
  onChange,
  onRemove,
  removeDisabled = false,
}: TimeRangeRowProps) => {
  const startId = useId();

  return (
    <div className="time-range-row">
      <label className="field-label" htmlFor={`${startId}-start`}>
        <span className="visually-hidden">Window start</span>
        <input
          id={`${startId}-start`}
          type="time"
          value={start}
          onChange={(event) => onChange(id, event.target.value, end)}
        />
      </label>
      <span className="range-word" aria-hidden="true">
        to
      </span>
      <label className="field-label" htmlFor={`${startId}-end`}>
        <span className="visually-hidden">Window end</span>
        <input
          id={`${startId}-end`}
          type="time"
          value={end}
          onChange={(event) => onChange(id, start, event.target.value)}
        />
      </label>
      <button
        type="button"
        className="button small secondary"
        onClick={() => onRemove(id)}
        disabled={removeDisabled}
      >
        Remove
      </button>
    </div>
  );
};
