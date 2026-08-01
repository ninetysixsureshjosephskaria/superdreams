import { describe, expect, it } from 'vitest';

import { ApiError, normalizeError } from './errors';

describe('normalizeError', () => {
  it('passes through an existing ApiError', () => {
    const original = new ApiError({ code: 'X', message: 'x' });
    expect(normalizeError(original)).toBe(original);
  });

  it('normalizes an unknown value', () => {
    const result = normalizeError('boom');
    expect(result).toBeInstanceOf(ApiError);
    expect(result.code).toBe('UNKNOWN');
  });

  it('normalizes a native Error', () => {
    const result = normalizeError(new Error('kaboom'));
    expect(result.code).toBe('UNKNOWN');
    expect(result.message).toBe('kaboom');
  });
});
