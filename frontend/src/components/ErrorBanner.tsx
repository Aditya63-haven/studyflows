import type { ReactNode } from 'react';

interface ErrorBannerProps {
  message?: string | null;
  details?: unknown;
  onDismiss?: () => void;
}

const detailText = (details: unknown): string | null => {
  if (!details) {
    return null;
  }
  if (typeof details === 'string') {
    return details;
  }
  try {
    return JSON.stringify(details);
  } catch {
    return null;
  }
};

export const ErrorBanner = ({ message, details, onDismiss }: ErrorBannerProps) => {
  if (!message) {
    return null;
  }

  const detail = detailText(details);

  return (
    <div className="error-banner" role="alert">
      <div>
        <strong>{message}</strong>
        {detail ? <pre className="error-details">{detail}</pre> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="icon-button"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          Close
        </button>
      ) : null}
    </div>
  );
};

export const Notice = ({ children }: { children: ReactNode }) => (
  <div className="notice">{children}</div>
);
