import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import {
  auditLogs,
  commissionConfig,
  commissionEarnings,
  commissionTargets,
  commissionTiers,
  financialRequests,
  members,
} from '@/database/schema';
import type { Executor } from '@/database/types';

export type CommissionConfigRow = typeof commissionConfig.$inferSelect;
export type CommissionTargetRow = typeof commissionTargets.$inferSelect;
export type CommissionTierRow = typeof commissionTiers.$inferSelect;
export type CommissionEarningRow = typeof commissionEarnings.$inferSelect;

/** Singleton commission config (referral rate). */
export class CommissionConfigRepository {
  public constructor(private readonly db: Database) {}

  public async getOrCreate(createdBy: string | null): Promise<CommissionConfigRow> {
    const existing = await this.db
      .select()
      .from(commissionConfig)
      .where(eq(commissionConfig.singleton, 'SINGLETON'))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }
    try {
      const rows = await this.db
        .insert(commissionConfig)
        .values({ singleton: 'SINGLETON', createdBy, updatedBy: createdBy })
        .returning();
      if (rows[0]) {
        return rows[0];
      }
    } catch {
      // Concurrent insert — fall through to re-read.
    }
    const row = (
      await this.db
        .select()
        .from(commissionConfig)
        .where(eq(commissionConfig.singleton, 'SINGLETON'))
        .limit(1)
    )[0];
    if (!row) {
      throw new Error('Failed to materialise commission config.');
    }
    return row;
  }

  public async updateReferralRate(rateBps: number, updatedBy: string | null): Promise<void> {
    await this.db
      .update(commissionConfig)
      .set({ referralRateBps: rateBps, updatedBy, updatedAt: new Date() })
      .where(eq(commissionConfig.singleton, 'SINGLETON'));
  }
}

/** Commission tiers (default set + per-target sets). */
export class CommissionTierRepository {
  public constructor(private readonly db: Database) {}

  public async findDefault(): Promise<CommissionTierRow[]> {
    return this.db
      .select()
      .from(commissionTiers)
      .where(and(isNull(commissionTiers.targetId), notDeleted(commissionTiers.deletedAt)))
      .orderBy(asc(commissionTiers.fromUnits));
  }

  public async findByTarget(targetId: string): Promise<CommissionTierRow[]> {
    return this.db
      .select()
      .from(commissionTiers)
      .where(and(eq(commissionTiers.targetId, targetId), notDeleted(commissionTiers.deletedAt)))
      .orderBy(asc(commissionTiers.fromUnits));
  }

  public async replaceDefault(
    tiers: Array<{ fromUnits: number; toUnits: number | null; rateBps: number }>,
    actor: string | null,
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.delete(commissionTiers).where(isNull(commissionTiers.targetId));
    if (tiers.length > 0) {
      await executor.insert(commissionTiers).values(
        tiers.map((t) => ({
          targetId: null,
          fromUnits: t.fromUnits,
          toUnits: t.toUnits,
          rateBps: t.rateBps,
          createdBy: actor,
          updatedBy: actor,
        })),
      );
    }
  }

  public async createForTarget(
    targetId: string,
    tiers: Array<{ fromUnits: number; toUnits: number | null; rateBps: number }>,
    actor: string | null,
    executor: Executor = this.db,
  ): Promise<void> {
    if (tiers.length === 0) {
      return;
    }
    await executor.insert(commissionTiers).values(
      tiers.map((t) => ({
        targetId,
        fromUnits: t.fromUnits,
        toUnits: t.toUnits,
        rateBps: t.rateBps,
        createdBy: actor,
        updatedBy: actor,
      })),
    );
  }
}

/** Date-ranged commission targets. */
export class CommissionTargetRepository {
  public constructor(private readonly db: Database) {}

  public async list(): Promise<CommissionTargetRow[]> {
    return this.db
      .select()
      .from(commissionTargets)
      .where(notDeleted(commissionTargets.deletedAt))
      .orderBy(asc(commissionTargets.startDate));
  }

  public async findActive(dateStr: string): Promise<CommissionTargetRow | null> {
    const rows = await this.db
      .select()
      .from(commissionTargets)
      .where(
        and(
          lte(commissionTargets.startDate, dateStr),
          gte(commissionTargets.endDate, dateStr),
          notDeleted(commissionTargets.deletedAt),
        ),
      )
      .orderBy(asc(commissionTargets.startDate))
      .limit(1);
    return rows[0] ?? null;
  }

  public async create(
    values: { startDate: string; endDate: string; createdBy: string | null },
    executor: Executor = this.db,
  ): Promise<CommissionTargetRow> {
    const rows = await executor
      .insert(commissionTargets)
      .values({ ...values, updatedBy: values.createdBy })
      .returning();
    if (!rows[0]) {
      throw new Error('Insert did not return a target row.');
    }
    return rows[0];
  }

