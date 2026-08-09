import type { AxiosInstance } from 'axios';

/**
 * Wallet Management API resource — the single, shared definition of the wallet
 * HTTP contract used by every application (no duplicated API logic). Monetary
 * amounts are integer minor units; JSON dates are strings over the wire.
 */

export type WalletStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
/** LOYALTY = points wallet; FINANCIAL = units wallet (1 unit = $30 = 3000 cents). */
export type WalletKind = 'LOYALTY' | 'FINANCIAL';
export type TransactionType = 'CREDIT' | 'DEBIT' | 'ADJUSTMENT' | 'HOLD' | 'RELEASE' | 'REVERSAL';
export type TransactionDirection = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'POSTED' | 'REVERSED';
export type HoldStatus = 'ACTIVE' | 'RELEASED';

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
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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
  releasedAt: string | null;
  createdAt: string;
}

export interface WalletStatementData {
  id: string;
  walletId: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number;
  totalCreditsMinor: number;
  totalDebitsMinor: number;
  transactionCount: number;
  generatedBy: string | null;
  createdAt: string;
}

export interface BalanceValidationResult {
  walletId: string;
  consistent: boolean;
  storedAvailableMinor: number;
  storedHeldMinor: number;
  derivedAvailableMinor: number;
  derivedHeldMinor: number;
}

export interface PaginatedWallets {
  items: WalletSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTransactions {
  items: WalletTransactionData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type WalletSortField = 'createdAt' | 'updatedAt' | 'openedAt' | 'status' | 'walletNumber';

export interface ListWalletsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WalletStatus;
  currencyCode?: string;
  sortBy?: WalletSortField;
  order?: 'asc' | 'desc';
}

export interface ListTransactionsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: TransactionType;
  direction?: TransactionDirection;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  sortBy?: 'createdAt' | 'amountMinor';
  order?: 'asc' | 'desc';
}

export interface WalletLimitInput {
  minBalanceMinor?: number;
  maxBalanceMinor?: number;
  dailyDebitLimitMinor?: number;
  singleTransactionLimitMinor?: number;
  allowNegative?: boolean;
}

export interface CreateWalletInput {
  memberId: string;
  currencyCode?: string;
  status?: WalletStatus;
  limits?: WalletLimitInput;
}

export interface ChangeWalletStatusInput {
  status: WalletStatus;
  reason?: string;
}

export interface AmountInput {
  amountMinor: number;
  reference?: string;
  description?: string;
}

export interface AdjustmentInput {
  direction: TransactionDirection;
  amountMinor: number;
  reason: string;
  reference?: string;
}

export interface HoldInput {
  amountMinor: number;
  reason?: string;
  reference?: string;
}

