import { randomBytes } from 'node:crypto';

/**
 * Self-service referral code generation (Phase 2H). A referral code is a
 * permanent, reusable, opaque, member-owned token that backs the
 * `/signup?ref=<code>` link. This module is pure (no I/O): collision safety is
 * layered on top by the service (generate-with-retry) and the DB unique index
 * `members_referral_code_uq` (the final backstop) — never on randomness alone.
 */

/**
 * Unambiguous uppercase alphanumeric alphabet. Excludes visually confusable
 * characters (0/O, 1/I, and the letters they collide with are dropped where
 * useful) so a code is safe to read aloud / re-type. Length is a power of two
 * (32) so `byte % length` is unbiased.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Code length — 12 chars over a 32-symbol alphabet ≈ 60 bits of entropy. */
const CODE_LENGTH = 12;

/**
 * Generates a single opaque, URL-safe referral code. This is a pure function; it
 * does NOT guarantee global uniqueness on its own — the caller must check the
 * repository (generate-with-retry) and rely on the DB unique constraint.
 */
export function generateReferralCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    // ALPHABET.length is 32 (a power of two), so the modulo is bias-free.
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}
