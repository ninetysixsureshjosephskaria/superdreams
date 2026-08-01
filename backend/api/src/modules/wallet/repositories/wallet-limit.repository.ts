import { eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { walletLimits } from '@/database/schema';
import type { Executor } from '@/database/types';

export type WalletLimitRow = InferSelectModel<typeof walletLimits>;

export interface CreateLimitInput {
  walletId: string;
  currencyCode: string;
  minBalanceMinor?: number;
  maxBalanceMinor?: number | null;
  dailyDebitLimitMinor?: number | null;
  singleTransactionLimitMinor?: number | null;
  allowNegative?: boolean;
  createdBy: string | null;
}

/** Persistence for per-wallet limits. */
export class WalletLimitRepository {
  public constructor(private readonly db: Database) {}

  public async findByWalletId(
    walletId: string,
    executor: Executor = this.db,
  ): Promise<WalletLimitRow | null> {
    const rows = await executor
      .select()
      .from(walletLimits)
      .where(eq(walletLimits.walletId, walletId))
      .limit(1);
    return rows[0] ?? null;
  }

  public async create(
    input: CreateLimitInput,
    executor: Executor = this.db,
  ): Promise<WalletLimitRow> {
    const rows = await executor
      .insert(walletLimits)
      .values({
        walletId: input.walletId,
        currencyCode: input.currencyCode,
        minBalanceMinor: input.minBalanceMinor ?? 0,
        maxBalanceMinor: input.maxBalanceMinor ?? null,
        dailyDebitLimitMinor: input.dailyDebitLimitMinor ?? null,
        singleTransactionLimitMinor: input.singleTransactionLimitMinor ?? null,
        allowNegative: input.allowNegative ?? false,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Limit insert did not return a row.');
    }
    return created;
  }
}
