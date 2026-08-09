/** Roles a network invite can provision. */
export type InviteRoleType = 'PARTNER' | 'MEMBER';

/** Invite lifecycle status. */
export type InviteStatusType = 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';

/** Who performed a network operation, for audit attribution. */
export interface NetworkActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

/** An invite as returned to admin API clients (includes the shareable code). */
export interface InviteData {
  id: string;
  code: string;
  role: InviteRoleType;
  status: InviteStatusType;
  assignedAdminId: string | null;
  assignedPartnerId: string | null;
  invitedByUserId: string | null;
  expiresAt: string | null;
  usedByUserId: string | null;
  usedByMemberId: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Minimal, non-sensitive invite info for the public join page (by code). */
export interface InvitePreview {
  role: InviteRoleType;
  status: InviteStatusType;
  valid: boolean;
}

export interface PaginatedInvites {
  items: InviteData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A member node in a downline/referral list (non-sensitive fields only). */
export interface NetworkMemberNode {
  memberId: string;
  memberNumber: string;
  name: string;
  referredBy: string | null;
  partnerId: string | null;
  directReferralCount: number;
  depth: number;
}

/** A member's own referral summary. */
export interface ReferralSummary {
  memberId: string;
  memberNumber: string;
  referredBy: string | null;
  partnerId: string | null;
  directReferralCount: number;
  totalDownlineCount: number;
}

/** A partner card in the admin network tree. */
export interface PartnerNetworkSummary {
  partnerMemberId: string;
  memberNumber: string;
  name: string;
  directMemberCount: number;
  totalNetworkCount: number;
}

/** Full member detail for the admin network view. */
export interface NetworkMemberDetail {
  memberId: string;
  memberNumber: string;
  name: string;
  email: string;
  status: string;
  referredBy: string | null;
  partnerId: string | null;
  directReferralCount: number;
  totalDownlineCount: number;
  /** Financial-wallet units (available cents ÷ 3000); 0 when no financial wallet. */
  units: number;
}
