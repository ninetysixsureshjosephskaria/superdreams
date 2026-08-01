import { useThemeStore } from '@/store';
import type { ResolvedTheme, ThemeMode } from '@superdreams/types';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Resolves a theme mode to the concrete theme to apply (`system` → OS preference). */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

export interface UseThemeResult {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/**
 * Reads and controls the theme preference (client state). DOM application is
 * handled by the ThemeProvider.
 */
export function useTheme(): UseThemeResult {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const resolvedTheme = resolveTheme(mode);

  const toggle = (): void => {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return { mode, resolvedTheme, setMode, toggle };
}
