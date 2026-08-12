import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { partnerReferralEarnings } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { CreateReferralEarningInput } from '../dto';

export type PartnerReferralEarningRow = typeof partnerReferralEarnings.$inferSelect;

/**
 * Read/write access to the append-once `partner_referral_earnings` table — the
 * durable link between a member's source EARN and the partner's referral EARN.
 * Every method accepts an `executor` so the write joins the caller's transaction
 * (the same transaction that finalizes the member earning / the source reversal).
 */
export class PartnerReferralEarningRepository {
  public constructor(private readonly db: Database) {}

  /** Records a referral earning. `UNIQUE(source_transaction_id)` enforces P3.10. */
  public async insert(
    input: CreateReferralEarningInput,
    executor: Executor,
  ): Promise<PartnerReferralEarningRow> {
    const rows = await executor
      .insert(partnerReferralEarnings)
      .values({
        sourceTransactionId: input.sourceTransactionId,
        earnerMemberId: input.earnerMemberId,
        partnerMemberId: input.partnerMemberId,
        partnerTransactionId: input.partnerTransactionId,
        rateBps: input.rateBps,
        sourcePoints: input.sourcePoints,
        partnerPoints: input.partnerPoints,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Partner referral earning insert did not return a row.');
    }
    return created;
  }

  /** The referral earning derived from a given source transaction, if any. */
  public async findBySourceTransactionId(
    sourceTransactionId: string,
    executor: Executor = this.db,
  ): Promise<PartnerReferralEarningRow | null> {
    const rows = await executor
      .select()
      .from(partnerReferralEarnings)
      .where(eq(partnerReferralEarnings.sourceTransactionId, sourceTransactionId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Flags a referral earning as clawed back, linking the partner's REVERSAL entry. */
  public async markReversed(
    id: string,
    reversalTransactionId: string,
    executor: Executor,
  ): Promise<void> {
    await executor
      .update(partnerReferralEarnings)
      .set({ reversedAt: new Date(), reversalTransactionId, updatedAt: new Date() })
      .where(eq(partnerReferralEarnings.id, id));
  }
}
