import { and, desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { walletHolds } from '@/database/schema';
import type { Executor } from '@/database/types';

export type WalletHoldRow = InferSelectModel<typeof walletHolds>;

export interface CreateHoldInput {
  walletId: string;
  reference: string;
  amountMinor: number;
  currencyCode: string;
  reason: string | null;
  placedBy: string | null;
  placeTransactionId: string;
}

/** Persistence for wallet holds. */
export class WalletHoldRepository extends BaseRepository<typeof walletHolds> {
  public constructor(db: Database) {
    super(db, walletHolds);
  }

  public async createHold(
    input: CreateHoldInput,
    executor: Executor = this.db,
  ): Promise<WalletHoldRow> {
    return this.create(
      {
        walletId: input.walletId,
        reference: input.reference,
        amountMinor: input.amountMinor,
        currencyCode: input.currencyCode,
        status: 'ACTIVE',
        reason: input.reason,
        placedBy: input.placedBy,
        placeTransactionId: input.placeTransactionId,
        createdBy: input.placedBy,
        updatedBy: input.placedBy,
      },
      executor,
    );
  }

  public async findActiveById(
    id: string,
    walletId: string,
    executor: Executor = this.db,
  ): Promise<WalletHoldRow | null> {
    const rows = await executor
      .select()
      .from(walletHolds)
      .where(
        and(
          eq(walletHolds.id, id),
          eq(walletHolds.walletId, walletId),
          eq(walletHolds.status, 'ACTIVE'),
          notDeleted(walletHolds.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  public async listByWallet(walletId: string): Promise<WalletHoldRow[]> {
    return this.db
      .select()
      .from(walletHolds)
      .where(and(eq(walletHolds.walletId, walletId), notDeleted(walletHolds.deletedAt)))
      .orderBy(desc(walletHolds.createdAt));
  }

  public async markReleased(
    id: string,
    releasedBy: string | null,
    releaseTransactionId: string,
    executor: Executor,
  ): Promise<void> {
    await this.update(
      id,
      {
        status: 'RELEASED',
        releasedBy,
        releasedAt: new Date(),
        releaseTransactionId,
        updatedBy: releasedBy,
      },
      executor,
    );
  }
}
