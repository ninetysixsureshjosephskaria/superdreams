import { describe, expect, it } from 'vitest';

import { SEMANTIC_COLORS, breakpoints, radii, tokens, zIndex } from './tokens';

describe('design tokens', () => {
  it('includes the info semantic color', () => {
    expect(SEMANTIC_COLORS).toContain('info');
  });

  it('layers z-index so overlays sit below toasts and tooltips', () => {
    expect(Number(zIndex.modal)).toBeLessThan(Number(zIndex.toast));
    expect(Number(zIndex.toast)).toBeLessThan(Number(zIndex.tooltip));
  });

  it('exposes mobile-first breakpoints', () => {
    expect(breakpoints.sm).toBe('640px');
    expect(breakpoints['2xl']).toBe('1536px');
  });

  it('aggregates every scale under `tokens`', () => {
    expect(radii.full).toBe('9999px');
    expect(tokens.radii.full).toBe('9999px');
    expect(tokens.duration.normal).toBe('200ms');
  });
});
