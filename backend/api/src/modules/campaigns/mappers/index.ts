import type { InferSelectModel } from 'drizzle-orm';

import type {
  campaignExecutions,
  campaignHistory,
  campaignMemberStatuses,
  campaignRewards,
  campaignRules,
  campaignSchedules,
  campaigns,
} from '@/database/schema';

import type {
  CampaignDetail,
  CampaignEnrollmentData,
  CampaignEnrollmentStats,
  CampaignExecutionData,
  CampaignHistoryData,
  CampaignRewardData,
  CampaignRuleData,
  CampaignScheduleData,
  CampaignSummary,
} from '../dto';

export type CampaignRow = InferSelectModel<typeof campaigns>;
export type CampaignRuleRow = InferSelectModel<typeof campaignRules>;
export type CampaignRewardRow = InferSelectModel<typeof campaignRewards>;
export type CampaignScheduleRow = InferSelectModel<typeof campaignSchedules>;
export type CampaignEnrollmentRow = InferSelectModel<typeof campaignMemberStatuses>;
export type CampaignHistoryRow = InferSelectModel<typeof campaignHistory>;
export type CampaignExecutionRow = InferSelectModel<typeof campaignExecutions>;

export function toCampaignRule(row: CampaignRuleRow): CampaignRuleData {
  return { id: row.id, type: row.type, value: row.value, isActive: row.isActive };
}

export function toCampaignReward(row: CampaignRewardRow | null): CampaignRewardData | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    rewardProgramId: row.rewardProgramId,
    points: row.points,
    description: row.description,
  };
}

export function toCampaignSchedule(row: CampaignScheduleRow | null): CampaignScheduleData | null {
  if (!row) {
    return null;
  }
  return {
    scheduleType: row.scheduleType,
    startAt: row.startAt,
    endAt: row.endAt,
    recurrenceCron: row.recurrenceCron,
    timezone: row.timezone,
    nextRunAt: row.nextRunAt,
  };
}

export function toCampaignSummary(row: CampaignRow): CampaignSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    audienceType: row.audienceType,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toCampaignDetail(
  campaign: CampaignRow,
  rules: CampaignRuleRow[],
  reward: CampaignRewardRow | null,
  schedule: CampaignScheduleRow | null,
  enrollment: CampaignEnrollmentStats,
): CampaignDetail {
  return {
    ...toCampaignSummary(campaign),
    rules: rules.map(toCampaignRule),
    reward: toCampaignReward(reward),
    schedule: toCampaignSchedule(schedule),
    enrollment,
  };
}

export function toCampaignEnrollment(row: CampaignEnrollmentRow): CampaignEnrollmentData {
  return {
    id: row.id,
    campaignId: row.campaignId,
    memberId: row.memberId,
    status: row.status,
    enrolledAt: row.enrolledAt,
    rewardedAt: row.rewardedAt,
    rewardTransactionId: row.rewardTransactionId,
    createdAt: row.createdAt,
  };
}

export function toCampaignHistory(row: CampaignHistoryRow): CampaignHistoryData {
  return {
    id: row.id,
    action: row.action,
    description: row.description,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}

export function toCampaignExecution(row: CampaignExecutionRow): CampaignExecutionData {
  return {
    id: row.id,
    campaignId: row.campaignId,
    status: row.status,
    membersTargeted: row.membersTargeted,
    rewardsIssued: row.rewardsIssued,
    pointsIssued: row.pointsIssued,
    error: row.error,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}
