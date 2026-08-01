import type { CampaignRuleType, CampaignStatus, MemberStatus } from '../dto';

/**
 * Pure campaign domain logic — framework-independent. Contains the lifecycle
 * state machine and the eligibility evaluator; both are used by the service and
 * covered by unit tests.
 */

/** Permitted campaign status transitions (the DNA lifecycle state machine). */
export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, readonly CampaignStatus[]> = {
  DRAFT: ['SCHEDULED', 'ACTIVE', 'ARCHIVED'],
  SCHEDULED: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['PAUSED', 'COMPLETED'],
  PAUSED: ['ACTIVE', 'COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

/** True when `to` is a permitted transition from `from`. */
export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return CAMPAIGN_TRANSITIONS[from].includes(to);
}

/** An eligibility rule as evaluated by the engine. */
export interface EligibilityRule {
  type: CampaignRuleType;
  value: string | null;
  isActive: boolean;
}

/** The member facts the eligibility engine reasons over. */
export interface MemberContext {
  status: MemberStatus;
  joinedAt: Date;
}

export interface EligibilityResult {
  eligible: boolean;
  failed: CampaignRuleType[];
}

/**
 * Evaluates a member against a campaign's active eligibility rules (AND-combined).
 *
 * - `MEMBER_STATUS` — the member's status must equal the rule value.
 * - `JOIN_DATE_AFTER` / `JOIN_DATE_BEFORE` — bounds on the member's join date.
 * - `REWARD_ELIGIBILITY` / `SEGMENT` — reserved extension points; treated as
 *   satisfied here (documented) rather than inventing business rules.
 */
export function evaluateEligibility(
  rules: readonly EligibilityRule[],
  member: MemberContext,
): EligibilityResult {
  const failed: CampaignRuleType[] = [];

  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }
    switch (rule.type) {
      case 'MEMBER_STATUS':
        if (rule.value && member.status !== rule.value) {
          failed.push(rule.type);
        }
        break;
      case 'JOIN_DATE_AFTER':
        if (rule.value && member.joinedAt.getTime() < new Date(rule.value).getTime()) {
          failed.push(rule.type);
        }
        break;
      case 'JOIN_DATE_BEFORE':
        if (rule.value && member.joinedAt.getTime() > new Date(rule.value).getTime()) {
          failed.push(rule.type);
        }
        break;
      case 'REWARD_ELIGIBILITY':
      case 'SEGMENT':
        // Reserved extension points — satisfied by default.
        break;
    }
  }

  return { eligible: failed.length === 0, failed };
}
