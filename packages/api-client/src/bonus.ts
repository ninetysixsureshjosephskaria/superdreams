import type { AxiosInstance } from 'axios';

/**
 * Bonus Campaigns configuration API (Phase 2E earnings module). Mirrors the
 * backend `/api/v1/bonus-campaigns` contract exactly. `rateBps` is basis points
 * (100 bps = 1%). Every route requires the `bonus.manage` permission.
 *
 * This client manages campaign **configuration** only. The eligible-campaign
 * selection and the bonus → tranche → TXN-B lifecycle are owned by the backend
 * engine (the idempotent `POST /apply` deposit hook is intentionally not exposed
 * here — it is an engine trigger, not an admin operation).
 */

export type BonusScope = 'FIRST_DEPOSIT' | 'ALL_DEPOSITS';
export type BonusFrequency = 'SINGLE' | 'MULTI';
export type BonusStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'DISABLED';

export interface BonusCampaignData {
  id: string;
  name: string;
  icon: string | null;
  scope: BonusScope;
  frequency: BonusFrequency;
  rateBps: number;
  lockDays: number;
  minUnits: number;
  permanent: boolean;
  startAt: string | null;
  endAt: string | null;
  enabled: boolean;
  status: BonusStatus;
  createdAt: string;
}

export interface CreateBonusCampaignInput {
  name: string;
  scope: BonusScope;
  frequency: BonusFrequency;
  rateBps: number;
  icon?: string;
  lockDays?: number;
  minUnits?: number;
  permanent?: boolean;
  startAt?: string;
  endAt?: string;
  enabled?: boolean;
}

export interface UpdateBonusCampaignInput {
  name?: string;
  icon?: string | null;
  scope?: BonusScope;
  frequency?: BonusFrequency;
  rateBps?: number;
  lockDays?: number;
  minUnits?: number;
  permanent?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  enabled?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface BonusApi {
  list(): Promise<BonusCampaignData[]>;
  get(id: string): Promise<BonusCampaignData>;
  create(input: CreateBonusCampaignInput): Promise<BonusCampaignData>;
  update(id: string, input: UpdateBonusCampaignInput): Promise<BonusCampaignData>;
  remove(id: string): Promise<{ id: string; deleted: boolean }>;
}

/** Binds the bonus-campaigns resource to a configured API client. */
export function createBonusApi(client: AxiosInstance): BonusApi {
  const base = '/api/v1/bonus-campaigns';
  return {
    async list() {
      const response = await client.get<ItemsEnvelope<BonusCampaignData>>(base);
      return response.data.data.items;
    },
    async get(id) {
      const response = await client.get<Envelope<BonusCampaignData>>(`${base}/${id}`);
      return response.data.data;
    },
    async create(input) {
      const response = await client.post<Envelope<BonusCampaignData>>(base, input);
      return response.data.data;
    },
    async update(id, input) {
      const response = await client.put<Envelope<BonusCampaignData>>(`${base}/${id}`, input);
      return response.data.data;
    },
    async remove(id) {
      const response = await client.delete<Envelope<{ id: string; deleted: boolean }>>(
        `${base}/${id}`,
      );
      return response.data.data;
    },
  };
}
