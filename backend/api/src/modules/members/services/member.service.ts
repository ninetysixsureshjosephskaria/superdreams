import type { InferInsertModel } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { buildPaginatedResult } from '@/database/helpers';
import type { members } from '@/database/schema';
import { ConflictError, NotFoundError, ValidationError } from '@/errors';

import type {
  MemberActivityData,
  MemberActor,
  MemberDetail,
  MemberDocumentData,
  MemberNoteData,
  MemberStatus,
  MemberStatusHistoryData,
  PaginatedMembers,
} from '../dto';
import type { MemberEventBus } from '../events';
import {
  toMemberActivity,
  toMemberDetail,
  toMemberDocument,
  toMemberNote,
  toMemberStatusHistory,
  toMemberSummary,
  type MemberRow,
} from '../mappers';
import type {
  AuditRepository,
  MemberActivityRepository,
  MemberAddressRepository,
  MemberContactRepository,
  MemberDocumentRepository,
  MemberNoteRepository,
  MemberProfileRepository,
  MemberRepository,
  MemberStatusHistoryRepository,
} from '../repositories';
import {
  addDocumentSchema,
  addNoteSchema,
  changeStatusSchema,
  createMemberSchema,
  listMembersQuerySchema,
  updateMemberSchema,
  updateOwnProfileSchema,
} from '../validators';

