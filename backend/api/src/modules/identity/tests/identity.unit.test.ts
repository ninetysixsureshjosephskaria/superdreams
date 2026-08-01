import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../services/password.service';
import { createUserSchema, usernameSchema } from '../validators';

describe('password hashing (Argon2id)', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('Str0ngPass1');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'Str0ngPass1')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });
});

describe('identity validators', () => {
  it('accepts a valid user and rejects weak/invalid input', () => {
    expect(createUserSchema.safeParse({ email: 'a@b.co', password: 'Str0ngPass1' }).success).toBe(
      true,
    );
    expect(createUserSchema.safeParse({ email: 'a@b.co', password: 'weak' }).success).toBe(false);
    expect(
      createUserSchema.safeParse({ email: 'not-an-email', password: 'Str0ngPass1' }).success,
    ).toBe(false);
  });

  it('validates usernames', () => {
    expect(usernameSchema.safeParse('good_user.1').success).toBe(true);
    expect(usernameSchema.safeParse('no').success).toBe(false);
    expect(usernameSchema.safeParse('bad space').success).toBe(false);
  });
});
