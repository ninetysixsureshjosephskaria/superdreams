/**
 * Bonus-campaign maths + status/selection (Phase 2E) — pure, deterministic,
 * unit-tested. Reference (`bonus.html`): percentage bonus (bps) on eligible
 * deposits, first/all scope, single/multi claim frequency, min-unit eligibility,
 * lock days, permanent-or-dated with SCHEDULED / LIVE / ENDED status.
 */

export type BonusStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'DISABLED';

export interface CampaignWindow {
  id: string;
  rateBps: number;
  enabled: boolean;
  permanent: boolean;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
}

/** Derives a campaign's status at instant `now`. */
export function deriveStatus(campaign: CampaignWindow, now: Date): BonusStatus {
  if (!campaign.enabled) {
    return 'DISABLED';
  }
  if (campaign.startAt && now.getTime() < campaign.startAt.getTime()) {
    return 'SCHEDULED';
  }
  if (!campaign.permanent && campaign.endAt && now.getTime() > campaign.endAt.getTime()) {
    return 'ENDED';
  }
  return 'LIVE';
}

export function isLive(campaign: CampaignWindow, now: Date): boolean {
  return deriveStatus(campaign, now) === 'LIVE';
}

/**
 * Deterministically selects one campaign from eligible candidates: the highest
 * rate wins; ties break by earliest creation then id. NOTE: the reference says
 * "the eligible campaign" (singular) but does not define precedence when several
 * are live — this highest-rate rule is our documented, deterministic choice
 * (flagged unresolved), never a silent guess.
 */
export function selectCampaign<T extends CampaignWindow>(eligible: readonly T[]): T | null {
  if (eligible.length === 0) {
    return null;
  }
  return [...eligible].sort((a, b) => {
    if (b.rateBps !== a.rateBps) {
      return b.rateBps - a.rateBps;
    }
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return a.id < b.id ? -1 : 1;
  })[0]!;
}

/** Bonus on a principal (cents) at a bps rate, rounded to whole cents. */
export function bonusCents(principalCents: number, rateBps: number): number {
  if (principalCents <= 0 || rateBps <= 0) {
    return 0;
  }
  return Math.round((principalCents * rateBps) / 10_000);
}
