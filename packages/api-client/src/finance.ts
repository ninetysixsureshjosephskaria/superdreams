import type { AxiosInstance } from 'axios';

/**
 * Finance API resource — the shared HTTP contract for the member-facing deposit /
 * withdrawal flow. Mirrors the backend `finance` module DTOs exactly (no invented
 * shapes). Money is integer USD cents; `units` is the member-facing quantity
 * (1 unit = $30 = 3000 cents). The backend remains the source of truth for limits
 * and request state — this resource only transports them.
 */

export type FinancialRequestType = 'DEPOSIT' | 'WITHDRAW';
export type FinancialRequestStatus = 'PENDING' | 'HOLD' | 'APPROVED' | 'REJECTED';

/** A deposit / withdrawal request as returned by the API. */
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

export type DepositTrancheStatus = 'LOCKED' | 'MATURED' | 'UNLOCKED' | 'LIQUIDATED';

/** A locked deposit tranche as returned by the API. Money is integer USD cents. */
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

/** System-wide deposit / withdrawal policy. */
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

/** Paginated deposit / withdrawal requests (admin action queue). */
export interface PaginatedFinancialRequests {
  items: FinancialRequestData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Query for the admin action queue (`GET /finance/requests`). */
export interface ListFinancialRequestsParams {
  page?: number;
  pageSize?: number;
  type?: FinancialRequestType;
  status?: FinancialRequestStatus;
  memberId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'amountCents';
  order?: 'asc' | 'desc';
}

/** Body for `PUT /finance/limits` (all fields optional; backend merges + validates). */
export interface UpdateFinancialLimitsInput {
  minDepositUnits?: number;
  maxDepositUnits?: number;
  minWithdrawCents?: number;
  earlyWithdrawAllowed?: boolean;
  earlyWithdrawFeeBps?: number;
  processingMinDays?: number;
  processingMaxDays?: number;
}

/** Body for approve / hold decisions (reason optional). */
export interface FinanceDecisionInput {
  reason?: string;
}

/** Body for a reject decision (reason required by the backend). */
export interface FinanceRejectInput {
  reason: string;
}

/** Body for `POST /finance/deposits` (amount is expressed in whole units). */
export interface CreateDepositInput {
  units: number;
  reason?: string;
}

/**
 * Body for `POST /finance/withdrawals` (amount is expressed in whole units).
 * `early` requests a pre-maturity withdrawal (gated by `earlyWithdrawAllowed`);
 * the withdrawal endpoint itself charges no fee — the early-unlock fee applies to
 * the tranche early-unlock flow, not to withdrawals.
 */
export interface CreateWithdrawalInput {
  units: number;
  early?: boolean;
  reason?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface FinanceApi {
  /** Submits a deposit request (PENDING until an admin approves — no funds move now). */
  createDeposit(input: CreateDepositInput): Promise<FinancialRequestData>;
  /** Submits a withdrawal request (PENDING until an admin approves — no funds move now). */
  createWithdrawal(input: CreateWithdrawalInput): Promise<FinancialRequestData>;
  /** The caller's own deposit + withdrawal requests. */
  listMyRequests(): Promise<FinancialRequestData[]>;
  /** The caller's own deposit tranches (locked capital + bonus/maturity). */
  listMyTranches(): Promise<DepositTrancheData[]>;
  /**
   * Early-unlocks (liquidates) a LOCKED tranche the caller owns: charges the
   * backend-configured early-unlock fee and forfeits the pending bonus, atomically.
   */
  earlyUnlockTranche(trancheId: string): Promise<DepositTrancheData>;
  /** System-wide deposit / withdrawal limits (readable by any member). */
  getLimits(): Promise<FinancialLimitsData>;
  /** Updates the system-wide limits policy (requires finance.limits.manage). */
  updateLimits(input: UpdateFinancialLimitsInput): Promise<FinancialLimitsData>;
  // --- Admin action queue (requires finance.read) ---------------------------
  /** Lists deposit / withdrawal requests for the admin action queue. */
  listRequests(params?: ListFinancialRequestsParams): Promise<PaginatedFinancialRequests>;
  /** Fetches a single request by id. */
  getRequest(id: string): Promise<FinancialRequestData>;
  /** Approves a request (deposit → credit + tranche; withdrawal → debit), transactionally. */
  approveRequest(id: string, input?: FinanceDecisionInput): Promise<FinancialRequestData>;
  /** Rejects a request (reason required). */
  rejectRequest(id: string, input: FinanceRejectInput): Promise<FinancialRequestData>;
  /** Places a request on hold. */
  holdRequest(id: string, input?: FinanceDecisionInput): Promise<FinancialRequestData>;
}

/** Binds the finance resource to a configured API client. */
export function createFinanceApi(client: AxiosInstance): FinanceApi {
  const base = '/api/v1/finance';
  return {
    async createDeposit(input) {
      const response = await client.post<Envelope<FinancialRequestData>>(`${base}/deposits`, input);
      return response.data.data;
    },
    async createWithdrawal(input) {
      const response = await client.post<Envelope<FinancialRequestData>>(
        `${base}/withdrawals`,
        input,
      );
      return response.data.data;
    },
    async listMyRequests() {
      const response = await client.get<ItemsEnvelope<FinancialRequestData>>(`${base}/me/requests`);
      return response.data.data.items;
    },
    async listMyTranches() {
      const response = await client.get<ItemsEnvelope<DepositTrancheData>>(`${base}/me/tranches`);
      return response.data.data.items;
    },
    async earlyUnlockTranche(trancheId) {
      const response = await client.post<Envelope<DepositTrancheData>>(
        `${base}/me/tranches/${trancheId}/early-unlock`,
      );
      return response.data.data;
    },
    async getLimits() {
      const response = await client.get<Envelope<FinancialLimitsData>>(`${base}/limits`);
      return response.data.data;
    },
    async updateLimits(input) {
      const response = await client.put<Envelope<FinancialLimitsData>>(`${base}/limits`, input);
      return response.data.data;
    },
    async listRequests(params) {
      const response = await client.get<Envelope<PaginatedFinancialRequests>>(`${base}/requests`, {
        params,
      });
      return response.data.data;
    },
    async getRequest(id) {
      const response = await client.get<Envelope<FinancialRequestData>>(`${base}/requests/${id}`);
      return response.data.data;
    },
    async approveRequest(id, input) {
      const response = await client.post<Envelope<FinancialRequestData>>(
        `${base}/requests/${id}/approve`,
        input ?? {},
      );
      return response.data.data;
    },
    async rejectRequest(id, input) {
      const response = await client.post<Envelope<FinancialRequestData>>(
        `${base}/requests/${id}/reject`,
        input,
      );
      return response.data.data;
    },
    async holdRequest(id, input) {
      const response = await client.post<Envelope<FinancialRequestData>>(
        `${base}/requests/${id}/hold`,
        input ?? {},
      );
      return response.data.data;
    },
  };
}
