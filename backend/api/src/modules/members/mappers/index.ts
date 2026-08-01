import type { InferSelectModel } from 'drizzle-orm';

import type {
  memberActivityLogs,
  memberAddresses,
  memberContacts,
  memberDocuments,
  memberNotes,
  memberProfiles,
  memberStatusHistory,
  members,
} from '@/database/schema';

import type {
  MemberActivityData,
  MemberAddressData,
  MemberContactData,
  MemberDetail,
  MemberDocumentData,
  MemberNoteData,
  MemberProfileData,
  MemberStatusHistoryData,
  MemberSummary,
} from '../dto';

export type MemberRow = InferSelectModel<typeof members>;
export type MemberProfileRow = InferSelectModel<typeof memberProfiles>;
export type MemberAddressRow = InferSelectModel<typeof memberAddresses>;
export type MemberContactRow = InferSelectModel<typeof memberContacts>;
export type MemberNoteRow = InferSelectModel<typeof memberNotes>;
export type MemberDocumentRow = InferSelectModel<typeof memberDocuments>;
export type MemberActivityRow = InferSelectModel<typeof memberActivityLogs>;
export type MemberStatusHistoryRow = InferSelectModel<typeof memberStatusHistory>;

export function toMemberSummary(row: MemberRow): MemberSummary {
  return {
    id: row.id,
    memberNumber: row.memberNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    email: row.email,
    phone: row.phone,
    status: row.status,
    joinedAt: row.joinedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toMemberProfile(row: MemberProfileRow | null): MemberProfileData | null {
  if (!row) {
    return null;
  }
  return {
    dateOfBirth: row.dateOfBirth,
    gender: row.gender,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
  };
}

export function toMemberAddress(row: MemberAddressRow): MemberAddressData {
  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    isPrimary: row.isPrimary,
  };
}

export function toMemberContact(row: MemberContactRow): MemberContactData {
  return {
    id: row.id,
    type: row.type,
    value: row.value,
    label: row.label,
    isPrimary: row.isPrimary,
  };
}

export function toMemberDetail(
  member: MemberRow,
  profile: MemberProfileRow | null,
  addresses: MemberAddressRow[],
  contacts: MemberContactRow[],
): MemberDetail {
  return {
    ...toMemberSummary(member),
    userId: member.userId,
    profile: toMemberProfile(profile),
    addresses: addresses.map(toMemberAddress),
    contacts: contacts.map(toMemberContact),
  };
}

export function toMemberNote(row: MemberNoteRow): MemberNoteData {
  return { id: row.id, body: row.body, authorId: row.authorId, createdAt: row.createdAt };
}

export function toMemberDocument(row: MemberDocumentRow): MemberDocumentData {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  };
}

export function toMemberActivity(row: MemberActivityRow): MemberActivityData {
  return {
    id: row.id,
    action: row.action,
    description: row.description,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}

export function toMemberStatusHistory(row: MemberStatusHistoryRow): MemberStatusHistoryData {
  return {
    id: row.id,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reason: row.reason,
    changedBy: row.changedBy,
    createdAt: row.createdAt,
  };
}
