import { useEffect, type ReactNode } from 'react';

import { resolveTheme } from '@/hooks';
import { useThemeStore } from '@/store';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Applies the current theme to the document root and keeps it in sync with the
 * OS preference when the mode is `system`.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (): void => {
      const resolved = resolveTheme(mode);
      root.classList.toggle('dark', resolved === 'dark');
      root.style.colorScheme = resolved;
    };

    apply();

    if (mode === 'system' && typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (): void => {
        apply();
      };
      media.addEventListener('change', listener);
      return () => {
        media.removeEventListener('change', listener);
      };
    }

    return undefined;
  }, [mode]);

  return <>{children}</>;
}
