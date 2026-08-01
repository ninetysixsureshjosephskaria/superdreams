import { asc, desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { rewardCategories, rewardExpiryRules, rewardRules } from '@/database/schema';
import type { Executor } from '@/database/types';

import type { RewardRuleType } from '../dto';

export type RewardRuleRow = InferSelectModel<typeof rewardRules>;
export type RewardExpiryRuleRow = InferSelectModel<typeof rewardExpiryRules>;

export interface CreateRuleInput {
  programId: string;
  name: string;
  type: RewardRuleType;
  points?: number | null;
  rateBasisPoints?: number | null;
  priority?: number;
  createdBy: string | null;
}

export interface CreateExpiryRuleInput {
  programId: string;
  policy: 'FIXED_DATE' | 'ROLLING' | 'NEVER';
  fixedDate?: Date | null;
  rollingDays?: number | null;
  createdBy: string | null;
}

/** Reference-data access for reward categories. */
export class RewardCategoryRepository {
  public constructor(private readonly db: Database) {}

  public async findByCode(code: string): Promise<{ id: string; code: string } | null> {
    const rows = await this.db
      .select({ id: rewardCategories.id, code: rewardCategories.code })
      .from(rewardCategories)
      .where(eq(rewardCategories.code, code))
      .limit(1);
    return rows[0] ?? null;
  }

  public async codeById(id: string): Promise<string | null> {
    const rows = await this.db
      .select({ code: rewardCategories.code })
      .from(rewardCategories)
      .where(eq(rewardCategories.id, id))
      .limit(1);
    return rows[0]?.code ?? null;
  }
}

/** Persistence for program accrual rules. */
export class RewardRuleRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: CreateRuleInput,
    executor: Executor = this.db,
  ): Promise<RewardRuleRow> {
    const rows = await executor
      .insert(rewardRules)
      .values({
        programId: input.programId,
        name: input.name,
        type: input.type,
        points: input.points ?? null,
        rateBasisPoints: input.rateBasisPoints ?? null,
        priority: input.priority ?? 0,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Rule insert did not return a row.');
    }
    return created;
  }

  public async listByProgram(programId: string): Promise<RewardRuleRow[]> {
    return this.db
      .select()
      .from(rewardRules)
      .where(eq(rewardRules.programId, programId))
      .orderBy(desc(rewardRules.priority), asc(rewardRules.createdAt));
  }

  public async findById(id: string): Promise<RewardRuleRow | null> {
    const rows = await this.db.select().from(rewardRules).where(eq(rewardRules.id, id)).limit(1);
    return rows[0] ?? null;
  }
}

/** Persistence for program expiry rules. */
export class RewardExpiryRuleRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: CreateExpiryRuleInput,
    executor: Executor = this.db,
  ): Promise<RewardExpiryRuleRow> {
    const rows = await executor
      .insert(rewardExpiryRules)
      .values({
        programId: input.programId,
        policy: input.policy,
        fixedDate: input.fixedDate ?? null,
        rollingDays: input.rollingDays ?? null,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Expiry rule insert did not return a row.');
    }
    return created;
  }

  public async findByProgram(programId: string): Promise<RewardExpiryRuleRow | null> {
    const rows = await this.db
      .select()
      .from(rewardExpiryRules)
      .where(eq(rewardExpiryRules.programId, programId))
      .orderBy(desc(rewardExpiryRules.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }
}
