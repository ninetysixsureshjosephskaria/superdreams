import type { Database } from '@/database';
import { withTransaction } from '@/database/helpers/transaction';
import type { PartnerReferralService } from '@/modules/partner-referral';
import type { RewardService } from '@/modules/rewards';

import type { RewardBridge } from './campaign.service';

/**
 * Campaign reward bridge (P3/A1) that issues the member's campaign reward **and**
 * the member's direct active Partner's referral points in ONE transaction, then
 * reproduces `allocate()`'s post-commit history/event.
 *
 * Member-facing behaviour is preserved exactly versus the previous
 * `rewards.allocate(...)` bridge: the same ledger EARN (points, program, and the
 * program's resolved expiry), the same `reward.allocated` history entry, and the
 * same `RewardAllocated` event. The partner credit is additive and atomic; when no
 * eligible partner exists (or the floored share is 0) the member's reward is issued
 * exactly as before. `allocate()` itself is never touched — this uses the additive
 * `allocateWithin` seam.
 */
export function createReferralRewardBridge(
  db: Database,
  rewards: RewardService,
  partnerReferral: PartnerReferralService,
): RewardBridge {
  return {
    async allocate(memberId, params, actor) {
      // Pre-transaction reads (kept off the transaction's single connection): the
      // eligible partner + the program's configured expiry that allocate() applies.
      const resolved = await partnerReferral.resolveEarner(memberId);
      const expiresAt = await rewards.resolveProgramExpiry(params.programId);

      const transactionId = await withTransaction(db, async (tx) => {
        const applied = await rewards.allocateWithin(
          tx,
          memberId,
          {
            points: params.points,
            programId: params.programId,
            description: params.description,
            expiresAt,
          },
          actor,
        );
        // Same transaction as the member EARN → member + partner commit together.
        await partnerReferral.creditWithin(tx, {
          resolved,
          sourceTransactionId: applied.transactionId,
          earnerMemberId: memberId,
          sourcePoints: params.points,
          actor,
        });
        return applied.transactionId;
      });

      // Post-commit: reproduce allocate()'s reward-history entry + RewardAllocated event.
      await rewards.emitAllocated(memberId, transactionId, params.points, params.programId, actor);
      return transactionId;
    },
  };
}
