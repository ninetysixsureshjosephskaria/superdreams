import type { AxiosInstance } from 'axios';

/**
 * Daily Profit configuration & distribution API (Phase 2E earnings module).
 * Mirrors the backend `/api/v1/profit` contract exactly. Rates are basis points
 * (100 bps = 1%; monthly targets may exceed 100% across a month's days); amounts
 * are integer USD cents. Schedule routes require `profit.schedule`; distribution
 * and history require `profit.distribute`.
 *
 * All profit maths — daily spreads, per-member eligibility, credited amounts — is
 * computed and applied by the backend ProfitService. This client only plans,
 * publishes, triggers an idempotent per-day distribution, and reads results.
 */

export type ProfitScheduleStatus = 'DRAFT' | 'PUBLISHED';

export interface ProfitScheduleDayData {
  day: string;
  memberBps: number;
  partnerBps: number;
  distributeAt: string | null;
  off: boolean;
}

export interface ProfitScheduleData {
  month: string;
  status: ProfitScheduleStatus;
  memberMonthlyBps: number;
  partnerMonthlyBps: number;
  publishedAt: string | null;
  days: ProfitScheduleDayData[];
}

export interface ProfitDistributionData {
  day: string;
  reference: string;
  memberBps: number;
  partnerBps: number;
  memberAmountCents: number;
  partnerAmountCents: number;
  membersCredited: number;
  partnersCredited: number;
}

export interface PlanScheduleInput {
  month: string;
  memberMonthlyBps: number;
  partnerMonthlyBps: number;
}

export interface SetScheduleDayInput {
  day: string;
  memberBps?: number;
  partnerBps?: number;
  off?: boolean;
}

export interface PublishScheduleInput {
  month: string;
}

export interface DistributeProfitInput {
  day: string;
  memberBps?: number;
  partnerBps?: number;
}

export interface ProfitHistoryParams {
  from: string;
  to: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface ProfitApi {
  getSchedule(month: string): Promise<ProfitScheduleData>;
  planSchedule(input: PlanScheduleInput): Promise<ProfitScheduleData>;
  setScheduleDay(input: SetScheduleDayInput): Promise<ProfitScheduleData>;
  publishSchedule(input: PublishScheduleInput): Promise<ProfitScheduleData>;
  distribute(input: DistributeProfitInput): Promise<ProfitDistributionData>;
  listHistory(params: ProfitHistoryParams): Promise<ProfitDistributionData[]>;
}

/** Binds the daily-profit resource to a configured API client. */
export function createProfitApi(client: AxiosInstance): ProfitApi {
  const base = '/api/v1/profit';
  return {
    async getSchedule(month) {
      const response = await client.get<Envelope<ProfitScheduleData>>(`${base}/schedule/${month}`);
      return response.data.data;
    },
    async planSchedule(input) {
      const response = await client.post<Envelope<ProfitScheduleData>>(
        `${base}/schedule/plan`,
        input,
      );
      return response.data.data;
    },
    async setScheduleDay(input) {
      const response = await client.post<Envelope<ProfitScheduleData>>(
        `${base}/schedule/day`,
        input,
      );
      return response.data.data;
    },
    async publishSchedule(input) {
      const response = await client.post<Envelope<ProfitScheduleData>>(
        `${base}/schedule/publish`,
        input,
      );
      return response.data.data;
    },
    async distribute(input) {
      const response = await client.post<Envelope<ProfitDistributionData>>(
        `${base}/distribute`,
        input,
      );
      return response.data.data;
    },
    async listHistory(params) {
      const response = await client.get<ItemsEnvelope<ProfitDistributionData>>(`${base}/history`, {
        params,
      });
      return response.data.data.items;
    },
  };
}
