import { eq, inArray, sql, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { walletBalances } from '@/database/schema';
import type { Executor } from '@/database/types';

export type WalletBalanceRow = InferSelectModel<typeof walletBalances>;

export interface BalanceValues {
  availableMinor: number;
  heldMinor: number;
}

/** Persistence for the 1:1 wallet balance projection. */
export class WalletBalanceRepository {
  public constructor(private readonly db: Database) {}

  public async findByWalletId(
    walletId: string,
    executor: Executor = this.db,
  ): Promise<WalletBalanceRow | null> {
    const rows = await executor
      .select()
      .from(walletBalances)
      .where(eq(walletBalances.walletId, walletId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Fetches balances for many wallets in one query (avoids N+1 in listings). */
  public async findByWalletIds(walletIds: string[]): Promise<WalletBalanceRow[]> {
    if (walletIds.length === 0) {
      return [];
    }
    return this.db.select().from(walletBalances).where(inArray(walletBalances.walletId, walletIds));
  }

  /** Locks the balance row FOR UPDATE within a transaction. */
  public async lockByWalletId(
    walletId: string,
    executor: Executor,
  ): Promise<WalletBalanceRow | null> {
    const rows = await executor
      .select()
      .from(walletBalances)
      .where(eq(walletBalances.walletId, walletId))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  public async create(
    values: { walletId: string; currencyCode: string; createdBy: string | null },
    executor: Executor = this.db,
  ): Promise<WalletBalanceRow> {
    const rows = await executor
      .insert(walletBalances)
      .values({
        walletId: values.walletId,
        currencyCode: values.currencyCode,
        availableMinor: 0,
        heldMinor: 0,
        totalMinor: 0,
        createdBy: values.createdBy,
        updatedBy: values.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Balance insert did not return a row.');
    }
    return created;
  }

  /** Writes new balances, bumping version/updated_at for optimistic concurrency. */
  public async setBalances(
    walletId: string,
    values: BalanceValues,
    updatedBy: string | null,
    executor: Executor,
  ): Promise<WalletBalanceRow> {
    const rows = await executor
      .update(walletBalances)
      .set({
        availableMinor: values.availableMinor,
        heldMinor: values.heldMinor,
        totalMinor: values.availableMinor + values.heldMinor,
        updatedBy,
        updatedAt: new Date(),
        version: sql`${walletBalances.version} + 1`,
      })
      .where(eq(walletBalances.walletId, walletId))
      .returning();
    const updated = rows[0];
    if (!updated) {
      throw new Error('Balance update did not affect any row.');
    }
    return updated;
  }
}
