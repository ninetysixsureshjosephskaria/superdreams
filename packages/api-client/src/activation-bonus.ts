import type { AxiosInstance } from 'axios';

/**
 * Activation Bonus configuration API (Phase 2E earnings module). Mirrors the
 * backend `/api/v1/activation-bonus` contract exactly. A single network-wide
 * config; the qualifying trigger (a member adding 2 members within 24h) is fixed
 * backend logic and is not configurable. Every route requires the
 * `activation.bonus.manage` permission.
 *
 * `value` is basis points when `rewardType` is PERCENT (100 bps = 1% of balance)
 * or integer USD cents when FIXED. The bonus → TXN-A credit lifecycle is owned by
 * the backend; `processAll` re-runs the idempotent qualification sweep (it credits
 * only members who genuinely qualify — the per-member `POST /process` engine hook
 * is intentionally not exposed here).
 */

export type ActivationRewardType = 'PERCENT' | 'FIXED';

export interface ActivationConfigData {
  enabled: boolean;
  rewardType: ActivationRewardType;
  value: number;
  lockDays: number;
}

export interface UpdateActivationConfigInput {
  enabled?: boolean;
  rewardType?: ActivationRewardType;
  value?: number;
  lockDays?: number;
}

export interface ActivationSweepResult {
  granted: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface ActivationBonusApi {
  getConfig(): Promise<ActivationConfigData>;
  updateConfig(input: UpdateActivationConfigInput): Promise<ActivationConfigData>;
  runSweep(): Promise<ActivationSweepResult>;
}

/** Binds the activation-bonus resource to a configured API client. */
export function createActivationBonusApi(client: AxiosInstance): ActivationBonusApi {
  const base = '/api/v1/activation-bonus';
  return {
    async getConfig() {
      const response = await client.get<Envelope<ActivationConfigData>>(base);
      return response.data.data;
    },
    async updateConfig(input) {
      const response = await client.put<Envelope<ActivationConfigData>>(base, input);
      return response.data.data;
    },
    async runSweep() {
      const response = await client.post<Envelope<ActivationSweepResult>>(`${base}/process-all`);
      return response.data.data;
    },
  };
}
