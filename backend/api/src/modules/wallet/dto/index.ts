import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  adjustmentSchema,
  changeWalletStatusSchema,
  createWalletSchema,
  creditSchema,
  debitSchema,
  generateStatementSchema,
  holdSchema,
  listTransactionsQuerySchema,
  listWalletsQuerySchema,
} from '../validators';

export type WalletStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type WalletKind = 'LOYALTY' | 'FINANCIAL';
export type TransactionType = 'CREDIT' | 'DEBIT' | 'ADJUSTMENT' | 'HOLD' | 'RELEASE' | 'REVERSAL';
export type TransactionDirection = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'POSTED' | 'REVERSED';
export type HoldStatus = 'ACTIVE' | 'RELEASED';

/** Available / held / total balance, all in integer minor units. */
export interface WalletBalanceData {
  currencyCode: string;
  availableMinor: number;
  heldMinor: number;
  totalMinor: number;
}

export interface WalletSummary {
  id: string;
  walletNumber: string;
  memberId: string;
  kind: WalletKind;
  currencyCode: string;
  status: WalletStatus;
  balance: WalletBalanceData;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletLimitData {
  currencyCode: string;
  minBalanceMinor: number;
  maxBalanceMinor: number | null;
  dailyDebitLimitMinor: number | null;
  singleTransactionLimitMinor: number | null;
  allowNegative: boolean;
}

export interface WalletDetail extends WalletSummary {
  limits: WalletLimitData | null;
}

export interface WalletTransactionData {
  id: string;
  walletId: string;
  reference: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  amountMinor: number;
  currencyCode: string;
  availableAfterMinor: number;
  heldAfterMinor: number;
  description: string | null;
  holdId: string | null;
  reversalOfId: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface WalletHoldData {
  id: string;
  walletId: string;
  reference: string;
  amountMinor: number;
  currencyCode: string;
  status: HoldStatus;
  reason: string | null;
  placedBy: string | null;
  releasedBy: string | null;
  releasedAt: Date | null;
  createdAt: Date;
}

export interface WalletStatementData {
  id: string;
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
  createdAt: Date;
}

/** Result of recomputing the balance from the ledger vs the stored projection. */
export interface BalanceValidationResult {
  walletId: string;
  consistent: boolean;
  storedAvailableMinor: number;
  storedHeldMinor: number;
  derivedAvailableMinor: number;
  derivedHeldMinor: number;
}

export type PaginatedWallets = PaginatedResult<WalletSummary>;
export type PaginatedTransactions = PaginatedResult<WalletTransactionData>;

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type CreditInput = z.infer<typeof creditSchema>;
export type DebitInput = z.infer<typeof debitSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type HoldInput = z.infer<typeof holdSchema>;
export type ChangeWalletStatusInput = z.infer<typeof changeWalletStatusSchema>;
export type GenerateStatementInput = z.infer<typeof generateStatementSchema>;
export type ListWalletsQuery = z.infer<typeof listWalletsQuerySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

/** Actor + request context for auditing and authorship. */
export interface WalletActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
