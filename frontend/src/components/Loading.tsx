export const Loading = ({ label = 'Loading...' }: { label?: string }) => (
  <div className="loading" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);
