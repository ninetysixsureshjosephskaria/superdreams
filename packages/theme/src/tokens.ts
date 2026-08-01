/*
 * Super Dreams design tokens — the single, typed source of truth.
 *
 * Color tokens are intentionally NOT listed with raw values here: colors resolve
 * to CSS custom properties (see `styles.css`) so they can switch with the theme.
 * This module exposes the *names* of those semantic colors plus every non-color
 * scale (typography, spacing, radius, shadow, z-index, breakpoints, motion) as
 * reusable constants. The Tailwind `preset` consumes these so the CSS utilities
 * and the JS constants never drift apart.
 */

/** Semantic color token names. Each maps to `hsl(var(--<name>))` in the preset. */
export const SEMANTIC_COLORS = [
  'background',
  'foreground',
  'primary',
  'secondary',
  'muted',
  'accent',
  'destructive',
  'success',
  'warning',
  'info',
  'card',
  'popover',
  'border',
  'input',
  'ring',
] as const;

export type SemanticColor = (typeof SEMANTIC_COLORS)[number];

/** Colors that also expose a paired `-foreground` token for content on top. */
export const COLOR_PAIRS = [
  'primary',
  'secondary',
  'muted',
  'accent',
  'destructive',
  'success',
  'warning',
  'info',
  'card',
  'popover',
] as const;

/** Responsive breakpoints (mobile-first). */
export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/** Semantic spacing steps (in addition to Tailwind's numeric scale). */
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

/** Border radius scale. `sm/md/lg` derive from the themeable `--radius`. */
export const radii = {
  none: '0px',
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const;

/** Elevation / shadow scale. */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.08)',
  overlay: '0 10px 38px -10px rgb(0 0 0 / 0.35)',
} as const;

/** Named elevation levels (0–5) mapped to the shadow scale. */
export const elevation = {
  0: 'none',
  1: shadows.sm,
  2: shadows.card,
  3: shadows.md,
  4: shadows.lg,
  5: shadows.xl,
} as const;

/** Z-index scale for stacking contexts. */
export const zIndex = {
  hide: '-1',
  base: '0',
  docked: '10',
  dropdown: '1000',
  sticky: '1100',
  banner: '1200',
  overlay: '1300',
  modal: '1400',
  popover: '1500',
  drawer: '1600',
  toast: '1700',
  tooltip: '1800',
} as const;

/** Font family stacks. */
export const fontFamily = {
  sans: ['Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
} as const;

/** Type scale (font-size → line-height). */
export const fontSize = {
  xs: ['0.75rem', '1rem'],
  sm: ['0.875rem', '1.25rem'],
  base: ['1rem', '1.5rem'],
  lg: ['1.125rem', '1.75rem'],
  xl: ['1.25rem', '1.75rem'],
  '2xl': ['1.5rem', '2rem'],
  '3xl': ['1.875rem', '2.25rem'],
  '4xl': ['2.25rem', '2.5rem'],
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
} as const;

/** Motion durations. */
export const duration = {
  instant: '75ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

/** Easing curves. */
export const easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
} as const;

/** Aggregate token object — the reusable constants surface. */
export const tokens = {
  colors: SEMANTIC_COLORS,
  colorPairs: COLOR_PAIRS,
  breakpoints,
  spacing,
  radii,
  shadows,
  elevation,
  zIndex,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  duration,
  easing,
} as const;

export type Tokens = typeof tokens;
