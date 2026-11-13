import { useId } from 'react';
import { useTheme, type ThemePreference } from '../theme/ThemeContext';

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const ThemeIcon = ({ theme }: { theme: ThemePreference }) => {
  if (theme === 'light') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }

  if (theme === 'dark') {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.5 14.4A8.2 8.2 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
};

export const ThemeSelector = ({ compact = false }: { compact?: boolean }) => {
  const { theme, setTheme } = useTheme();
  const groupName = useId();

  return (
    <div
      className={compact ? 'theme-selector compact' : 'theme-selector'}
      role="radiogroup"
      aria-label="Theme"
    >
      {THEME_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`theme-option${theme === option.value ? ' active' : ''}`}
        >
          <input
            type="radio"
            name={groupName}
            value={option.value}
            checked={theme === option.value}
            onChange={() => setTheme(option.value)}
          />
          <ThemeIcon theme={option.value} />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
};
