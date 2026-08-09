import type { AxiosInstance } from 'axios';

/**
 * Commission & referral configuration API (Phase 2E earnings module). Mirrors the
 * backend `/api/v1/commission` contract exactly. Rates are basis points
 * (100 bps = 1%). Every route requires the `commission.manage` permission.
 *
 * The admin surface configures the one-time member-referral rate, the default
 * commission tier table (matched by a partner's total network units) and any
 * date-ranged commission targets that override the defaults. Crediting formulas
 * live entirely in the backend — this client only reads and writes config.
 */

export interface CommissionTierData {
  id: string;
  fromUnits: number;
  toUnits: number | null;
  rateBps: number;
}

export interface CommissionTargetData {
  id: string;
  startDate: string;
  endDate: string;
  tiers: CommissionTierData[];
}

export interface CommissionConfigView {
  referralRateBps: number;
  defaultTiers: CommissionTierData[];
  targets: CommissionTargetData[];
}

/** A tier as sent to the backend (server assigns the id). */
export interface CommissionTierInput {
  fromUnits: number;
  toUnits?: number | null;
  rateBps: number;
}

export interface UpdateReferralRateInput {
  rateBps: number;
}

export interface SetDefaultTiersInput {
  tiers: CommissionTierInput[];
}

export interface CreateCommissionTargetInput {
  startDate: string;
  endDate: string;
  tiers: CommissionTierInput[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface CommissionApi {
  getConfig(): Promise<CommissionConfigView>;
  updateReferralRate(input: UpdateReferralRateInput): Promise<CommissionConfigView>;
  setDefaultTiers(input: SetDefaultTiersInput): Promise<CommissionConfigView>;
  createTarget(input: CreateCommissionTargetInput): Promise<CommissionTargetData>;
  deleteTarget(id: string): Promise<{ id: string; deleted: boolean }>;
}

/** Binds the commission-config resource to a configured API client. */
export function createCommissionApi(client: AxiosInstance): CommissionApi {
  const base = '/api/v1/commission';
  return {
    async getConfig() {
      const response = await client.get<Envelope<CommissionConfigView>>(base);
      return response.data.data;
    },
    async updateReferralRate(input) {
      const response = await client.put<Envelope<CommissionConfigView>>(
        `${base}/referral-rate`,
        input,
      );
      return response.data.data;
    },
    async setDefaultTiers(input) {
      const response = await client.put<Envelope<CommissionConfigView>>(
        `${base}/default-tiers`,
        input,
      );
      return response.data.data;
    },
    async createTarget(input) {
      const response = await client.post<Envelope<CommissionTargetData>>(`${base}/targets`, input);
      return response.data.data;
    },
    async deleteTarget(id) {
      const response = await client.delete<Envelope<{ id: string; deleted: boolean }>>(
        `${base}/targets/${id}`,
      );
      return response.data.data;
    },
  };
}
