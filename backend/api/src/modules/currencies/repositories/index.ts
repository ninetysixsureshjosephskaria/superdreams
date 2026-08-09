import { and, asc, desc, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { auditLogs, currencies } from '@/database/schema';
import type { Executor } from '@/database/types';

export type CurrencyRow = typeof currencies.$inferSelect;

export class CurrencyRepository extends BaseRepository<typeof currencies> {
  public constructor(db: Database) {
    super(db, currencies);
  }

  public async findByCode(code: string): Promise<CurrencyRow | null> {
    const rows = await this.db
      .select()
      .from(currencies)
      .where(and(eq(currencies.code, code), notDeleted(currencies.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** All currencies, base first then alphabetical. */
  public async list(activeOnly = false): Promise<CurrencyRow[]> {
    const conditions = [notDeleted(currencies.deletedAt)];
    if (activeOnly) {
      conditions.push(eq(currencies.isActive, true));
    }
    return this.db
      .select()
      .from(currencies)
      .where(and(...conditions))
      .orderBy(desc(currencies.isBase), asc(currencies.code));
  }
}

export interface CurrencyAuditEntry {
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValue?: unknown;
  newValue?: unknown;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

/** Writes currency changes to the shared append-only audit log. */
export class CurrencyAuditRepository {
  public async write(entry: CurrencyAuditEntry, executor: Executor): Promise<void> {
    await executor.insert(auditLogs).values({
      entityType: 'currency',
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      module: 'currencies',
      correlationId: entry.correlationId,
    });
  }
}
