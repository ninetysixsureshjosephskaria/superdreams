import { describe, expect, it } from 'vitest';

import { cn } from './cn';
import { capitalize, isDefined, truncate } from './lang';

describe('cn', () => {
  it('joins truthy values and drops falsy ones', () => {
    expect(cn('a', false, 'b', undefined, 0, 'c')).toBe('a b c');
  });
});

describe('lang helpers', () => {
  it('isDefined narrows out null/undefined', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });

  it('capitalize and truncate', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(truncate('hello world', 6)).toBe('hello…');
  });
});
