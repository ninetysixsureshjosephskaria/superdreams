import { ROLES } from '@/modules/rbac';
import type { RewardService } from '@/modules/rewards';

import { DEFAULT_PARTNER_REFERRAL_RATE_BPS, PARTNER_REFERRAL_RATE_SETTING_KEY } from './constants';
import type { PartnerReferralModuleDeps } from './index';

/**
 * The collaborators the referral wiring pulls the active-Partner check and the
 * configurable rate from — the RBAC authorization service and the Settings service.
 */
export interface PartnerReferralCollaborators {
  authorization: { hasRole(userId: string, roleKey: string): Promise<boolean> };
  settings: { getValue<T>(key: string): Promise<T | undefined> };
}

/**
 * Builds the partner-referral module dependencies from the live Rewards service
 * (its `awardPointsWithin` / `reverseWithin` seams), the RBAC `partner` role check,
 * and the Settings-backed rate. Reused by the Games, Campaigns, and Rewards
 * composition roots so all three share one wiring definition. The rate falls back
 * to the 500 bps (5%) default when the setting is unset or invalid.
 */
export function partnerReferralDeps(
  rewards: RewardService,
  collaborators: PartnerReferralCollaborators,
): Omit<PartnerReferralModuleDeps, 'events'> {
  return {
    rewardCredit: {
      awardPointsWithin: (tx, memberId, points, options) =>
        rewards.awardPointsWithin(tx, memberId, points, options),
    },
    rewardReverse: {
      reverseWithin: (tx, memberId, transactionId, actor) =>
        rewards.reverseWithin(tx, memberId, transactionId, actor),
    },
    roleChecker: {
      isPartner: (userId) => collaborators.authorization.hasRole(userId, ROLES.PARTNER),
    },
    rateProvider: {
      getRateBps: async () => {
        const value = await collaborators.settings.getValue<number>(
          PARTNER_REFERRAL_RATE_SETTING_KEY,
        );
        return typeof value === 'number' && Number.isFinite(value) && value >= 0
          ? Math.trunc(value)
          : DEFAULT_PARTNER_REFERRAL_RATE_BPS;
      },
    },
  };
}
