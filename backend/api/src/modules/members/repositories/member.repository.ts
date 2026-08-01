import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { members } from '@/database/schema';

import type { ListMembersQuery } from '../dto';

export type MemberRow = InferSelectModel<typeof members>;

const sortColumns = {
  createdAt: members.createdAt,
  updatedAt: members.updatedAt,
  joinedAt: members.joinedAt,
  lastName: members.lastName,
  status: members.status,
} as const;

export class MemberRepository extends BaseRepository<typeof members> {
  public constructor(db: Database) {
    super(db, members);
  }

  public async findByEmail(email: string): Promise<MemberRow | null> {
    const rows = await this.db
      .select()
      .from(members)
      .where(and(eq(members.email, email), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByNumber(memberNumber: string): Promise<MemberRow | null> {
    const rows = await this.db
      .select()
      .from(members)
      .where(and(eq(members.memberNumber, memberNumber), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByUserId(userId: string): Promise<MemberRow | null> {
    const rows = await this.db
      .select()
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Paginated search + filter + sort. All params are already validated. */
  public async search(query: ListMembersQuery): Promise<{ rows: MemberRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(members.deletedAt)];

    if (query.status) {
      conditions.push(eq(members.status, query.status));
    }
    if (query.joinedFrom) {
      conditions.push(gte(members.joinedAt, new Date(query.joinedFrom)));
    }
    if (query.joinedTo) {
      conditions.push(lte(members.joinedAt, new Date(`${query.joinedTo}T23:59:59.999Z`)));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      const searchCondition = or(
        ilike(members.firstName, term),
        ilike(members.lastName, term),
        ilike(members.email, term),
        ilike(members.phone, term),
        ilike(members.memberNumber, term),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = and(...conditions);
    const direction = query.order === 'asc' ? asc : desc;
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(members)
      .where(where)
      .orderBy(direction(sortColumns[query.sortBy]))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(members)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }
}
