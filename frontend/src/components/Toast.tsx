import { useEffect, useState } from 'react';

export const Toast = ({ message, onDone }: { message: string | null; onDone: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = window.setTimeout(() => {
        setVisible(false);
        onDone();
      }, 3200);
      return () => window.clearTimeout(timer);
    }
    setVisible(false);
    return undefined;
  }, [message, onDone]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
};
