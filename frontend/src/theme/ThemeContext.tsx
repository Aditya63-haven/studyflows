import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  reduceMotion: boolean;
  setReduceMotion: (reduceMotion: boolean) => void;
}

const THEME_STORAGE_KEY = 'studyflows.theme';
const MOTION_STORAGE_KEY = 'studyflows.reduce-motion';
const DARK_THEME_COLOR = '#12161c';
const LIGHT_THEME_COLOR = '#f4f7f5';

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const prefersLightTheme = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;

const resolveTheme = (theme: ThemePreference): 'light' | 'dark' => {
  if (theme === 'system') {
    return prefersLightTheme() ? 'light' : 'dark';
  }
  return theme;
};

const readThemePreference = (): ThemePreference => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) {
      return stored;
    }
  } catch {
    return 'dark';
  }
  return 'dark';
};

const readReduceMotion = (): boolean => {
  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored === 'true' || stored === 'false') {
      return stored === 'true';
    }
  } catch {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const applyTheme = (theme: ThemePreference): void => {
  if (typeof document === 'undefined') {
    return;
  }
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  const colorScheme = document.querySelector('meta[name="theme-color"]');
  if (colorScheme) {
    colorScheme.setAttribute(
      'content',
      resolved === 'light' ? LIGHT_THEME_COLOR : DARK_THEME_COLOR,
    );
  }
};

const applyReduceMotion = (reduceMotion: boolean): void => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
};

const initialTheme = readThemePreference();
const initialReduceMotion = readReduceMotion();

applyTheme(initialTheme);
applyReduceMotion(initialReduceMotion);

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemePreference] = useState<ThemePreference>(initialTheme);
  const [reduceMotion, setReduceMotionPreference] = useState(initialReduceMotion);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    applyReduceMotion(reduceMotion);
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, String(reduceMotion));
    } catch {
      return;
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (theme !== 'system') {
      return undefined;
    }
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => applyTheme('system');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((value: ThemePreference) => {
    setThemePreference(value);
  }, []);

  const setReduceMotion = useCallback((value: boolean) => {
    setReduceMotionPreference(value);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, reduceMotion, setReduceMotion }),
    [theme, setTheme, reduceMotion, setReduceMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
