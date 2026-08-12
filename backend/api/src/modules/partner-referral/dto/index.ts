/**
 * Partner Referral (P3) DTOs. Points-only; this module never touches money.
 */

/** Actor + request context for authorship/audit (mirrors the Rewards actor). */
export interface ReferralActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

/**
 * A resolved, eligible direct Partner for an earning member — the pre-transaction
 * result of {@link PartnerReferralService.resolveEarner}. `null` (not this shape)
 * means "no partner referral applies". `rateBps` is captured here so the exact
 * rate in force at resolution time is the one applied and recorded.
 */
export interface ResolvedPartner {
  partnerMemberId: string;
  partnerUserId: string;
  rateBps: number;
}

/** Inputs to record a partner referral earning (all captured on the row). */
export interface CreateReferralEarningInput {
  sourceTransactionId: string;
  earnerMemberId: string;
  partnerMemberId: string;
  partnerTransactionId: string;
  rateBps: number;
  sourcePoints: number;
  partnerPoints: number;
  createdBy: string | null;
}
