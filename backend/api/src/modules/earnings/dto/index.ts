export interface EarningsActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

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

export interface ProfitScheduleDayView {
  day: string;
  memberBps: number;
  partnerBps: number;
  distributeAt: string | null;
  off: boolean;
}

export interface ProfitScheduleView {
  month: string;
  status: 'DRAFT' | 'PUBLISHED';
  memberMonthlyBps: number;
  partnerMonthlyBps: number;
  publishedAt: string | null;
  days: ProfitScheduleDayView[];
}

export interface ProfitDistributionResult {
  day: string;
  reference: string;
  memberBps: number;
  partnerBps: number;
  memberAmountCents: number;
  partnerAmountCents: number;
  membersCredited: number;
  partnersCredited: number;
}

export type BonusScope = 'FIRST_DEPOSIT' | 'ALL_DEPOSITS';
export type BonusFrequency = 'SINGLE' | 'MULTI';
export type BonusStatusValue = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'DISABLED';

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
  status: BonusStatusValue;
  createdAt: string;
}

export interface BonusApplicationResult {
  applied: boolean;
  campaignId: string | null;
  trancheId: string | null;
  bonusCents: number;
  rateBps: number;
}

export type ActivationRewardType = 'PERCENT' | 'FIXED';

export interface ActivationConfigData {
  enabled: boolean;
  rewardType: ActivationRewardType;
  value: number;
  lockDays: number;
}

export interface ActivationGrantResult {
  granted: boolean;
  memberId: string;
  amountCents: number;
  transactionId: string | null;
}

/** Result of processing a member deposit's partner earnings. */
export interface DepositEarningsResult {
  commission: {
    beneficiaryMemberId: string;
    amountCents: number;
    rateBps: number;
    networkUnits: number;
    transactionId: string;
  } | null;
  referral: {
    beneficiaryMemberId: string;
    amountCents: number;
    rateBps: number;
    transactionId: string;
  } | null;
}