export interface GenerateStatementInput {
  periodStart?: string;
  periodEnd?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface WalletApi {
  list(params?: ListWalletsParams): Promise<PaginatedWallets>;
  get(id: string): Promise<WalletDetail>;
  getBalance(id: string): Promise<WalletBalanceData>;
  validateBalance(id: string): Promise<BalanceValidationResult>;
  listTransactions(id: string, params?: ListTransactionsParams): Promise<PaginatedTransactions>;
  listHolds(id: string): Promise<WalletHoldData[]>;
  listStatements(id: string): Promise<WalletStatementData[]>;
  create(input: CreateWalletInput): Promise<WalletDetail>;
  changeStatus(id: string, input: ChangeWalletStatusInput): Promise<WalletDetail>;
  credit(id: string, input: AmountInput): Promise<WalletTransactionData>;
  debit(id: string, input: AmountInput): Promise<WalletTransactionData>;
  adjust(id: string, input: AdjustmentInput): Promise<WalletTransactionData>;
  placeHold(id: string, input: HoldInput): Promise<WalletHoldData>;
  releaseHold(id: string, holdId: string): Promise<WalletHoldData>;
  reverse(id: string, transactionId: string): Promise<WalletTransactionData>;
  generateStatement(id: string, input?: GenerateStatementInput): Promise<WalletStatementData>;
  getMine(kind?: WalletKind): Promise<WalletDetail>;
  getMyBalance(kind?: WalletKind): Promise<WalletBalanceData>;
  listMyTransactions(
    params?: ListTransactionsParams,
    kind?: WalletKind,
  ): Promise<PaginatedTransactions>;
  listMyStatements(kind?: WalletKind): Promise<WalletStatementData[]>;
  listMyHolds(kind?: WalletKind): Promise<WalletHoldData[]>;
}

/** Binds the wallet resource to a configured API client. */
export function createWalletApi(client: AxiosInstance): WalletApi {
  const base = '/api/v1/wallets';
  return {
    async list(params) {
      const response = await client.get<Envelope<PaginatedWallets>>(base, { params });
      return response.data.data;
    },
    async get(id) {
      const response = await client.get<Envelope<WalletDetail>>(`${base}/${id}`);
      return response.data.data;
    },
    async getBalance(id) {
      const response = await client.get<Envelope<WalletBalanceData>>(`${base}/${id}/balance`);
      return response.data.data;
    },
    async validateBalance(id) {
      const response = await client.get<Envelope<BalanceValidationResult>>(
        `${base}/${id}/balance/validate`,
      );
      return response.data.data;
    },
    async listTransactions(id, params) {
      const response = await client.get<Envelope<PaginatedTransactions>>(
        `${base}/${id}/transactions`,
        { params },
      );
      return response.data.data;
    },
    async listHolds(id) {
      const response = await client.get<ItemsEnvelope<WalletHoldData>>(`${base}/${id}/holds`);
      return response.data.data.items;
    },
    async listStatements(id) {
      const response = await client.get<ItemsEnvelope<WalletStatementData>>(
        `${base}/${id}/statements`,
      );
      return response.data.data.items;
    },
    async create(input) {
      const response = await client.post<Envelope<WalletDetail>>(base, input);
      return response.data.data;
    },
    async changeStatus(id, input) {
      const response = await client.patch<Envelope<WalletDetail>>(`${base}/${id}/status`, input);
      return response.data.data;
    },
    async credit(id, input) {
      const response = await client.post<Envelope<WalletTransactionData>>(
        `${base}/${id}/credits`,
        input,
      );
      return response.data.data;
    },
    async debit(id, input) {
      const response = await client.post<Envelope<WalletTransactionData>>(
        `${base}/${id}/debits`,
        input,
      );
      return response.data.data;
    },
    async adjust(id, input) {
      const response = await client.post<Envelope<WalletTransactionData>>(
        `${base}/${id}/adjustments`,
        input,
      );
      return response.data.data;
    },
    async placeHold(id, input) {
      const response = await client.post<Envelope<WalletHoldData>>(`${base}/${id}/holds`, input);
      return response.data.data;
    },
    async releaseHold(id, holdId) {
      const response = await client.delete<Envelope<WalletHoldData>>(
        `${base}/${id}/holds/${holdId}`,
      );
      return response.data.data;
    },
    async reverse(id, transactionId) {
      const response = await client.post<Envelope<WalletTransactionData>>(
        `${base}/${id}/transactions/${transactionId}/reversal`,
      );
      return response.data.data;
    },
    async generateStatement(id, input) {
      const response = await client.post<Envelope<WalletStatementData>>(
        `${base}/${id}/statements`,
        input ?? {},
      );
      return response.data.data;
    },
    async getMine(kind) {
      const response = await client.get<Envelope<WalletDetail>>(`${base}/me`, { params: { kind } });
      return response.data.data;
    },
    async getMyBalance(kind) {
      const response = await client.get<Envelope<WalletBalanceData>>(`${base}/me/balance`, {
        params: { kind },
      });
      return response.data.data;
    },
    async listMyTransactions(params, kind) {
      const response = await client.get<Envelope<PaginatedTransactions>>(
        `${base}/me/transactions`,
        { params: { ...params, kind } },
      );
      return response.data.data;
    },
    async listMyStatements(kind) {
      const response = await client.get<ItemsEnvelope<WalletStatementData>>(
        `${base}/me/statements`,
        {
          params: { kind },
        },
      );
      return response.data.data.items;
    },
    async listMyHolds(kind) {
      const response = await client.get<ItemsEnvelope<WalletHoldData>>(`${base}/me/holds`, {
        params: { kind },
      });
      return response.data.data.items;
    },
  };
}
