import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';
import { generateOpaqueToken } from '@/modules/auth/utils/tokens';
import { ROLES } from '@/modules/rbac';

import type { InviteData, InvitePreview, NetworkActor, PaginatedInvites } from '../dto';
import type { NetworkEventBus } from '../events';
import type {
  InviteRepository,
  InviteRow,
  MemberLookupRepository,
  NetworkAuditRepository,
  NetworkRepository,
} from '../repositories';
import { createInviteSchema, listInvitesQuerySchema } from '../validators';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Assigns a role to a user by role key. Adapted in composition from the RBAC
 * module's role service (idempotent); a narrow port avoids a network→RBAC runtime
 * dependency and lets tests stub it.
 */
export interface RoleAssignerPort {
  assignRoleByKey(userId: string, roleKey: string): Promise<void>;
}

/**
 * Provisions a fully-activated (email-verified) account for an invited user,
 * satisfied in composition by the Auth module's existing register → verifyEmail
 * flow. The secure, single-use invite is the authorization, so no email round-trip
 * is required. Public self-registration is unaffected — it never uses this port and
 * still requires email verification.
 */
export interface InvitedAccountProvisionerPort {
  provisionVerifiedAccount(input: unknown): Promise<{ userId: string }>;
}

function toInvite(row: InviteRow): InviteData {
  const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
  return {
    id: row.id,
    code: row.code,
    role: row.role,
    status: row.status,
    assignedAdminId: row.assignedAdminId,
    assignedPartnerId: row.assignedPartnerId,
    invitedByUserId: row.invitedByUserId,
    expiresAt: iso(row.expiresAt),
    usedByUserId: row.usedByUserId,
    usedByMemberId: row.usedByMemberId,
    usedAt: iso(row.usedAt),
    revokedAt: iso(row.revokedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Invite lifecycle (Phase 2D). Admin-only issuance (reference §2.1). Codes are
 * high-entropy random capability tokens (reused auth `generateOpaqueToken`),
 * stored directly because the reference shows them in the invites list and they
 * are shared manually as join links. Acceptance links the accepting member into
 * the network and provisions the invite's role — atomically + audited. A decided
 * invite (USED/EXPIRED/REVOKED) can never be reused.
 */
export class InviteService {
  public constructor(
    private readonly db: Database,
    private readonly invites: InviteRepository,
    private readonly net: NetworkRepository,
    private readonly members: MemberLookupRepository,
    private readonly audit: NetworkAuditRepository,
    private readonly events: NetworkEventBus,
    private readonly roleAssigner: RoleAssignerPort,
    private readonly provisioner?: InvitedAccountProvisionerPort,
  ) {}

  public async create(input: unknown, actor: NetworkActor): Promise<InviteData> {
    const data = createInviteSchema.parse(input);
    if (data.assignedPartnerId) {
      const partner = await this.members.findById(data.assignedPartnerId);
      if (!partner) {
        throw new NotFoundError('Assigned partner not found.');
      }
    }
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * MS_PER_DAY)
      : null;

    const created = await withTransaction(this.db, async (tx) => {
      const row = await this.invites.create(
        {
          code: generateOpaqueToken(32),
          role: data.role,
          status: 'PENDING',
          assignedAdminId: data.assignedAdminId ?? null,
          assignedPartnerId: data.assignedPartnerId ?? null,
          invitedByUserId: actor.userId,
          expiresAt,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.audit.write(
        {
          entityType: 'invite',
          entityId: row.id,
          action: 'CREATE',
          newValue: {
            role: data.role,
            assignedPartnerId: data.assignedPartnerId ?? null,
            expiresAt,
          },
          ...this.ctx(actor),
        },
        tx,
      );
      return row;
    });

    await this.events.publish({
      type: 'InviteCreated',
      inviteId: created.id,
      role: created.role,
      invitedByUserId: created.invitedByUserId,
      assignedPartnerId: created.assignedPartnerId,
      assignedAdminId: created.assignedAdminId,
      at: new Date(),
    });
    return toInvite(created);
  }

  public async list(query: unknown): Promise<PaginatedInvites> {
    const parsed = listInvitesQuerySchema.parse(query);
    const { rows, total } = await this.invites.search(parsed);
    return buildPaginatedResult(rows.map(toInvite), total, parsed.page, parsed.pageSize);
  }

  public async getByCode(code: string): Promise<InviteData> {
    const row = await this.invites.findByCode(code);
    if (!row) {
      throw new NotFoundError('Invite not found.');
    }
    return toInvite(row);
  }

  /** Minimal, non-sensitive info for the public join page. */
  public async preview(code: string): Promise<InvitePreview> {
    const row = await this.invites.findByCode(code);
    if (!row) {
      throw new NotFoundError('Invite not found.');
    }
    const notExpired = !row.expiresAt || row.expiresAt.getTime() > Date.now();
    return { role: row.role, status: row.status, valid: row.status === 'PENDING' && notExpired };
  }

  public async revoke(code: string, actor: NetworkActor): Promise<InviteData> {
    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.invites.lockByCode(code, tx);
      if (!locked) {
        throw new NotFoundError('Invite not found.');
      }
      if (locked.status !== 'PENDING') {
        throw new ConflictError('Only a pending invite can be revoked.');
      }
      const row = await this.invites.update(
        locked.id,
        {
          status: 'REVOKED',
          revokedBy: actor.userId,
          revokedAt: new Date(),
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.audit.write(
        {
          entityType: 'invite',
          entityId: locked.id,
          action: 'UPDATE',
          oldValue: { status: 'PENDING' },
          newValue: { status: 'REVOKED' },
          ...this.ctx(actor),
        },
        tx,
      );
      if (!row) {
        throw new Error('Invite update did not return a row.');
      }
      return row;
    });

    await this.events.publish({
      type: 'InviteRevoked',
      inviteId: updated.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return toInvite(updated);
  }

  public async remove(code: string, actor: NetworkActor): Promise<void> {
    const existing = await this.invites.findByCode(code);
    if (!existing) {
      throw new NotFoundError('Invite not found.');
    }
    await withTransaction(this.db, async (tx) => {
      await this.invites.softDelete(existing.id, actor.userId, tx);
      await this.audit.write(
        {
          entityType: 'invite',
          entityId: existing.id,
          action: 'DELETE',
          oldValue: { status: existing.status },
          ...this.ctx(actor),
        },
        tx,
      );
    });
    await this.events.publish({
      type: 'InviteDeleted',
      inviteId: existing.id,
      actorId: actor.userId,
      at: new Date(),
    });
  }

  /**
   * Accepts an invite for the authenticated user. Links the member's network
   * relationship (for MEMBER invites) and marks the invite USED — atomically. The
   * invite's role is then provisioned onto the user (idempotent). A non-PENDING or
   * expired invite is rejected, guaranteeing single use.
   */
  public async accept(
    code: string,
    acceptingUserId: string,
    actor: NetworkActor,
  ): Promise<InviteData> {
    const member = await this.members.findByUserId(acceptingUserId);
    if (!member) {
      throw new BusinessRuleError('Your account has no member profile to link.');
    }

    const result = await withTransaction(this.db, async (tx) => {
      const locked = await this.invites.lockByCode(code, tx);
      if (!locked) {
        throw new NotFoundError('Invite not found.');
      }
      if (locked.status !== 'PENDING') {
        throw new ConflictError('This invite is no longer available.');
      }
      if (locked.expiresAt && locked.expiresAt.getTime() <= Date.now()) {
        await this.invites.update(locked.id, { status: 'EXPIRED', updatedBy: actor.userId }, tx);
        throw new BusinessRuleError('This invite has expired.');
      }

      if (locked.role === 'MEMBER' && locked.assignedPartnerId) {
        await this.net.updateRelationship(
          member.id,
          {
            referredBy: locked.assignedPartnerId,
            partnerId: locked.assignedPartnerId,
            updatedBy: actor.userId,
          },
          tx,
        );
        await this.audit.write(
          {
            entityType: 'member',
            entityId: member.id,
            action: 'UPDATE',
            newValue: { referredBy: locked.assignedPartnerId, partnerId: locked.assignedPartnerId },
            ...this.ctx(actor),
          },
          tx,
        );
      }

      const used = await this.invites.update(
        locked.id,
        {
          status: 'USED',
          usedByUserId: acceptingUserId,
          usedByMemberId: member.id,
          usedAt: new Date(),
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.audit.write(
        {
          entityType: 'invite',
          entityId: locked.id,
          action: 'UPDATE',
          oldValue: { status: 'PENDING' },
          newValue: { status: 'USED', role: locked.role, usedByMemberId: member.id },
          ...this.ctx(actor),
        },
        tx,
      );
      if (!used) {
        throw new Error('Invite update did not return a row.');
      }
      return { invite: used, memberId: member.id };
    });

    // Provision the invite's role (idempotent; MEMBER is usually already held).
    const roleKey = result.invite.role === 'PARTNER' ? ROLES.PARTNER : ROLES.MEMBER;
    await this.roleAssigner.assignRoleByKey(acceptingUserId, roleKey);

    await this.events.publish({
      type: 'InviteAccepted',
      inviteId: result.invite.id,
      role: result.invite.role,
      acceptedByUserId: acceptingUserId,
      acceptedByMemberId: result.memberId,
      invitedByUserId: result.invite.invitedByUserId,
      partnerId: result.invite.assignedPartnerId,
      at: new Date(),
    });
    if (result.invite.role === 'MEMBER' && result.invite.assignedPartnerId) {
      await this.events.publish({
        type: 'ReferralLinked',
        memberId: result.memberId,
        referredBy: result.invite.assignedPartnerId,
        partnerId: result.invite.assignedPartnerId,
        at: new Date(),
      });
    }
    return toInvite(result.invite);
  }

  /**
   * Invitation-based onboarding (MVP, no email provider). Creates AND activates an
   * account for a NEW invited user, then accepts the invite — all authorized by the
   * secure, single-use, expiring invite, which serves as the activation credential
   * (no email-verification round-trip). The invite is validated BEFORE any account
   * is created, so an invalid / expired / already-used invite never provisions an
   * account. Public self-registration is unchanged and still requires email
   * verification. A PARTNER invite yields the existing `partner` role; a MEMBER
   * invite with `assignedPartnerId` establishes the member → direct Partner
   * relationship — both via the existing {@link accept} (single-use enforced there).
   */
  public async registerWithInvite(
    code: string,
    input: unknown,
    context: Omit<NetworkActor, 'userId'>,
  ): Promise<InviteData> {
    if (!this.provisioner) {
      throw new BusinessRuleError('Invitation-based registration is not configured.');
    }
    // Validate the invite up front — never create an account for a bad invite.
    const invite = await this.invites.findByCode(code);
    if (!invite) {
      throw new NotFoundError('Invite not found.');
    }
    if (invite.status !== 'PENDING') {
      throw new ConflictError('This invite is no longer available.');
    }
    if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
      throw new BusinessRuleError('This invite has expired.');
    }

    // Provision + activate the account (auth register → verifyEmail), then accept
    // as the new user. `accept` re-locks the invite and enforces single-use.
    const { userId } = await this.provisioner.provisionVerifiedAccount(input);
    return this.accept(code, userId, { userId, ...context });
  }

  private ctx(
    actor: NetworkActor,
  ): Pick<
    Parameters<NetworkAuditRepository['write']>[0],
    'userId' | 'ipAddress' | 'userAgent' | 'correlationId'
  > {
    return {
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      correlationId: actor.correlationId,
    };
  }
}
