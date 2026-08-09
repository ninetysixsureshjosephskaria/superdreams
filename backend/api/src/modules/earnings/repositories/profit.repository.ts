import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import {
  profitDistributionCredits,
  profitDistributions,
  profitScheduleDays,
  profitSchedules,
  walletBalances,
  wallets,
} from '@/database/schema';
import type { Executor } from '@/database/types';

export type ProfitScheduleRow = typeof profitSchedules.$inferSelect;
export type ProfitScheduleDayRow = typeof profitScheduleDays.$inferSelect;
export type ProfitDistributionRow = typeof profitDistributions.$inferSelect;

export class ProfitScheduleRepository {
  public constructor(private readonly db: Database) {}

  public async findByMonth(month: string): Promise<ProfitScheduleRow | null> {
    const rows = await this.db
      .select()
      .from(profitSchedules)
      .where(and(eq(profitSchedules.month, month), notDeleted(profitSchedules.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findById(id: string): Promise<ProfitScheduleRow | null> {
    const rows = await this.db
      .select()
      .from(profitSchedules)
      .where(and(eq(profitSchedules.id, id), notDeleted(profitSchedules.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async create(
    values: typeof profitSchedules.$inferInsert,
    executor: Executor = this.db,
  ): Promise<ProfitScheduleRow> {
    const rows = await executor.insert(profitSchedules).values(values).returning();
    if (!rows[0]) {
      throw new Error('Insert did not return a profit schedule row.');
    }
    return rows[0];
  }

  public async update(
    id: string,
    values: Partial<typeof profitSchedules.$inferInsert>,
    executor: Executor = this.db,
  ): Promise<ProfitScheduleRow | null> {
    const rows = await executor
      .update(profitSchedules)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(profitSchedules.id, id))
      .returning();
    return rows[0] ?? null;
  }
}

export class ProfitScheduleDayRepository {
  public constructor(private readonly db: Database) {}

  public async findBySchedule(scheduleId: string): Promise<ProfitScheduleDayRow[]> {
    return this.db
      .select()
      .from(profitScheduleDays)
      .where(eq(profitScheduleDays.scheduleId, scheduleId))
      .orderBy(asc(profitScheduleDays.day));
  }

  /** The day row of the PUBLISHED schedule covering `day` (YYYY-MM-DD), if any. */
  public async findPublishedDay(day: string): Promise<ProfitScheduleDayRow | null> {
    const rows = await this.db
      .select({
        id: profitScheduleDays.id,
        scheduleId: profitScheduleDays.scheduleId,
        day: profitScheduleDays.day,
        memberBps: profitScheduleDays.memberBps,
        partnerBps: profitScheduleDays.partnerBps,
        distributeAt: profitScheduleDays.distributeAt,
        off: profitScheduleDays.off,
        createdAt: profitScheduleDays.createdAt,
        updatedAt: profitScheduleDays.updatedAt,
        deletedAt: profitScheduleDays.deletedAt,
        createdBy: profitScheduleDays.createdBy,
        updatedBy: profitScheduleDays.updatedBy,
        deletedBy: profitScheduleDays.deletedBy,
        version: profitScheduleDays.version,
      })
      .from(profitScheduleDays)
      .innerJoin(profitSchedules, eq(profitScheduleDays.scheduleId, profitSchedules.id))
      .where(and(eq(profitScheduleDays.day, day), eq(profitSchedules.status, 'PUBLISHED')))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Replaces the full set of day rows for a schedule (draft editing). */
  public async replaceForSchedule(
    scheduleId: string,
    days: Array<{
      day: string;
      memberBps: number;
      partnerBps: number;
      distributeAt: string | null;
      off: boolean;
    }>,
    actor: string | null,
    executor: Executor,
  ): Promise<void> {
    await executor.delete(profitScheduleDays).where(eq(profitScheduleDays.scheduleId, scheduleId));
    if (days.length > 0) {
      await executor.insert(profitScheduleDays).values(
        days.map((d) => ({
          scheduleId,
          day: d.day,
          memberBps: d.memberBps,
          partnerBps: d.partnerBps,
          distributeAt: d.distributeAt,
          off: d.off,
          createdBy: actor,
          updatedBy: actor,
        })),
      );
    }
  }
}

export class ProfitDistributionRepository {
  public constructor(private readonly db: Database) {}

  public async findByDay(day: string): Promise<ProfitDistributionRow | null> {
    const rows = await this.db
      .select()
      .from(profitDistributions)
      .where(eq(profitDistributions.day, day))
      .limit(1);
    return rows[0] ?? null;
  }

  public async lockByDay(day: string, executor: Executor): Promise<ProfitDistributionRow | null> {
    const rows = await executor
      .select()
      .from(profitDistributions)
      .where(eq(profitDistributions.day, day))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  public async create(
    values: typeof profitDistributions.$inferInsert,
    executor: Executor,
  ): Promise<ProfitDistributionRow> {
    const rows = await executor.insert(profitDistributions).values(values).returning();
    if (!rows[0]) {
      throw new Error('Insert did not return a profit distribution row.');
    }
    return rows[0];
  }

  public async addTotals(
    id: string,
    delta: {
      memberAmountCents: number;
      partnerAmountCents: number;
      membersCredited: number;
      partnersCredited: number;
    },
    executor: Executor,
  ): Promise<void> {
    const current = (
      await executor
        .select()
        .from(profitDistributions)
        .where(eq(profitDistributions.id, id))
        .limit(1)
    )[0];
    if (!current) {
      return;
    }
    await executor
      .update(profitDistributions)
      .set({
        memberAmountCents: current.memberAmountCents + delta.memberAmountCents,
        partnerAmountCents: current.partnerAmountCents + delta.partnerAmountCents,
        membersCredited: current.membersCredited + delta.membersCredited,
        partnersCredited: current.partnersCredited + delta.partnersCredited,
        updatedAt: new Date(),
      })
      .where(eq(profitDistributions.id, id));
  }

  public async listHistory(fromDay: string, toDay: string): Promise<ProfitDistributionRow[]> {
    return this.db
      .select()
      .from(profitDistributions)
      .where(and(gte(profitDistributions.day, fromDay), lte(profitDistributions.day, toDay)))
      .orderBy(desc(profitDistributions.day));
  }
}

export class ProfitDistributionCreditRepository {
  // All methods run inside a caller-provided transaction executor.

  public async exists(
    distributionId: string,
    memberId: string,
    executor: Executor,
  ): Promise<boolean> {
    const rows = await executor
      .select({ id: profitDistributionCredits.id })
      .from(profitDistributionCredits)
      .where(
        and(
          eq(profitDistributionCredits.distributionId, distributionId),
          eq(profitDistributionCredits.memberId, memberId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  public async create(
    values: typeof profitDistributionCredits.$inferInsert,
    executor: Executor,
  ): Promise<void> {
    await executor.insert(profitDistributionCredits).values(values);
  }
}

export interface FinancialAccount {
  memberId: string;
  walletId: string;
  availableMinor: number;
}

/** Enumerates ACTIVE FINANCIAL wallets + balances for network-wide distribution. */
export class FinancialAccountRepository {
  public constructor(private readonly db: Database) {}

  public async listActive(): Promise<FinancialAccount[]> {
    const rows = await this.db
      .select({
        memberId: wallets.memberId,
        walletId: wallets.id,
        availableMinor: walletBalances.availableMinor,
      })
      .from(wallets)
      .innerJoin(walletBalances, eq(walletBalances.walletId, wallets.id))
      .where(
        and(
          eq(wallets.kind, 'FINANCIAL'),
          eq(wallets.status, 'ACTIVE'),
          notDeleted(wallets.deletedAt),
        ),
      )
      .orderBy(asc(wallets.memberId));
    return rows;
  }
}
