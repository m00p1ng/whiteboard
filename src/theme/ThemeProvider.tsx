import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'whiteboard-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

interface InitialTheme {
  theme: Theme;
  hasManualTheme: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialTheme(): InitialTheme {
  const storedTheme = readStoredTheme();
  return {
    theme: storedTheme ?? getSystemTheme(),
    hasManualTheme: storedTheme !== null,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [initialTheme] = useState(getInitialTheme);
  const [hasManualTheme, setHasManualTheme] = useState(
    initialTheme.hasManualTheme
  );
  const [theme, setActiveTheme] = useState<Theme>(initialTheme.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (hasManualTheme || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateFromSystem = (event: MediaQueryListEvent) => {
      setActiveTheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', updateFromSystem);
    return () => mediaQuery.removeEventListener('change', updateFromSystem);
  }, [hasManualTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(nextTheme) {
        setActiveTheme(nextTheme);
        setHasManualTheme(true);
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
          // Keep the selected theme for this session when storage is blocked.
        }
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// The provider and its hook intentionally share one focused theme module.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