const ALLOWED_TRANSITIONS: Record<MemberStatus, readonly MemberStatus[]> = {
  PENDING: ['ACTIVE', 'SUSPENDED', 'INACTIVE', 'ARCHIVED'],
  ACTIVE: ['SUSPENDED', 'INACTIVE', 'ARCHIVED'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
};

function snapshot(row: MemberRow): Record<string, unknown> {
  return {
    memberNumber: row.memberNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    status: row.status,
  };
}

/**
 * Member Management business logic: CRUD, status lifecycle, search, notes,
 * documents, activity and status history. Every mutating action writes an audit
 * entry, records member activity, and publishes a domain event.
 */
export class MemberService {
  public constructor(
    private readonly members: MemberRepository,
    private readonly profiles: MemberProfileRepository,
    private readonly notes: MemberNoteRepository,
    private readonly documents: MemberDocumentRepository,
    private readonly addresses: MemberAddressRepository,
    private readonly contacts: MemberContactRepository,
    private readonly statusHistory: MemberStatusHistoryRepository,
    private readonly activity: MemberActivityRepository,
    private readonly audit: AuditRepository,
    private readonly events: MemberEventBus,
  ) {}

  public async list(query: unknown): Promise<PaginatedMembers> {
    const parsed = listMembersQuerySchema.parse(query);
    const { rows, total } = await this.members.search(parsed);
    return buildPaginatedResult(rows.map(toMemberSummary), total, parsed.page, parsed.pageSize);
  }

  public async getDetail(id: string): Promise<MemberDetail> {
    const member = await this.requireMember(id);
    return this.assembleDetail(member);
  }

  public async getByUserId(userId: string): Promise<MemberDetail | null> {
    const member = await this.members.findByUserId(userId);
    return member ? this.assembleDetail(member) : null;
  }

  public async create(input: unknown, actor: MemberActor): Promise<MemberDetail> {
    const data = createMemberSchema.parse(input);
    if (await this.members.findByEmail(data.email)) {
      throw new ConflictError('A member with this email already exists.');
    }
    const status: MemberStatus = data.status ?? 'PENDING';
    const memberNumber = `M-${randomUUID().slice(0, 8).toUpperCase()}`;

    const member = await this.members.create({
      memberNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone ?? null,
      status,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    if (data.profile) {
      await this.profiles.create({
        memberId: member.id,
        dateOfBirth: data.profile.dateOfBirth ?? null,
        gender: data.profile.gender ?? null,
        avatarUrl: data.profile.avatarUrl ?? null,
        bio: data.profile.bio ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
    }

    await this.statusHistory.record({
      memberId: member.id,
      fromStatus: null,
      toStatus: status,
      reason: 'Member created',
      changedBy: actor.userId,
    });
    await this.recordActivity(member.id, 'member.created', 'Member created', actor);
    await this.audit.write({
      entityType: 'member',
      entityId: member.id,
      action: 'CREATE',
      newValue: snapshot(member),
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });
    await this.events.publish({
      type: 'MemberCreated',
      memberId: member.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleDetail(member);
  }

  public async update(id: string, input: unknown, actor: MemberActor): Promise<MemberDetail> {
    const data = updateMemberSchema.parse(input);
    const member = await this.requireMember(id);

    if (data.email && data.email !== member.email) {
      const duplicate = await this.members.findByEmail(data.email);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A member with this email already exists.');
      }
    }

    const values: Partial<InferInsertModel<typeof members>> = { updatedBy: actor.userId };
    if (data.firstName !== undefined) values.firstName = data.firstName;
    if (data.lastName !== undefined) values.lastName = data.lastName;
    if (data.email !== undefined) values.email = data.email;
    if (data.phone !== undefined) values.phone = data.phone;

    const updated = (await this.members.update(id, values)) ?? member;
    await this.applyProfile(id, data.profile, actor);

    await this.recordActivity(id, 'member.updated', 'Member updated', actor);
    await this.audit.write({
      entityType: 'member',
      entityId: id,
      action: 'UPDATE',
      oldValue: snapshot(member),
      newValue: snapshot(updated),
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });
    await this.events.publish({
      type: 'MemberUpdated',
      memberId: id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleDetail(updated);
  }

  /** Self-service profile update (portal). Ownership must be enforced by the caller. */
  public async updateOwnProfile(
    id: string,
    input: unknown,
    actor: MemberActor,
  ): Promise<MemberDetail> {
    const data = updateOwnProfileSchema.parse(input);
    const member = await this.requireMember(id);

    const values: Partial<InferInsertModel<typeof members>> = { updatedBy: actor.userId };
    if (data.firstName !== undefined) values.firstName = data.firstName;
    if (data.lastName !== undefined) values.lastName = data.lastName;
    if (data.phone !== undefined) values.phone = data.phone;

    const updated = (await this.members.update(id, values)) ?? member;
    await this.applyProfile(id, data.profile, actor);

    await this.recordActivity(id, 'member.profile_updated', 'Profile updated by member', actor);
    await this.events.publish({
      type: 'MemberUpdated',
      memberId: id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleDetail(updated);
  }

  public async changeStatus(id: string, input: unknown, actor: MemberActor): Promise<MemberDetail> {
    const data = changeStatusSchema.parse(input);
    const member = await this.requireMember(id);
    const from = member.status;
    const to = data.status;

    if (from === to) {
      throw new ValidationError(`Member is already ${to}.`);
    }
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new ValidationError(`Cannot change member status from ${from} to ${to}.`);
    }

    const updated =
      (await this.members.update(id, { status: to, updatedBy: actor.userId })) ?? member;
    await this.statusHistory.record({
      memberId: id,
      fromStatus: from,
      toStatus: to,
      reason: data.reason ?? null,
      changedBy: actor.userId,
    });
    await this.recordActivity(id, 'member.status_changed', `Status ${from} → ${to}`, actor);
    await this.audit.write({
      entityType: 'member',
      entityId: id,
      action: 'UPDATE',
      oldValue: { status: from },
      newValue: { status: to, reason: data.reason ?? null },
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });

    await this.events.publish({
      type: 'MemberStatusChanged',
      memberId: id,
      fromStatus: from,
      toStatus: to,
      actorId: actor.userId,
      at: new Date(),
    });
    if (to === 'SUSPENDED') {
      await this.events.publish({
        type: 'MemberSuspended',
        memberId: id,
        actorId: actor.userId,
        reason: data.reason ?? null,
        at: new Date(),
      });
    } else if (to === 'ACTIVE') {
      await this.events.publish({
        type: 'MemberReactivated',
        memberId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    } else if (to === 'ARCHIVED') {
      await this.events.publish({
        type: 'MemberArchived',
        memberId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    }
    return this.assembleDetail(updated);
  }

  /** Archive = mark ARCHIVED and soft-delete. */
  public async archive(id: string, actor: MemberActor): Promise<void> {
    const member = await this.requireMember(id);
    if (member.status !== 'ARCHIVED') {
      await this.members.update(id, { status: 'ARCHIVED', updatedBy: actor.userId });
      await this.statusHistory.record({
        memberId: id,
        fromStatus: member.status,
        toStatus: 'ARCHIVED',
        reason: 'Member archived',
        changedBy: actor.userId,
      });
    }
    await this.members.softDelete(id, actor.userId);
    await this.recordActivity(id, 'member.archived', 'Member archived', actor);
    await this.audit.write({
      entityType: 'member',
      entityId: id,
      action: 'DELETE',
      oldValue: snapshot(member),
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });
    await this.events.publish({
      type: 'MemberArchived',
      memberId: id,
      actorId: actor.userId,
      at: new Date(),
    });
  }

  public async listNotes(id: string): Promise<MemberNoteData[]> {
    await this.requireMember(id);
    const rows = await this.notes.listByMember(id);
    return rows.map(toMemberNote);
  }

  public async addNote(id: string, input: unknown, actor: MemberActor): Promise<MemberNoteData> {
    const data = addNoteSchema.parse(input);
    await this.requireMember(id);
    const note = await this.notes.create({
      memberId: id,
      authorId: actor.userId,
      body: data.body,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.recordActivity(id, 'member.note_added', 'Note added', actor);
    await this.audit.write({
      entityType: 'member_note',
      entityId: note.id,
      action: 'CREATE',
      newValue: { memberId: id, body: data.body },
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });
    await this.events.publish({
      type: 'MemberNoteAdded',
      memberId: id,
      noteId: note.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return toMemberNote(note);
  }

  public async listDocuments(id: string): Promise<MemberDocumentData[]> {
    await this.requireMember(id);
    const rows = await this.documents.listByMember(id);
    return rows.map(toMemberDocument);
  }

  public async addDocument(
    id: string,
    input: unknown,
    actor: MemberActor,
  ): Promise<MemberDocumentData> {
    const data = addDocumentSchema.parse(input);
    await this.requireMember(id);
    const document = await this.documents.create({
      memberId: id,
      name: data.name,
      category: data.category ?? null,
      contentType: data.contentType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      uploadedBy: actor.userId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.recordActivity(id, 'member.document_added', `Document added: ${data.name}`, actor);
    await this.audit.write({
      entityType: 'member_document',
      entityId: document.id,
      action: 'CREATE',
      newValue: { memberId: id, name: data.name },
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      module: 'members',
      correlationId: actor.correlationId,
    });
    await this.events.publish({
      type: 'MemberDocumentAdded',
      memberId: id,
      documentId: document.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return toMemberDocument(document);
  }

  public async listActivity(id: string): Promise<MemberActivityData[]> {
    await this.requireMember(id);
    const rows = await this.activity.listByMember(id);
    return rows.map(toMemberActivity);
  }

  public async listStatusHistory(id: string): Promise<MemberStatusHistoryData[]> {
    await this.requireMember(id);
    const rows = await this.statusHistory.listByMember(id);
    return rows.map(toMemberStatusHistory);
  }

  private async assembleDetail(member: MemberRow): Promise<MemberDetail> {
    const [profile, addresses, contacts] = await Promise.all([
      this.profiles.findByMemberId(member.id),
      this.addresses.listByMember(member.id),
      this.contacts.listByMember(member.id),
    ]);
    return toMemberDetail(member, profile, addresses, contacts);
  }

  private async applyProfile(
    memberId: string,
    profile: NonNullable<unknown> | undefined,
    actor: MemberActor,
  ): Promise<void> {
    if (!profile || typeof profile !== 'object') {
      return;
    }
    const data = profile as {
      dateOfBirth?: string;
      gender?: string;
      avatarUrl?: string;
      bio?: string;
    };
    const existing = await this.profiles.findByMemberId(memberId);
    const values = {
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      avatarUrl: data.avatarUrl ?? null,
      bio: data.bio ?? null,
    };
    if (existing) {
      await this.profiles.update(existing.id, { ...values, updatedBy: actor.userId });
    } else {
      await this.profiles.create({
        memberId,
        ...values,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
    }
  }

  private async recordActivity(
    memberId: string,
    action: string,
    description: string,
    actor: MemberActor,
  ): Promise<void> {
    await this.activity.record({ memberId, action, description, actorId: actor.userId });
  }

  private async requireMember(id: string): Promise<MemberRow> {
    const member = await this.members.findById(id);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
    return member;
  }
}
