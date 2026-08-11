import { and, eq, isNull } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members } from '@/database/schema';
import { generateReferralCode } from '@/modules/members/domain/referral-code';

import { registerSeed } from './index';

/** Bounded generate-with-retry budget per member (see referral-code.ts). */
const MAX_ATTEMPTS = 8;

/**
 * Detects a Postgres unique-constraint violation (23505) on the referral-code
 * index, flattening the driver's `cause` chain. That is the signal to regenerate
 * and retry; any other error propagates.
 */
function isReferralCodeUniqueViolation(error: unknown, depth = 0): boolean {
  if (depth > 4 || typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as Record<string, unknown>;
  const text = [record.code, record.constraint, record.detail, record.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  if (
    (text.includes('23505') || text.includes('unique')) &&
    (text.includes('referral_code') || text.includes('members_referral_code_uq'))
  ) {
    return true;
  }
  return isReferralCodeUniqueViolation(record.cause, depth + 1);
}

/** Assigns one collision-safe referral code to a single member (pre-check + retry). */
async function assignReferralCode(db: Database, memberId: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateReferralCode();
    const existing = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.referralCode, code))
      .limit(1);
    if (existing.length > 0) {
      continue;
    }
    try {
      await db
        .update(members)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(eq(members.id, memberId));
      return;
    } catch (error) {
      const lastAttempt = attempt === MAX_ATTEMPTS - 1;
      if (!isReferralCodeUniqueViolation(error) || lastAttempt) {
        throw error;
      }
    }
  }
  throw new Error(`Failed to allocate a unique referral code for member ${memberId}.`);
}

/**
 * Backfills self-service referral codes for existing members (Phase 2H).
 * Idempotent and safe in every environment: it only fills rows where
 * `referral_code IS NULL` (and not soft-deleted), so re-running it is a no-op
 * once every member has a code.
 */
async function backfillReferralCodes(db: Database): Promise<void> {
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(isNull(members.referralCode), notDeleted(members.deletedAt)));
  for (const row of rows) {
    await assignReferralCode(db, row.id);
  }
}

registerSeed({
  name: 'member-referral-codes',
  environments: ['development', 'test', 'staging', 'production'],
  run: backfillReferralCodes,
});
