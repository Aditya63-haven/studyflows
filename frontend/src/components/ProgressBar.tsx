export const ProgressBar = ({
  value,
  label,
}: {
  value: number;
  label?: string;
}) => (
  <div className="progress-wrap">
    <div className="progress-track" aria-hidden="true">
      <div
        className="progress-fill"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
    {label ? <span className="progress-label">{label}</span> : null}
  </div>
);
