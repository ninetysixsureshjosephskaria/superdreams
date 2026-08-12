import type { Executor } from '@/database/types';

/**
 * The narrow port the redemption-request service depends on, satisfied in
 * composition by the Rewards module's additive `redeemWithin(tx,…)` seam. Keeping
 * it as an interface avoids a redemption-requests→rewards runtime coupling and
 * lets tests stub the debit directly.
 *
 * `redeemWithin` performs the points DEBIT **and** records a completed
 * `reward_redemptions` row **through the caller's transaction**, reusing the
 * existing ledger primitives. It NEVER touches the wallet/money bridge
 * (points-only). It throws a business-rule error when the balance is
 * insufficient, which must roll the approval transaction back (leaving the
 * request PENDING — never a partial debit, never an auto-reject).
 */
export interface RewardRedeemPort {
  redeemWithin(
    tx: Executor,
    memberId: string,
    points: number,
    options: {
      reference: string;
      note?: string | null;
      actor: {
        userId: string;
        ipAddress: string | null;
        userAgent: string | null;
        correlationId: string | null;
      };
    },
  ): Promise<{ redemptionId: string; transactionId: string; balanceAfter: number }>;
}
