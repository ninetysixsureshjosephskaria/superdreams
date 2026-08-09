import { eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { financialLimits } from '@/database/schema';
import type { Executor } from '@/database/types';

export type FinancialLimitsRow = typeof financialLimits.$inferSelect;

/**
 * Persistence for the system-wide finance limits **singleton** (one row, keyed by
 * the `singleton = true` unique index). `getOrCreate` lazily materialises the row
 * from the schema defaults (the reference-defined values) on first access.
 */
export class FinancialLimitsRepository {
  public constructor(private readonly db: Database) {}

  public async get(executor: Executor = this.db): Promise<FinancialLimitsRow | null> {
    const rows = await executor
      .select()
      .from(financialLimits)
      .where(eq(financialLimits.singleton, true))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Returns the singleton, creating it from column defaults if it does not exist. */
  public async getOrCreate(createdBy: string | null): Promise<FinancialLimitsRow> {
    const existing = await this.get();
    if (existing) {
      return existing;
    }
    try {
      const rows = await this.db
        .insert(financialLimits)
        .values({ singleton: true, createdBy, updatedBy: createdBy })
        .returning();
      if (rows[0]) {
        return rows[0];
      }
    } catch {
      // A concurrent caller inserted the singleton first — fall through to re-read.
    }
    const row = await this.get();
    if (!row) {
      throw new Error('Failed to materialise the finance limits singleton.');
    }
    return row;
  }

  public async update(
    values: Partial<typeof financialLimits.$inferInsert>,
    executor: Executor = this.db,
  ): Promise<FinancialLimitsRow | null> {
    const rows = await executor
      .update(financialLimits)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(financialLimits.singleton, true))
      .returning();
    return rows[0] ?? null;
  }
}
