import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { members, notificationGroups, users } from '@/database/schema';

/** Reference data for notification groups (categories). */
export class NotificationGroupRepository {
  public constructor(private readonly db: Database) {}

  public async findByCode(code: string): Promise<{ id: string; code: string } | null> {
    const rows = await this.db
      .select({ id: notificationGroups.id, code: notificationGroups.code })
      .from(notificationGroups)
      .where(eq(notificationGroups.code, code))
      .limit(1);
    return rows[0] ?? null;
  }

  public async codeById(id: string): Promise<string | null> {
    const rows = await this.db
      .select({ code: notificationGroups.code })
      .from(notificationGroups)
      .where(eq(notificationGroups.id, id))
      .limit(1);
    return rows[0]?.code ?? null;
  }
}

/** The recipient facts notifications need (linkage + inbox ownership). */
export interface RecipientLink {
  memberId: string;
  userId: string | null;
}

/**
 * Read-only, persistence-layer access to the referenced `members`/`users`
 * tables — used to resolve a recipient's inbox user and to validate a user
 * recipient. Holds no business logic from those modules.
 */
export class RecipientLookupRepository {
  public constructor(private readonly db: Database) {}

  public async memberById(id: string): Promise<RecipientLink | null> {
    const rows = await this.db
      .select({ memberId: members.id, userId: members.userId })
      .from(members)
      .where(and(eq(members.id, id), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async memberByUserId(userId: string): Promise<RecipientLink | null> {
    const rows = await this.db
      .select({ memberId: members.id, userId: members.userId })
      .from(members)
      .where(and(eq(members.userId, userId), notDeleted(members.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async userExists(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), notDeleted(users.deletedAt)))
      .limit(1);
    return rows.length > 0;
  }
}
