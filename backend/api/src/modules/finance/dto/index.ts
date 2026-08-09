/** Financial request kind. */
export type FinancialRequestType = 'DEPOSIT' | 'WITHDRAW';

/** Financial request lifecycle status. */
export type FinancialRequestStatus = 'PENDING' | 'HOLD' | 'APPROVED' | 'REJECTED';

/** Deposit tranche lifecycle status. */
export type DepositTrancheStatus = 'LOCKED' | 'MATURED' | 'UNLOCKED' | 'LIQUIDATED';

/**
 * Who performed a finance operation, for audit + ledger attribution. Structurally
 * identical to the wallet module's actor so it can be passed straight through to
 * the wallet compose seam.
 */
export interface FinanceActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

/** A deposit / withdrawal request as returned to API clients. */
export interface FinancialRequestData {
  id: string;
  requestNumber: string;
  memberId: string;
  walletId: string | null;
  type: FinancialRequestType;
  status: FinancialRequestStatus;
  amountCents: number;
  units: number;
  currencyCode: string;
  early: boolean;
  reason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A locked deposit tranche as returned to API clients. */
export interface DepositTrancheData {
  id: string;
  trancheNumber: string;
  memberId: string;
  walletId: string;
  depositRequestId: string | null;
  principalCents: number;
  bonusBps: number;
  bonusCents: number;
  currencyCode: string;
  lockDays: number;
  maturesAt: string;
  status: DepositTrancheStatus;
  unlockedAt: string | null;
  feeCents: number;
  createdAt: string;
}

/** Result of a tranche maturity run (scheduler / admin manual). */
export interface TrancheMaturityResult {
  maturedCount: number;
  bonusCreditedCents: number;
}

export interface PaginatedFinancialRequests {
  items: FinancialRequestData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** System-wide deposit / withdrawal policy (the `limits.html` screen). */
export interface FinancialLimitsData {
  minDepositUnits: number;
  maxDepositUnits: number;
  minWithdrawCents: number;
  earlyWithdrawAllowed: boolean;
  earlyWithdrawFeeBps: number;
  processingMinDays: number;
  processingMaxDays: number;
  updatedAt: string;
}
