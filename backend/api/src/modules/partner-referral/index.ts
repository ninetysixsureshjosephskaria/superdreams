import type { Database } from '@/database';

import { PartnerReferralEventBus } from './events';
import {
  PartnerReferralAuditRepository,
  PartnerReferralEarningRepository,
  ReferralMemberLookupRepository,
} from './repositories';
import {
  PartnerReferralService,
  type PartnerRoleCheckerPort,
  type ReferralRateProviderPort,
  type RewardCreditPort,
  type RewardReversePort,
} from './services';

export interface PartnerReferralModule {
  events: PartnerReferralEventBus;
  service: PartnerReferralService;
  repositories: { earnings: PartnerReferralEarningRepository };
}

export interface PartnerReferralModuleDeps {
  rewardCredit: RewardCreditPort;
  rewardReverse: RewardReversePort;
  roleChecker: PartnerRoleCheckerPort;
  rateProvider: ReferralRateProviderPort;
  events?: PartnerReferralEventBus;
}

/**
 * Composition root for the Partner Referral earning engine (P3). It depends only
 * on interfaces (Rewards credit/reverse seams, the RBAC partner-role check, and the
 * Settings-backed rate provider), satisfied by the application wiring in a later
 * milestone. This module owns no HTTP routes — it is invoked in-process by the
 * Games/Campaign earning paths and the Rewards reversal path.
 */
export function createPartnerReferralModule(
  db: Database,
  deps: PartnerReferralModuleDeps,
): PartnerReferralModule {
  const events = deps.events ?? new PartnerReferralEventBus();
  const earnings = new PartnerReferralEarningRepository(db);
  const members = new ReferralMemberLookupRepository(db);
  const audit = new PartnerReferralAuditRepository();

  const service = new PartnerReferralService(
    earnings,
    members,
    audit,
    deps.rewardCredit,
    deps.rewardReverse,
    deps.roleChecker,
    deps.rateProvider,
  );

  return { events, service, repositories: { earnings } };
}

export { PartnerReferralEventBus } from './events';
export type {
  PartnerReferralEvent,
  PartnerReferralEventType,
  PartnerReferralEventHandler,
} from './events';
export { PartnerReferralService, computePartnerPoints } from './services';
export type {
  PartnerRoleCheckerPort,
  ReferralRateProviderPort,
  RewardCreditPort,
  RewardReversePort,
} from './services';
export type { ReferralActor, ResolvedPartner } from './dto';
export type { PartnerReferralEarningRow } from './repositories';
export { PARTNER_REFERRAL_RATE_SETTING_KEY, DEFAULT_PARTNER_REFERRAL_RATE_BPS } from './constants';
export { partnerReferralDeps } from './wiring';
export type { PartnerReferralCollaborators } from './wiring';
