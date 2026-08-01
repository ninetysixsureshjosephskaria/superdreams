import { describe, expect, it } from 'vitest';

import { preset } from './preset';

describe('theme preset', () => {
  it('enables class-based dark mode', () => {
    expect(preset.darkMode).toBe('class');
  });

  it('exposes semantic colors mapped to CSS variables', () => {
    const { colors } = preset.theme.extend;
    expect(colors?.background).toBe('hsl(var(--background))');
    expect(colors?.primary).toMatchObject({ DEFAULT: 'hsl(var(--primary))' });
  });

  it('defines the radius scale from the --radius token', () => {
    expect(preset.theme.extend.borderRadius?.lg).toBe('var(--radius)');
  });
});
