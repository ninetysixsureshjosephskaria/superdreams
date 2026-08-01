import { describe, expect, it } from 'vitest';

import { emailSchema, paginationSchema, passwordSchema } from './schemas';

describe('validation schemas', () => {
  it('accepts and normalizes a valid email', () => {
    expect(emailSchema.parse('  User@Example.COM ')).toBe('user@example.com');
  });

  it('rejects a weak password', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('StrongPass1').success).toBe(true);
  });

  it('applies pagination defaults', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 25 });
  });
});
