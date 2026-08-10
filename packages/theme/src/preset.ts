import type { Config } from 'tailwindcss';

import {
  breakpoints,
  duration,
  easing,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  radii,
  shadows,
  zIndex,
} from './tokens';

/** Builds a `{ DEFAULT, foreground }` pair backed by CSS variables. */
function pair(name: string): { DEFAULT: string; foreground: string } {
  return {
    DEFAULT: `hsl(var(--${name}))`,
    foreground: `hsl(var(--${name}-foreground))`,
  };
}

/**
 * Super Dreams shared Tailwind preset.
 *
 * Semantic colors resolve to the CSS variables defined in `styles.css` (light +
 * dark), so components stay theme-agnostic. Non-color scales come from the typed
 * `tokens` module, keeping the CSS utilities and JS constants in lockstep.
 * Consuming apps add this preset and provide their own `content` globs (which
 * must include `packages/ui`).
 */
export const preset = {
  darkMode: 'class',
  content: [],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
        '2xl': breakpoints['2xl'],
      },
    },
    screens: { ...breakpoints },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: pair('primary'),
        secondary: pair('secondary'),
        muted: pair('muted'),
        accent: pair('accent'),
        destructive: pair('destructive'),
        success: pair('success'),
        warning: pair('warning'),
        info: pair('info'),
        card: pair('card'),
        popover: pair('popover'),
      },
      fontFamily: {
        sans: [...fontFamily.sans],
        mono: [...fontFamily.mono],
      },
      fontSize: {
        xs: [fontSize.xs[0], { lineHeight: fontSize.xs[1] }],
        sm: [fontSize.sm[0], { lineHeight: fontSize.sm[1] }],
        base: [fontSize.base[0], { lineHeight: fontSize.base[1] }],
        lg: [fontSize.lg[0], { lineHeight: fontSize.lg[1] }],
        xl: [fontSize.xl[0], { lineHeight: fontSize.xl[1] }],
        '2xl': [fontSize['2xl'][0], { lineHeight: fontSize['2xl'][1] }],
        '3xl': [fontSize['3xl'][0], { lineHeight: fontSize['3xl'][1] }],
        '4xl': [fontSize['4xl'][0], { lineHeight: fontSize['4xl'][1] }],
        '5xl': [fontSize['5xl'][0], { lineHeight: fontSize['5xl'][1] }],
      },
      fontWeight: { ...fontWeight },
      lineHeight: { ...lineHeight },
      borderRadius: {
        none: radii.none,
        sm: radii.sm,
        md: radii.md,
        lg: radii.lg,
        xl: radii.xl,
        '2xl': radii['2xl'],
        // App-overridable component radii (CSS vars; defaults in styles.css).
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        surface: 'var(--radius-surface)',
        menu: 'var(--radius-menu)',
        dialog: 'var(--radius-surface)',
        input: 'var(--radius-control)',
        button: 'var(--radius-control)',
        pill: radii.pill,
        full: radii.full,
      },
      boxShadow: {
        sm: shadows.sm,
        DEFAULT: shadows.card,
        md: shadows.md,
        lg: shadows.lg,
        xl: shadows.xl,
        // App-overridable component shadows (CSS vars; defaults in styles.css).
        card: 'var(--shadow-card)',
        input: 'var(--shadow-input)',
        float: shadows.float,
        overlay: shadows.overlay,
      },
      zIndex: { ...zIndex },
      transitionDuration: {
        fast: duration.fast,
        DEFAULT: duration.normal,
        normal: duration.normal,
        slow: duration.slow,
      },
      transitionTimingFunction: {
        standard: easing.standard,
        emphasized: easing.emphasized,
        decelerate: easing.decelerate,
        accelerate: easing.accelerate,
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'fade-in': `fade-in ${duration.fast} ${easing.standard}`,
        'fade-out': `fade-out ${duration.fast} ${easing.standard}`,
        'scale-in': `scale-in ${duration.fast} ${easing.emphasized}`,
        'slide-in-right': `slide-in-right ${duration.normal} ${easing.emphasized}`,
        'slide-in-left': `slide-in-left ${duration.normal} ${easing.emphasized}`,
        'accordion-down': `accordion-down ${duration.normal} ${easing.standard}`,
        'accordion-up': `accordion-up ${duration.normal} ${easing.standard}`,
      },
    },
  },
  plugins: [],
} satisfies Config;

export default preset;
