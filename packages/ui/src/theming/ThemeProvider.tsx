import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { storageKey } from '@superdreams/constants';

import {
  ThemeContext,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemeMode,
} from './theme-context';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function resolveMode(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode;
}

function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Initial mode when nothing is persisted. */
  defaultMode?: ThemeMode;
  /** Storage namespace (e.g. the app name) so apps don't collide. */
  storageId?: string;
}

/**
 * Applies the `.dark` class to `<html>`, persists the choice, and reacts to the
 * OS preference while in `system` mode. Presentation-only theme plumbing — no
 * business logic.
 */
export function ThemeProvider({
  children,
  defaultMode = 'system',
  storageId = 'app',
}: ThemeProviderProps) {
  const key = storageKey(storageId, 'theme');

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return defaultMode;
    }
    const stored = window.localStorage.getItem(key);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : defaultMode;
  });
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveMode(mode));

  useEffect(() => {
    const resolved = resolveMode(mode);
    setTheme(resolved);
    applyTheme(resolved);
    window.localStorage.setItem(key, mode);
  }, [mode, key]);

  useEffect(() => {
    if (mode !== 'system') {
      return undefined;
    }
    const query = window.matchMedia(MEDIA_QUERY);
    const onChange = (): void => {
      const resolved = systemTheme();
      setTheme(resolved);
      applyTheme(resolved);
    };
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => (resolveMode(current) === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, theme, setMode, toggle }),
    [mode, theme, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
