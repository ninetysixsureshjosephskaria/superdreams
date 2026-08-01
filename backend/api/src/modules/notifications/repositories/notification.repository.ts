import {
  and,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type InferSelectModel,
  type SQL,
} from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { notifications } from '@/database/schema';

import type { InboxQuery, ListNotificationsQuery } from '../dto';

export type NotificationRow = InferSelectModel<typeof notifications>;

const sortColumns = {
  createdAt: notifications.createdAt,
  scheduledAt: notifications.scheduledAt,
  status: notifications.status,
} as const;

export class NotificationRepository extends BaseRepository<typeof notifications> {
  public constructor(db: Database) {
    super(db, notifications);
  }

  /** Admin search across all notifications. */
  public async search(
    query: ListNotificationsQuery,
  ): Promise<{ rows: NotificationRow[]; total: number }> {
    const conditions: SQL[] = [notDeleted(notifications.deletedAt)];

    if (query.channel) conditions.push(eq(notifications.channel, query.channel));
    if (query.status) conditions.push(eq(notifications.status, query.status));
    if (query.recipientUserId) {
      conditions.push(eq(notifications.recipientUserId, query.recipientUserId));
    }
    if (query.recipientMemberId) {
      conditions.push(eq(notifications.recipientMemberId, query.recipientMemberId));
    }
    if (query.dateFrom) conditions.push(gte(notifications.createdAt, new Date(query.dateFrom)));
    if (query.dateTo) conditions.push(lte(notifications.createdAt, new Date(query.dateTo)));
    if (query.search) {
      const term = `%${query.search}%`;
      const searchCondition = or(
        ilike(notifications.subject, term),
        ilike(notifications.body, term),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const where = and(...conditions);
    const column = sortColumns[query.sortBy];
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(query.order === 'asc' ? column : desc(column))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  /** A user's in-app inbox (read/unread/archived filters). */
  public async inbox(
    userId: string,
    query: InboxQuery,
  ): Promise<{ rows: NotificationRow[]; total: number }> {
    const conditions: SQL[] = [
      notDeleted(notifications.deletedAt),
      eq(notifications.recipientUserId, userId),
      eq(notifications.channel, 'IN_APP'),
    ];
    if (query.status === 'UNREAD') {
      conditions.push(isNull(notifications.readAt));
      conditions.push(isNull(notifications.archivedAt));
    } else if (query.status === 'READ') {
      conditions.push(isNotNull(notifications.readAt));
      conditions.push(isNull(notifications.archivedAt));
    } else if (query.status === 'ARCHIVED') {
      conditions.push(isNotNull(notifications.archivedAt));
    } else {
      conditions.push(isNull(notifications.archivedAt));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const totals = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(where);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  /** Count of unread, non-archived in-app notifications for a user. */
  public async unreadCount(userId: string): Promise<number> {
    const rows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          eq(notifications.channel, 'IN_APP'),
          isNull(notifications.readAt),
          isNull(notifications.archivedAt),
          notDeleted(notifications.deletedAt),
        ),
      );
    return rows[0]?.value ?? 0;
  }
}
