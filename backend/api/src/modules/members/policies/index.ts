import { ForbiddenError } from '@/errors';

/** The subset of a member needed for ownership checks. */
export interface MemberOwnership {
  userId: string | null;
}

/** True when the acting user is the member (owns the record). */
export function isMemberOwner(actingUserId: string, member: MemberOwnership): boolean {
  return member.userId !== null && member.userId === actingUserId;
}

/**
 * Ownership guard for member-portal (self-service) access. Admin access is
 * enforced separately by RBAC permissions on the route; this policy protects the
 * "members may only access their own data" rule.
 */
export function assertMemberOwner(actingUserId: string, member: MemberOwnership): void {
  if (!isMemberOwner(actingUserId, member)) {
    throw new ForbiddenError('You may only access your own member record.');
  }
}