  public async findById(id: string): Promise<CommissionTargetRow | null> {
    const rows = await this.db
      .select()
      .from(commissionTargets)
      .where(and(eq(commissionTargets.id, id), notDeleted(commissionTargets.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async softDelete(id: string, deletedBy: string | null): Promise<void> {
    await this.db
      .update(commissionTargets)
      .set({ deletedAt: new Date(), deletedBy })
      .where(eq(commissionTargets.id, id));
  }
}

/** Idempotent commission/referral earnings ledger. */
export class CommissionEarningRepository {
  public constructor(private readonly db: Database) {}

  public async findByDedupe(dedupeKey: string): Promise<CommissionEarningRow | null> {
    const rows = await this.db
      .select()
      .from(commissionEarnings)
      .where(eq(commissionEarnings.dedupeKey, dedupeKey))
      .limit(1);
    return rows[0] ?? null;
  }

  public async create(
    values: typeof commissionEarnings.$inferInsert,
    executor: Executor,
  ): Promise<CommissionEarningRow> {
    const rows = await executor.insert(commissionEarnings).values(values).returning();
    if (!rows[0]) {
      throw new Error('Insert did not return an earning row.');
    }
    return rows[0];
  }

  public async listByBeneficiary(memberId: string): Promise<CommissionEarningRow[]> {
    return this.db
      .select()
      .from(commissionEarnings)
      .where(eq(commissionEarnings.beneficiaryMemberId, memberId))
      .orderBy(asc(commissionEarnings.creditedAt));
  }
}

export interface ApprovedDeposit {
  id: string;
  memberId: string;
  amountCents: number;
  units: number;
}

/** Reads approved DEPOSIT requests for the earnings engine. */
export class DepositLookupRepository {
  public constructor(private readonly db: Database) {}

  public async getApprovedDeposit(requestId: string): Promise<ApprovedDeposit | null> {
    const rows = await this.db
      .select({
        id: financialRequests.id,
        memberId: financialRequests.memberId,
        amountCents: financialRequests.amountCents,
        units: financialRequests.units,
        status: financialRequests.status,
        type: financialRequests.type,
      })
      .from(financialRequests)
      .where(and(eq(financialRequests.id, requestId), notDeleted(financialRequests.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row || row.status !== 'APPROVED' || row.type !== 'DEPOSIT') {
      return null;
    }
    return { id: row.id, memberId: row.memberId, amountCents: row.amountCents, units: row.units };
  }

  /**
   * Count of a member's APPROVED deposits. "First deposit" (bonus eligibility) is
   * defined as this count being 1 — the natural meaning derived from existing
   * financial-request data, since the project defines no explicit first-deposit flag.
   */
  public async countApprovedDeposits(memberId: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(financialRequests)
      .where(
        and(
          eq(financialRequests.memberId, memberId),
          eq(financialRequests.type, 'DEPOSIT'),
          eq(financialRequests.status, 'APPROVED'),
          notDeleted(financialRequests.deletedAt),
        ),
      );
    return rows[0]?.value ?? 0;
  }
}

export interface MemberRelationship {
  id: string;
  partnerId: string | null;
  referredBy: string | null;
}

/** Reads a member's network relationships for the earnings engine. */
export class MemberRelationshipRepository {
  public constructor(private readonly db: Database) {}

  public async get(memberId: string): Promise<MemberRelationship | null> {
    const rows = await this.db
      .select({ id: members.id, partnerId: members.partnerId, referredBy: members.referredBy })
      .from(members)
      .where(and(eq(members.id, memberId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}

export interface EarningsAuditEntry {
  entityType: string;
  entityId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValue?: unknown;
  newValue?: unknown;
  userId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export {
  ProfitScheduleRepository,
  ProfitScheduleDayRepository,
  ProfitDistributionRepository,
  ProfitDistributionCreditRepository,
  FinancialAccountRepository,
} from './profit.repository';
export type {
  ProfitScheduleRow,
  ProfitScheduleDayRow,
  ProfitDistributionRow,
  FinancialAccount,
} from './profit.repository';
export { BonusCampaignRepository, BonusClaimRepository } from './bonus.repository';
export type { BonusCampaignRow, BonusClaimRow } from './bonus.repository';
export {
  ActivationConfigRepository,
  ActivationGrantRepository,
  ReferralJoinRepository,
} from './activation.repository';
export type { ActivationConfigRow, ActivationGrantRow } from './activation.repository';

/** Writes earnings changes to the shared append-only audit log. */
export class EarningsAuditRepository {
  public async write(entry: EarningsAuditEntry, executor: Executor): Promise<void> {
    await executor.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      userId: entry.userId,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      module: 'earnings',
      correlationId: entry.correlationId ?? null,
    });
  }
}
