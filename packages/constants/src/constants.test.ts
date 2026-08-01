import { describe, expect, it } from 'vitest';

import { API, PAGINATION, REGEX, storageKey } from './index';

describe('constants', () => {
  it('builds namespaced storage keys', () => {
    expect(storageKey('bcc', 'theme')).toBe('superdreams.bcc.theme');
  });

  it('exposes the API base path', () => {
    expect(API.basePath).toBe('/api/v1');
  });

  it('bounds pagination and validates patterns', () => {
    expect(PAGINATION.maxPageSize).toBe(100);
    expect(REGEX.email.test('a@b.co')).toBe(true);
    expect(REGEX.email.test('nope')).toBe(false);
  });
});
