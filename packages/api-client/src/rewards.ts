import type { AxiosInstance } from 'axios';

/**
 * Rewards Management API resource — the single, shared definition of the reward
 * HTTP contract used by every application (no duplicated API logic). Rewards use
 * integer points; JSON dates are strings over the wire.
 */

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
  startsAt: string | null;
  endsAt: string | null;
  pointsPerUnit: number | null;
  createdAt: string;
  updatedAt: string;
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
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
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
  createdAt: string;
}

export interface ExpiryRunResult {
  processedMembers: number;
  expiredPoints: number;
  transactions: number;
}

export interface PaginatedPrograms {
  items: RewardProgramSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedRewardTransactions {
  items: RewardTransactionData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type RewardProgramSortField = 'createdAt' | 'updatedAt' | 'name' | 'status' | 'code';

export interface ListProgramsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RewardProgramStatus;
  type?: RewardRuleType;
  sortBy?: RewardProgramSortField;
  order?: 'asc' | 'desc';
}

export interface ListRewardTransactionsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  memberId?: string;
  programId?: string;
  type?: RewardTransactionType;
  direction?: RewardDirection;
  status?: RewardTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'points';
  order?: 'asc' | 'desc';
}

export interface MemberHistoryParams {
  page?: number;
  pageSize?: number;
  type?: RewardTransactionType;
  direction?: RewardDirection;
  status?: RewardTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  order?: 'asc' | 'desc';
}

export interface RewardRuleInput {
  name: string;
  type: RewardRuleType;
  points?: number;
  rateBasisPoints?: number;
  priority?: number;
}

export interface CreateProgramInput {
  code: string;
  name: string;
  description?: string;
  type: RewardRuleType;
  categoryCode?: string;
  status?: RewardProgramStatus;
  startsAt?: string;
  endsAt?: string;
  pointsPerUnit?: number;
  rules?: RewardRuleInput[];
  expiry?: { policy: RewardExpiryPolicy; fixedDate?: string; rollingDays?: number };
}

export interface UpdateProgramInput {
  name?: string;
  description?: string | null;
  categoryCode?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  pointsPerUnit?: number | null;
}

export interface ChangeProgramStatusInput {
  status: RewardProgramStatus;
  reason?: string;
}

export interface AllocateInput {
  programId?: string;
  ruleId?: string;
  points?: number;
  baseValue?: number;
  description?: string;
  reference?: string;
  expiresInDays?: number;
}

export interface RedeemInput {
  points: number;
  note?: string;
  reference?: string;
  walletCreditMinor?: number;
}

export interface RewardAdjustInput {
  direction: RewardDirection;
  points: number;
  reason: string;
  reference?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface RewardsApi {
  listPrograms(params?: ListProgramsParams): Promise<PaginatedPrograms>;
  getProgram(id: string): Promise<RewardProgramDetail>;
  createProgram(input: CreateProgramInput): Promise<RewardProgramDetail>;
  updateProgram(id: string, input: UpdateProgramInput): Promise<RewardProgramDetail>;
  changeProgramStatus(id: string, input: ChangeProgramStatusInput): Promise<RewardProgramDetail>;
  getMemberBalance(memberId: string): Promise<MemberRewardBalance>;
  getMemberHistory(
    memberId: string,
    params?: MemberHistoryParams,
  ): Promise<PaginatedRewardTransactions>;
  allocate(memberId: string, input: AllocateInput): Promise<RewardTransactionData>;
  redeem(memberId: string, input: RedeemInput): Promise<RewardRedemptionData>;
  adjust(memberId: string, input: RewardAdjustInput): Promise<RewardTransactionData>;
  reverse(memberId: string, transactionId: string): Promise<RewardTransactionData>;
  listTransactions(params?: ListRewardTransactionsParams): Promise<PaginatedRewardTransactions>;
  runExpiry(input?: { asOf?: string }): Promise<ExpiryRunResult>;
  getMine(): Promise<MemberRewardBalance>;
  getMyHistory(params?: MemberHistoryParams): Promise<PaginatedRewardTransactions>;
}

/** Binds the rewards resource to a configured API client. */
export function createRewardsApi(client: AxiosInstance): RewardsApi {
  const base = '/api/v1/rewards';
  return {
    async listPrograms(params) {
      const response = await client.get<Envelope<PaginatedPrograms>>(`${base}/programs`, {
        params,
      });
      return response.data.data;
    },
    async getProgram(id) {
      const response = await client.get<Envelope<RewardProgramDetail>>(`${base}/programs/${id}`);
      return response.data.data;
    },
    async createProgram(input) {
      const response = await client.post<Envelope<RewardProgramDetail>>(`${base}/programs`, input);
      return response.data.data;
    },
    async updateProgram(id, input) {
      const response = await client.put<Envelope<RewardProgramDetail>>(
        `${base}/programs/${id}`,
        input,
      );
      return response.data.data;
    },
    async changeProgramStatus(id, input) {
      const response = await client.patch<Envelope<RewardProgramDetail>>(
        `${base}/programs/${id}/status`,
        input,
      );
      return response.data.data;
    },
    async getMemberBalance(memberId) {
      const response = await client.get<Envelope<MemberRewardBalance>>(
        `${base}/members/${memberId}`,
      );
      return response.data.data;
    },
    async getMemberHistory(memberId, params) {
      const response = await client.get<Envelope<PaginatedRewardTransactions>>(
        `${base}/members/${memberId}/history`,
        { params },
      );
      return response.data.data;
    },
    async allocate(memberId, input) {
      const response = await client.post<Envelope<RewardTransactionData>>(
        `${base}/members/${memberId}/allocate`,
        input,
      );
      return response.data.data;
    },
    async redeem(memberId, input) {
      const response = await client.post<Envelope<RewardRedemptionData>>(
        `${base}/members/${memberId}/redeem`,
        input,
      );
      return response.data.data;
    },
    async adjust(memberId, input) {
      const response = await client.post<Envelope<RewardTransactionData>>(
        `${base}/members/${memberId}/adjust`,
        input,
      );
      return response.data.data;
    },
    async reverse(memberId, transactionId) {
      const response = await client.post<Envelope<RewardTransactionData>>(
        `${base}/members/${memberId}/reverse/${transactionId}`,
      );
      return response.data.data;
    },
    async listTransactions(params) {
      const response = await client.get<Envelope<PaginatedRewardTransactions>>(
        `${base}/transactions`,
        { params },
      );
      return response.data.data;
    },
    async runExpiry(input) {
      const response = await client.post<Envelope<ExpiryRunResult>>(`${base}/expire`, input ?? {});
      return response.data.data;
    },
    async getMine() {
      const response = await client.get<Envelope<MemberRewardBalance>>(`${base}/me`);
      return response.data.data;
    },
    async getMyHistory(params) {
      const response = await client.get<Envelope<PaginatedRewardTransactions>>(
        `${base}/me/history`,
        {
          params,
        },
      );
      return response.data.data;
    },
  };
}
