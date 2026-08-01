import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  adjustSchema,
  allocateSchema,
  changeProgramStatusSchema,
  createProgramSchema,
  listProgramsQuerySchema,
  listTransactionsQuerySchema,
  memberHistoryQuerySchema,
  redeemSchema,
  updateProgramSchema,
} from '../validators';

export type RewardProgramStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type RewardRuleType = 'FIXED' | 'PERCENTAGE' | 'TIER' | 'EVENT' | 'MANUAL' | 'PROMOTIONAL';
export type RewardTransactionType = 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRE' | 'REVERSAL';
export type RewardDirection = 'CREDIT' | 'DEBIT';
export type RewardTransactionStatus = 'POSTED' | 'REVERSED';
export type RewardRedemptionStatus = 'PENDING' | 'COMPLETED' | 'REVERSED';
export type RewardExpiryPolicy = 'FIXED_DATE' | 'ROLLING' | 'NEVER';

export interface RewardRuleData {
  id: string;
  name: string;
  type: RewardRuleType;
  points: number | null;
  rateBasisPoints: number | null;
  priority: number;
  isActive: boolean;
}

export interface RewardExpiryRuleData {
  policy: RewardExpiryPolicy;
  fixedDate: string | null;
  rollingDays: number | null;
}

export interface RewardProgramSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: RewardRuleType;
  categoryCode: string | null;
  status: RewardProgramStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  pointsPerUnit: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardProgramDetail extends RewardProgramSummary {
  rules: RewardRuleData[];
  expiry: RewardExpiryRuleData | null;
}

export interface MemberRewardBalance {
  memberId: string;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}

export interface RewardTransactionData {
  id: string;
  memberId: string;
  programId: string | null;
  ruleId: string | null;
  reference: string;
  type: RewardTransactionType;
  direction: RewardDirection;
  status: RewardTransactionStatus;
  points: number;
  balanceAfter: number;
  description: string | null;
  redemptionId: string | null;
  reversalOfId: string | null;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface RewardRedemptionData {
  id: string;
  memberId: string;
  transactionId: string;
  reference: string;
  points: number;
  status: RewardRedemptionStatus;
  note: string | null;
  walletTransactionId: string | null;
  createdAt: Date;
}

/** Recompute-from-ledger check powering ledger-integrity validation. */
export interface RewardBalanceValidationResult {
  memberId: string;
  consistent: boolean;
  storedBalance: number;
  derivedBalance: number;
}

/** Outcome of an expiry-processing run. */
export interface ExpiryRunResult {
  processedMembers: number;
  expiredPoints: number;
  transactions: number;
}

export type PaginatedPrograms = PaginatedResult<RewardProgramSummary>;
export type PaginatedTransactions = PaginatedResult<RewardTransactionData>;

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ChangeProgramStatusInput = z.infer<typeof changeProgramStatusSchema>;
export type AllocateInput = z.infer<typeof allocateSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
export type AdjustInput = z.infer<typeof adjustSchema>;
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type MemberHistoryQuery = z.infer<typeof memberHistoryQuerySchema>;

/** Actor + request context for auditing and authorship. */
export interface RewardActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
