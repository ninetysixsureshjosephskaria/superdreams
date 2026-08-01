import { describe, expect, it } from 'vitest';

import { changeStatusSchema, createMemberSchema, listMembersQuerySchema } from '../validators';

describe('member validators', () => {
  it('accepts a valid member payload', () => {
    const result = createMemberSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ADA@Members.test',
      phone: '+15551230000',
      profile: { bio: 'Pioneer' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ada@members.test'); // normalized
    }
  });

  it('rejects an invalid email and empty names', () => {
    expect(
      createMemberSchema.safeParse({ firstName: 'A', lastName: 'B', email: 'nope' }).success,
    ).toBe(false);
    expect(
      createMemberSchema.safeParse({ firstName: '', lastName: 'B', email: 'a@b.co' }).success,
    ).toBe(false);
  });

  it('applies list query defaults and coerces types', () => {
    const query = listMembersQuerySchema.parse({});
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(25);
    expect(query.sortBy).toBe('createdAt');
    expect(query.order).toBe('desc');

    const coerced = listMembersQuerySchema.parse({ page: '3', pageSize: '10' });
    expect(coerced.page).toBe(3);
    expect(coerced.pageSize).toBe(10);
  });

  it('validates the status enum', () => {
    expect(changeStatusSchema.safeParse({ status: 'SUSPENDED' }).success).toBe(true);
    expect(changeStatusSchema.safeParse({ status: 'BOGUS' }).success).toBe(false);
  });
});
