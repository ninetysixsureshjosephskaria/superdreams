import { z } from 'zod';

import { NotFoundError } from '@/errors';
import type { IdentityModule, UserStatus } from '@/modules/identity';

import type { MemberActor } from '../dto';
import type { MemberRepository } from '../repositories';
import type { AuditRepository } from '../repositories/audit.repository';

/**
 * Admin changes to the AUTHENTICATION account (login access) behind a member.
 * Deliberately excludes PENDING (a verified account never returns to pending)
 * and is kept separate from the member-profile status so the two can never be
 * confused (D5). Suspend/Deactivate here block login server-side (D7).
 */
export const changeAccountStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DEACTIVATED']),
  reason: z.string().trim().max(500).optional(),
});

/**
 * Revokes every active session/refresh token for a user. Implemented by the auth
 * SessionService; injected so this module stays decoupled from auth internals.
 */
export interface SessionRevoker {
  revokeAllForUser(userId: string): Promise<void>;
}

/** Auth statuses that block login and therefore require active sessions to be killed. */
const LOGIN_BLOCKING_STATUSES: readonly UserStatus[] = ['SUSPENDED', 'DEACTIVATED'];

/** Read model for a member's underlying auth account — distinct from member.status. */
export interface MemberAccountView {
  memberId: string;
  /** Whether a login account is linked to this member. */
  linked: boolean;
  userId: string | null;
  /** Authentication account status (governs login), NOT the member profile status. */
  accountStatus: UserStatus | null;
  emailVerified: boolean;
  email: string | null;
}

/**
 * Exposes and controls the authentication account status for a member, on the
 * existing Members admin surface (D5). Reuses the Identity module for the status
 * transition and the shared audit log for the security-sensitive change.
 */
export class MemberAccountService {
  public constructor(
    private readonly members: MemberRepository,
    private readonly identity: IdentityModule,
    private readonly audit: AuditRepository,
    private readonly sessions: SessionRevoker,
  ) {}

  public async getByMemberId(memberId: string): Promise<MemberAccountView> {
    const member = await this.members.findById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
    if (!member.userId) {
      return this.unlinked(memberId, null);
    }
    const user = await this.identity.users.getById(member.userId);
    if (!user) {
      return this.unlinked(memberId, member.userId);
    }
    return {
      memberId,
      linked: true,
      userId: user.id,
      accountStatus: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      email: user.email,
    };
  }

  public async changeStatus(
    memberId: string,
    input: unknown,
    actor: MemberActor,
  ): Promise<MemberAccountView> {
    const data = changeAccountStatusSchema.parse(input);
    const member = await this.members.findById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
    if (!member.userId) {
      throw new NotFoundError('This member has no linked login account.');
    }
    const before = await this.identity.users.getById(member.userId);
    if (!before) {
      throw new NotFoundError('Linked account not found.');
    }
    // Identity validates the transition + emits its own event; login is blocked
    // server-side for SUSPENDED/DEACTIVATED by AuthService (D7).
    const updated = await this.identity.users.changeStatus(member.userId, data.status);
    // Audit the security-sensitive account-status change (implementation rule 9).
    await this.audit.write({
      entityType: 'user_account',
      entityId: member.userId,
      action: 'UPDATE',
      oldValue: { status: before.status },
      newValue: { status: updated.status, reason: data.reason ?? null, memberId },
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });
    // When login is now blocked (suspend/deactivate), revoke every active session
    // and refresh token so an already-authenticated user is locked out immediately
    // — the frontend is never the only protection (D7). authenticate rejects the
    // access token on its next request because its session is no longer active.
    if (LOGIN_BLOCKING_STATUSES.includes(updated.status)) {
      await this.sessions.revokeAllForUser(member.userId);
    }
    return {
      memberId,
      linked: true,
      userId: updated.id,
      accountStatus: updated.status,
      emailVerified: updated.emailVerifiedAt !== null,
      email: updated.email,
    };
  }

  private unlinked(memberId: string, userId: string | null): MemberAccountView {
    return {
      memberId,
      linked: false,
      userId,
      accountStatus: null,
      emailVerified: false,
      email: null,
    };
  }
}
