import { and, eq } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { notDeleted } from '@/database/helpers';
import { BaseRepository } from '@/database/repositories';
import { organizations } from '@/database/schema';

import type { OrganizationRow } from '../mappers';

/** Persistence for the Organization aggregate. No business rules. */
export class OrganizationRepository extends BaseRepository<typeof organizations> {
  public constructor(db: Database) {
    super(db, organizations);
  }

  public async findBySlug(slug: string): Promise<OrganizationRow | null> {
    const rows = await this.db
      .select()
      .from(organizations)
      .where(and(eq(organizations.slug, slug), notDeleted(organizations.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }
}
