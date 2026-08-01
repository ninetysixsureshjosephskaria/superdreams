import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { walletAdjustments } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { TransactionDirection } from '../dto';

export type WalletAdjustmentRow = InferSelectModel<typeof walletAdjustments>;

export interface CreateAdjustmentInput {
  walletId: string;
  transactionId: string;
  direction: TransactionDirection;
  amountMinor: number;
  currencyCode: string;
  reason: string;
  approvedBy: string | null;
}

/** Persistence for manual adjustments. */
export class WalletAdjustmentRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: CreateAdjustmentInput,
    executor: Executor = this.db,
  ): Promise<WalletAdjustmentRow> {
    const rows = await executor
      .insert(walletAdjustments)
      .values({
        walletId: input.walletId,
        transactionId: input.transactionId,
        direction: input.direction,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode,
        reason: input.reason,
        approvedBy: input.approvedBy,
        createdBy: input.approvedBy,
        updatedBy: input.approvedBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Adjustment insert did not return a row.');
    }
    return created;
  }

  public async listByWallet(walletId: string): Promise<WalletAdjustmentRow[]> {
    return this.db
      .select()
      .from(walletAdjustments)
      .where(eq(walletAdjustments.walletId, walletId))
      .orderBy(desc(walletAdjustments.createdAt));
  }
}
