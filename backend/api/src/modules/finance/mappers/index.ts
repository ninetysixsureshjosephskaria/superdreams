import type { InferSelectModel } from 'drizzle-orm';

import type { depositTranches, financialLimits, financialRequests } from '@/database/schema';

import type { DepositTrancheData, FinancialLimitsData, FinancialRequestData } from '../dto';

export type FinancialRequestRow = InferSelectModel<typeof financialRequests>;
export type DepositTrancheRow = InferSelectModel<typeof depositTranches>;
export type FinancialLimitsRow = InferSelectModel<typeof financialLimits>;

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

export function toFinancialRequest(row: FinancialRequestRow): FinancialRequestData {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    memberId: row.memberId,
    walletId: row.walletId,
    type: row.type,
    status: row.status,
    amountCents: row.amountCents,
    units: row.units,
    currencyCode: row.currencyCode,
    early: row.early,
    reason: row.reason,
    decidedBy: row.decidedBy,
    decidedAt: iso(row.decidedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDepositTranche(row: DepositTrancheRow): DepositTrancheData {
  return {
    id: row.id,
    trancheNumber: row.trancheNumber,
    memberId: row.memberId,
    walletId: row.walletId,
    depositRequestId: row.depositRequestId,
    principalCents: row.principalCents,
    bonusBps: row.bonusBps,
    bonusCents: row.bonusCents,
    currencyCode: row.currencyCode,
    lockDays: row.lockDays,
    maturesAt: row.maturesAt.toISOString(),
    status: row.status,
    unlockedAt: iso(row.unlockedAt),
    feeCents: row.feeCents,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toFinancialLimits(row: FinancialLimitsRow): FinancialLimitsData {
  return {
    minDepositUnits: row.minDepositUnits,
    maxDepositUnits: row.maxDepositUnits,
    minWithdrawCents: row.minWithdrawCents,
    earlyWithdrawAllowed: row.earlyWithdrawAllowed,
    earlyWithdrawFeeBps: row.earlyWithdrawFeeBps,
    processingMinDays: row.processingMinDays,
    processingMaxDays: row.processingMaxDays,
    updatedAt: row.updatedAt.toISOString(),
  };
}
