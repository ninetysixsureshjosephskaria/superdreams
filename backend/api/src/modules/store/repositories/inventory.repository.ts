import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { storeInventoryHistory } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { InventoryChangeType } from '../dto';

export type InventoryRow = InferSelectModel<typeof storeInventoryHistory>;

/** Append-only persistence for stock movements. */
export class InventoryRepository {
  public constructor(private readonly db: Database) {}

  public async record(
    input: {
      productId: string;
      changeType: InventoryChangeType;
      change: number;
      stockAfter: number;
      reason: string | null;
      orderId: string | null;
      actorId: string | null;
    },
    executor: Executor = this.db,
  ): Promise<void> {
    await executor.insert(storeInventoryHistory).values(input);
  }

  public async listByProduct(productId: string, limit = 50): Promise<InventoryRow[]> {
    return this.db
      .select()
      .from(storeInventoryHistory)
      .where(eq(storeInventoryHistory.productId, productId))
      .orderBy(desc(storeInventoryHistory.createdAt))
      .limit(limit);
  }
}
