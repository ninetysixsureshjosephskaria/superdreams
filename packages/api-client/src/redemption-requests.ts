import type { AxiosInstance } from 'axios';

/**
 * Redemption-requests API resource (P2) — the shared HTTP contract for the member
 * points-redemption request/approval workflow. Mirrors the backend
 * `redemption-requests` module DTOs exactly (no invented shapes). Points are
 * integers; no money is involved. Submission derives the member from the token;
 * the debit happens only on admin approval.
 */

export type RedemptionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** A member points-redemption request as returned by the API. */
export interface RedemptionRequestData {
  id: string;
  memberId: string;
  pointsRequested: number;
  status: RedemptionRequestStatus;
  note: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Paginated redemption requests (admin approval queue). */
export interface PaginatedRedemptionRequests {
  items: RedemptionRequestData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Body for `POST /redemption-requests` — points to redeem + an optional note. */
export interface SubmitRedemptionRequestInput {
  pointsRequested: number;
  note?: string;
}

/** Query for the admin approval queue (`GET /redemption-requests`). */
export interface ListRedemptionRequestsParams {
  page?: number;
  pageSize?: number;
  status?: RedemptionRequestStatus;
  order?: 'asc' | 'desc';
}

/** Body for a reject decision (reason optional). */
export interface RedemptionRejectInput {
  reason?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface RedemptionRequestsApi {
  /** Submits a redemption request (PENDING until an admin approves — no points move now). */
  submit(input: SubmitRedemptionRequestInput): Promise<RedemptionRequestData>;
  /** The authenticated member's latest redemption request (or null when none). */
  getMine(): Promise<RedemptionRequestData | null>;
  // --- Admin approval queue (requires redemption.request.read) ---------------
  /** Lists redemption requests for the admin approval queue. */
  list(params?: ListRedemptionRequestsParams): Promise<PaginatedRedemptionRequests>;
  /** Fetches a single request by id. */
  get(id: string): Promise<RedemptionRequestData>;
  /** Approves a request — debits the points transactionally (requires redemption.request.approve). */
  approve(id: string): Promise<RedemptionRequestData>;
  /** Rejects a request — no points move (requires redemption.request.reject). */
  reject(id: string, input?: RedemptionRejectInput): Promise<RedemptionRequestData>;
}

/** Binds the redemption-requests resource to a configured API client. */
export function createRedemptionRequestsApi(client: AxiosInstance): RedemptionRequestsApi {
  const base = '/api/v1/redemption-requests';
  return {
    async submit(input) {
      const response = await client.post<Envelope<RedemptionRequestData>>(base, input);
      return response.data.data;
    },
    async getMine() {
      const response = await client.get<Envelope<RedemptionRequestData | null>>(`${base}/me`);
      return response.data.data;
    },
    async list(params) {
      const response = await client.get<Envelope<PaginatedRedemptionRequests>>(base, { params });
      return response.data.data;
    },
    async get(id) {
      const response = await client.get<Envelope<RedemptionRequestData>>(`${base}/${id}`);
      return response.data.data;
    },
    async approve(id) {
      const response = await client.post<Envelope<RedemptionRequestData>>(`${base}/${id}/approve`);
      return response.data.data;
    },
    async reject(id, input) {
      const response = await client.post<Envelope<RedemptionRequestData>>(
        `${base}/${id}/reject`,
        input ?? {},
      );
      return response.data.data;
    },
  };
}
