import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { users } from '@/database/schema';

import type { UserRow } from '../mappers';

/** Persistence for the User aggregate. No business rules. */
export class UserRepository extends BaseRepository<typeof users> {
  public constructor(db: Database) {
    super(db, users);
  }

  public async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), notDeleted(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findByUsername(username: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.username, username), notDeleted(users.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
