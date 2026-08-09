import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { invites } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { ListInvitesQuery } from '../validators';

export type InviteRow = typeof invites.$inferSelect;

const sortColumns = {
  createdAt: invites.createdAt,
  expiresAt: invites.expiresAt,
  status: invites.status,
} as const;

export class InviteRepository extends BaseRepository<typeof invites> {
  public constructor(db: Database) {
    super(db, invites);
  }

  public async findByCode(code: string): Promise<InviteRow | null> {
    const rows = await this.db
      .select()
      .from(invites)
      .where(and(eq(invites.code, code), notDeleted(invites.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Locks an invite row FOR UPDATE so acceptance/revocation cannot race. */
  public async lockByCode(code: string, executor: Executor): Promise<InviteRow | null> {
    const rows = await executor
      .select()
      .from(invites)
      .where(and(eq(invites.code, code), notDeleted(invites.deletedAt)))
      .limit(1)
      .for('update');
    return rows[0] ?? null;
  }

  public async search(query: ListInvitesQuery): Promise<{ rows: InviteRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(invites.deletedAt)];
    if (query.role) {
      conditions.push(eq(invites.role, query.role));
    }
    if (query.status) {
      conditions.push(eq(invites.status, query.status));
    }
    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(invites)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(invites)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
