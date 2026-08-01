import { createContext } from 'react';

/** User-selectable theme mode. `system` follows the OS preference. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** The concrete theme actually applied. */
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The user's selection. */
  mode: ThemeMode;
  /** The effective theme after resolving `system`. */
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Flips between light and dark based on the currently resolved theme. */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
