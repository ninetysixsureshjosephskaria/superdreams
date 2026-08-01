import { desc, eq, type InferSelectModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { walletStatements } from '@/database/schema';

export type WalletStatementRow = InferSelectModel<typeof walletStatements>;

export interface CreateStatementInput {
  walletId: string;
  reference: string;
  periodStart: Date;
  periodEnd: Date;
  currencyCode: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  totalCreditsMinor: number;
  totalDebitsMinor: number;
  transactionCount: number;
  generatedBy: string | null;
}

/** Persistence for generated statements. */
export class WalletStatementRepository {
  public constructor(private readonly db: Database) {}

  public async create(input: CreateStatementInput): Promise<WalletStatementRow> {
    const rows = await this.db
      .insert(walletStatements)
      .values({
        walletId: input.walletId,
        reference: input.reference,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        currencyCode: input.currencyCode,
        openingBalanceMinor: input.openingBalanceMinor,
        closingBalanceMinor: input.closingBalanceMinor,
        totalCreditsMinor: input.totalCreditsMinor,
        totalDebitsMinor: input.totalDebitsMinor,
        transactionCount: input.transactionCount,
        generatedBy: input.generatedBy,
        createdBy: input.generatedBy,
        updatedBy: input.generatedBy,
      })
      .returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Statement insert did not return a row.');
    }
    return created;
  }

  public async listByWallet(walletId: string): Promise<WalletStatementRow[]> {
    return this.db
      .select()
      .from(walletStatements)
      .where(eq(walletStatements.walletId, walletId))
      .orderBy(desc(walletStatements.periodEnd));
  }
}
