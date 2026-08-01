import type { CampaignActor } from '../dto';
import type { CampaignService } from '../services';

/** System actor used by scheduled (non-interactive) campaign runs. */
const SYSTEM_ACTOR: CampaignActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'campaign-scheduler',
  correlationId: null,
};

export interface CampaignScheduler {
  /** Executes a scheduled campaign run (issues rewards to enrolled members). */
  runCampaign(campaignId: string): Promise<void>;
}

/**
 * Scheduled processing hook for campaigns. Designed to be invoked by the
 * platform job/scheduler infrastructure when a campaign's `next_run_at` is due.
 * The same execution logic backs `POST /campaigns/:id/execute` for on-demand
 * admin runs.
 */
export function createCampaignScheduler(service: CampaignService): CampaignScheduler {
  return {
    async runCampaign(campaignId: string): Promise<void> {
      await service.execute(campaignId, {}, SYSTEM_ACTOR);
    },
  };
}
