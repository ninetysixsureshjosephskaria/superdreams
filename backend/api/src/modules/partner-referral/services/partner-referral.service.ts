import { randomUUID } from 'node:crypto';

import type { Executor } from '@/database/types';

import type { CreateReferralEarningInput, ReferralActor, ResolvedPartner } from '../dto';
import type {
  PartnerReferralAuditRepository,
  PartnerReferralEarningRepository,
  PartnerReferralEarningRow,
  ReferralMemberLookupRepository,
} from '../repositories';
import type {
  PartnerRoleCheckerPort,
  ReferralRateProviderPort,
  RewardCreditPort,
  RewardReversePort,
} from './ports';

const ACTIVE = 'ACTIVE';

function reference(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 12).toUpperCase()}`;
}

/** The partner's referral points = floor(sourcePoints × rateBps / 10000) (P3.7). */
export function computePartnerPoints(sourcePoints: number, rateBps: number): number {
  return Math.floor((sourcePoints * rateBps) / 10000);
}

/**
 * Partner Referral earning engine (P3). When a member earns qualifying points, the
 * member's DIRECT active Partner earns a configurable share of them — credited into
 * the existing rewards ledger, inside the SAME transaction that finalizes the
 * member's earning, at most once per source transaction, and reversible.
 *
 * Points-only: this module never touches money/wallet/commission. Single level: it
 * resolves only the immediate `partnerId`, never any upline beyond it.
 */
export class PartnerReferralService {
  public constructor(
    private readonly earnings: PartnerReferralEarningRepository,
    private readonly members: ReferralMemberLookupRepository,
    private readonly audit: PartnerReferralAuditRepository,
    private readonly rewardCredit: RewardCreditPort,
    private readonly rewardReverse: RewardReversePort,
    private readonly roleChecker: PartnerRoleCheckerPort,
    private readonly rateProvider: ReferralRateProviderPort,
  ) {}

  /**
   * Resolves the earner's DIRECT active Partner and the rate to apply — BEFORE the
   * earning transaction (every read here runs on the base connection; the earning
   * transaction does writes only, avoiding the single-connection deadlock). Returns
   * `null` when no partner referral applies: no `partnerId`; the partner is not
   * ACTIVE, is soft-deleted, or has no login; the partner does not hold the
   * `partner` role; or (defensively) a self-reference. Never walks past the
   * immediate partner (single level; no multi-level propagation).
   */
  public async resolveEarner(earnerMemberId: string): Promise<ResolvedPartner | null> {
    const relation = await this.members.findEarnerWithPartner(earnerMemberId);
    if (!relation || !relation.partnerMemberId || !relation.partnerUserId) {
      return null;
    }
    if (relation.partnerStatus !== ACTIVE || relation.partnerDeletedAt !== null) {
      return null;
    }
    if (relation.partnerMemberId === earnerMemberId) {
      return null;
    }
    if (!(await this.roleChecker.isPartner(relation.partnerUserId))) {
      return null;
    }
    const rateBps = await this.rateProvider.getRateBps();
    return {
      partnerMemberId: relation.partnerMemberId,
      partnerUserId: relation.partnerUserId,
      rateBps,
    };
  }

  /**
   * Credits the resolved partner their referral points **inside the caller's
   * transaction** (the same tx that created `sourceTransactionId`) and records the
   * durable linkage + audit. No-op (returns `null`) when there is no resolved
   * partner or the floored points are 0 (zero-suppression, P3.7). At most one
   * referral per source transaction is guaranteed by the table's
   * `UNIQUE(source_transaction_id)` — a duplicate insert raises and aborts the tx.
   */
  public async creditWithin(
    tx: Executor,
    params: {
      resolved: ResolvedPartner | null;
      sourceTransactionId: string;
      earnerMemberId: string;
      sourcePoints: number;
      actor: ReferralActor;
    },
  ): Promise<PartnerReferralEarningRow | null> {
    const { resolved } = params;
    if (!resolved) {
      return null;
    }
    const partnerPoints = computePartnerPoints(params.sourcePoints, resolved.rateBps);
    if (partnerPoints <= 0) {
      return null;
    }

    const award = await this.rewardCredit.awardPointsWithin(
      tx,
      resolved.partnerMemberId,
      partnerPoints,
      {
        reference: reference('PREF'),
        description: `Partner referral (${resolved.rateBps} bps) from member ${params.earnerMemberId}`,
        actor: params.actor,
      },
    );

    const input: CreateReferralEarningInput = {
      sourceTransactionId: params.sourceTransactionId,
      earnerMemberId: params.earnerMemberId,
      partnerMemberId: resolved.partnerMemberId,
      partnerTransactionId: award.transactionId,
      rateBps: resolved.rateBps,
      sourcePoints: params.sourcePoints,
      partnerPoints,
      createdBy: params.actor.userId,
    };
    const row = await this.earnings.insert(input, tx);

    await this.audit.write(
      {
        entityType: 'partner_referral_earning',
        entityId: row.id,
        action: 'CREATE',
        newValue: {
          sourceTransactionId: row.sourceTransactionId,
          earnerMemberId: row.earnerMemberId,
          partnerMemberId: row.partnerMemberId,
          partnerTransactionId: row.partnerTransactionId,
          rateBps: row.rateBps,
          sourcePoints: row.sourcePoints,
          partnerPoints: row.partnerPoints,
        },
        userId: params.actor.userId,
        ipAddress: params.actor.ipAddress,
        userAgent: params.actor.userAgent,
        correlationId: params.actor.correlationId,
      },
      tx,
    );

    return row;
  }

  /**
   * Claws back the partner referral derived from a reversed source EARN, **inside
   * the source-reversal transaction** — this is the Rewards `PartnerReferralReversalPort`
   * implementation. No-op when the source produced no referral, or it was already
   * reversed. When the partner lacks the points, `reverseWithin` throws — rolling
   * back the WHOLE source reversal (B3: the non-negative invariant is preserved and
   * no debt is created).
   */
  public async onSourceReversed(
    tx: Executor,
    sourceTransactionId: string,
    actor: ReferralActor,
  ): Promise<void> {
    const link = await this.earnings.findBySourceTransactionId(sourceTransactionId, tx);
    if (!link || link.reversedAt !== null) {
      return;
    }
    const reversal = await this.rewardReverse.reverseWithin(
      tx,
      link.partnerMemberId,
      link.partnerTransactionId,
      actor,
    );
    await this.earnings.markReversed(link.id, reversal.transactionId, tx);
    await this.audit.write(
      {
        entityType: 'partner_referral_earning',
        entityId: link.id,
        action: 'UPDATE',
        oldValue: { reversedAt: null },
        newValue: { reversed: true, reversalTransactionId: reversal.transactionId },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        correlationId: actor.correlationId,
      },
      tx,
    );
  }
}
