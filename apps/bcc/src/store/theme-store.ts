import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThemeMode } from '@superdreams/types';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

/**
 * Client state: the user's theme preference. Persisted to localStorage so the
 * choice survives reloads. Applying the theme to the DOM is the responsibility
 * of the ThemeProvider.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => {
        set({ mode });
      },
    }),
    { name: 'superdreams.bcc.theme' },
  ),
);
