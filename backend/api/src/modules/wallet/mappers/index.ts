import type { InferSelectModel } from 'drizzle-orm';

import type {
  walletBalances,
  walletHolds,
  walletLimits,
  walletStatements,
  walletTransactions,
  wallets,
} from '@/database/schema';

import type {
  WalletBalanceData,
  WalletDetail,
  WalletHoldData,
  WalletLimitData,
  WalletStatementData,
  WalletSummary,
  WalletTransactionData,
} from '../dto';

export type WalletRow = InferSelectModel<typeof wallets>;
export type WalletBalanceRow = InferSelectModel<typeof walletBalances>;
export type WalletLimitRow = InferSelectModel<typeof walletLimits>;
export type WalletTransactionRow = InferSelectModel<typeof walletTransactions>;
export type WalletHoldRow = InferSelectModel<typeof walletHolds>;
export type WalletStatementRow = InferSelectModel<typeof walletStatements>;

export function toWalletBalance(row: WalletBalanceRow): WalletBalanceData {
  return {
    currencyCode: row.currencyCode,
    availableMinor: row.availableMinor,
    heldMinor: row.heldMinor,
    totalMinor: row.totalMinor,
  };
}

export function toWalletSummary(wallet: WalletRow, balance: WalletBalanceRow): WalletSummary {
  return {
    id: wallet.id,
    walletNumber: wallet.walletNumber,
    memberId: wallet.memberId,
    currencyCode: wallet.currencyCode,
    status: wallet.status,
    balance: toWalletBalance(balance),
    openedAt: wallet.openedAt,
    closedAt: wallet.closedAt,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}

export function toWalletLimit(row: WalletLimitRow | null): WalletLimitData | null {
  if (!row) {
    return null;
  }
  return {
    currencyCode: row.currencyCode,
    minBalanceMinor: row.minBalanceMinor,
    maxBalanceMinor: row.maxBalanceMinor,
    dailyDebitLimitMinor: row.dailyDebitLimitMinor,
    singleTransactionLimitMinor: row.singleTransactionLimitMinor,
    allowNegative: row.allowNegative,
  };
}

export function toWalletDetail(
  wallet: WalletRow,
  balance: WalletBalanceRow,
  limits: WalletLimitRow | null,
): WalletDetail {
  return { ...toWalletSummary(wallet, balance), limits: toWalletLimit(limits) };
}

export function toWalletTransaction(row: WalletTransactionRow): WalletTransactionData {
  return {
    id: row.id,
    walletId: row.walletId,
    reference: row.reference,
    type: row.type,
    direction: row.direction,
    status: row.status,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    availableAfterMinor: row.availableAfterMinor,
    heldAfterMinor: row.heldAfterMinor,
    description: row.description,
    holdId: row.holdId,
    reversalOfId: row.reversalOfId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function toWalletHold(row: WalletHoldRow): WalletHoldData {
  return {
    id: row.id,
    walletId: row.walletId,
    reference: row.reference,
    amountMinor: row.amountMinor,
    currencyCode: row.currencyCode,
    status: row.status,
    reason: row.reason,
    placedBy: row.placedBy,
    releasedBy: row.releasedBy,
    releasedAt: row.releasedAt,
    createdAt: row.createdAt,
  };
}

export function toWalletStatement(row: WalletStatementRow): WalletStatementData {
  return {
    id: row.id,
    walletId: row.walletId,
    reference: row.reference,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    currencyCode: row.currencyCode,
    openingBalanceMinor: row.openingBalanceMinor,
    closingBalanceMinor: row.closingBalanceMinor,
    totalCreditsMinor: row.totalCreditsMinor,
    totalDebitsMinor: row.totalDebitsMinor,
    transactionCount: row.transactionCount,
    generatedBy: row.generatedBy,
    createdAt: row.createdAt,
  };
}
