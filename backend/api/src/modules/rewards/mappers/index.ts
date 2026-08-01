import type { InferSelectModel } from 'drizzle-orm';

import type {
  memberRewards,
  rewardExpiryRules,
  rewardPrograms,
  rewardRedemptions,
  rewardRules,
  rewardTransactions,
} from '@/database/schema';

import type {
  MemberRewardBalance,
  RewardExpiryRuleData,
  RewardProgramDetail,
  RewardProgramSummary,
  RewardRedemptionData,
  RewardRuleData,
  RewardTransactionData,
} from '../dto';

export type RewardProgramRow = InferSelectModel<typeof rewardPrograms>;
export type RewardRuleRow = InferSelectModel<typeof rewardRules>;
export type RewardExpiryRuleRow = InferSelectModel<typeof rewardExpiryRules>;
export type MemberRewardRow = InferSelectModel<typeof memberRewards>;
export type RewardTransactionRow = InferSelectModel<typeof rewardTransactions>;
export type RewardRedemptionRow = InferSelectModel<typeof rewardRedemptions>;

export function toRewardRule(row: RewardRuleRow): RewardRuleData {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    points: row.points,
    rateBasisPoints: row.rateBasisPoints,
    priority: row.priority,
    isActive: row.isActive,
  };
}

export function toRewardExpiryRule(row: RewardExpiryRuleRow | null): RewardExpiryRuleData | null {
  if (!row) {
    return null;
  }
  return {
    policy: row.policy,
    fixedDate: row.fixedDate ? row.fixedDate.toISOString() : null,
    rollingDays: row.rollingDays,
  };
}

export function toRewardProgramSummary(
  program: RewardProgramRow,
  categoryCode: string | null,
): RewardProgramSummary {
  return {
    id: program.id,
    code: program.code,
    name: program.name,
    description: program.description,
    type: program.type,
    categoryCode,
    status: program.status,
    startsAt: program.startsAt,
    endsAt: program.endsAt,
    pointsPerUnit: program.pointsPerUnit,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export function toRewardProgramDetail(
  program: RewardProgramRow,
  categoryCode: string | null,
  rules: RewardRuleRow[],
  expiry: RewardExpiryRuleRow | null,
): RewardProgramDetail {
  return {
    ...toRewardProgramSummary(program, categoryCode),
    rules: rules.map(toRewardRule),
    expiry: toRewardExpiryRule(expiry),
  };
}

export function toMemberRewardBalance(row: MemberRewardRow): MemberRewardBalance {
  return {
    memberId: row.memberId,
    pointsBalance: row.pointsBalance,
    lifetimeEarned: row.lifetimeEarned,
    lifetimeRedeemed: row.lifetimeRedeemed,
  };
}

export function toRewardTransaction(row: RewardTransactionRow): RewardTransactionData {
  return {
    id: row.id,
    memberId: row.memberId,
    programId: row.programId,
    ruleId: row.ruleId,
    reference: row.reference,
    type: row.type,
    direction: row.direction,
    status: row.status,
    points: row.points,
    balanceAfter: row.balanceAfter,
    description: row.description,
    redemptionId: row.redemptionId,
    reversalOfId: row.reversalOfId,
    expiresAt: row.expiresAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function toRewardRedemption(row: RewardRedemptionRow): RewardRedemptionData {
  return {
    id: row.id,
    memberId: row.memberId,
    transactionId: row.transactionId,
    reference: row.reference,
    points: row.points,
    status: row.status,
    note: row.note,
    walletTransactionId: row.walletTransactionId,
    createdAt: row.createdAt,
  };
}
