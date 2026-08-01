import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  addTargetsSchema,
  changeCampaignStatusSchema,
  createCampaignSchema,
  executeCampaignSchema,
  listCampaignsQuerySchema,
  listEnrollmentsQuerySchema,
  scheduleCampaignSchema,
  updateCampaignSchema,
} from '../validators';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CampaignType = 'PROMOTIONAL' | 'REWARD' | 'REFERRAL' | 'SEASONAL' | 'ENGAGEMENT';
export type CampaignAudienceType = 'ALL_MEMBERS' | 'SEGMENT' | 'MANUAL' | 'STATUS' | 'JOIN_DATE';
export type CampaignRuleType =
  'MEMBER_STATUS' | 'JOIN_DATE_AFTER' | 'JOIN_DATE_BEFORE' | 'REWARD_ELIGIBILITY' | 'SEGMENT';
export type CampaignScheduleType = 'IMMEDIATE' | 'SCHEDULED' | 'RECURRING';
export type CampaignMemberStatus = 'ELIGIBLE' | 'ENROLLED' | 'REWARDED' | 'EXCLUDED';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/** A subset of member statuses used by the eligibility engine. */
export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED';

export interface CampaignRuleData {
  id: string;
  type: CampaignRuleType;
  value: string | null;
  isActive: boolean;
}

export interface CampaignRewardData {
  id: string;
  rewardProgramId: string | null;
  points: number;
  description: string | null;
}

export interface CampaignScheduleData {
  scheduleType: CampaignScheduleType;
  startAt: Date | null;
  endAt: Date | null;
  recurrenceCron: string | null;
  timezone: string | null;
  nextRunAt: Date | null;
}

export interface CampaignEnrollmentStats {
  eligible: number;
  enrolled: number;
  rewarded: number;
  excluded: number;
  total: number;
}

export interface CampaignSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  audienceType: CampaignAudienceType;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignDetail extends CampaignSummary {
  rules: CampaignRuleData[];
  reward: CampaignRewardData | null;
  schedule: CampaignScheduleData | null;
  enrollment: CampaignEnrollmentStats;
}

export interface CampaignEnrollmentData {
  id: string;
  campaignId: string;
  memberId: string;
  status: CampaignMemberStatus;
  enrolledAt: Date | null;
  rewardedAt: Date | null;
  rewardTransactionId: string | null;
  createdAt: Date;
}

export interface CampaignHistoryData {
  id: string;
  action: string;
  description: string | null;
  actorId: string | null;
  createdAt: Date;
}

export interface CampaignExecutionData {
  id: string;
  campaignId: string;
  status: ExecutionStatus;
  membersTargeted: number;
  rewardsIssued: number;
  pointsIssued: number;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

/** A member-facing view of a campaign (portal). */
export interface MemberCampaignView extends CampaignSummary {
  reward: CampaignRewardData | null;
  participation: CampaignMemberStatus | null;
  eligible: boolean;
}

export type PaginatedCampaigns = PaginatedResult<CampaignSummary>;
export type PaginatedEnrollments = PaginatedResult<CampaignEnrollmentData>;

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ChangeCampaignStatusInput = z.infer<typeof changeCampaignStatusSchema>;
export type ScheduleCampaignInput = z.infer<typeof scheduleCampaignSchema>;
export type AddTargetsInput = z.infer<typeof addTargetsSchema>;
export type ExecuteCampaignInput = z.infer<typeof executeCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;

/** Actor + request context for auditing and authorship. */
export interface CampaignActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
