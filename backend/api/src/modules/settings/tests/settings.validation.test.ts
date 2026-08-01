import { describe, expect, it } from 'vitest';

import { SettingsCache } from '../cache';
import { assertValidValue, createFeatureToggleSchema, maintenanceSchema } from '../validators';

describe('assertValidValue', () => {
  it('validates colors', () => {
    expect(assertValidValue('branding.primaryColor', 'COLOR', '#4f46e5')).toBe('#4f46e5');
    expect(() => assertValidValue('branding.primaryColor', 'COLOR', 'blue')).toThrow();
  });

  it('enforces numeric bounds', () => {
    expect(assertValidValue('security.passwordMinLength', 'NUMBER', 12)).toBe(12);
    expect(() => assertValidValue('security.passwordMinLength', 'NUMBER', 2)).toThrow(/at least/i);
    expect(() => assertValidValue('security.passwordMinLength', 'NUMBER', 1000)).toThrow(
      /at most/i,
    );
    expect(assertValidValue('security.passwordMinLength', 'NUMBER', '16')).toBe(16);
  });

  it('enforces SELECT options', () => {
    expect(assertValidValue('branding.theme', 'SELECT', 'dark')).toBe('dark');
    expect(() => assertValidValue('branding.theme', 'SELECT', 'neon')).toThrow(/one of/i);
  });

  it('validates arrays of strings and booleans', () => {
    expect(assertValidValue('api.corsOrigins', 'ARRAY', ['*'])).toEqual(['*']);
    expect(() => assertValidValue('api.corsOrigins', 'ARRAY', [1])).toThrow();
    expect(assertValidValue('x', 'BOOLEAN', true)).toBe(true);
    expect(() => assertValidValue('x', 'BOOLEAN', 'true')).toThrow();
  });
});

describe('settings schemas', () => {
  it('requires cron-free feature toggle creation fields', () => {
    expect(createFeatureToggleSchema.safeParse({ key: 'a.b', name: 'A' }).success).toBe(true);
    expect(createFeatureToggleSchema.safeParse({ key: 'a b', name: 'A' }).success).toBe(false);
  });

  it('requires an enabled flag for maintenance', () => {
    expect(maintenanceSchema.safeParse({ message: 'x' }).success).toBe(false);
    expect(maintenanceSchema.safeParse({ enabled: true }).success).toBe(true);
  });
});

describe('SettingsCache', () => {
  it('loads once and invalidates', async () => {
    const cache = new SettingsCache();
    let loads = 0;
    const loader = async (): Promise<Array<{ key: string; value: unknown }>> => {
      loads += 1;
      return Promise.resolve([{ key: 'a', value: 1 }]);
    };
    await cache.ensureLoaded(loader);
    await cache.ensureLoaded(loader);
    expect(loads).toBe(1);
    expect(cache.get('a')).toBe(1);

    cache.invalidate();
    expect(cache.isLoaded()).toBe(false);
    await cache.ensureLoaded(loader);
    expect(loads).toBe(2);
  });
});
