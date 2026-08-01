import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  addDocumentSchema,
  addNoteSchema,
  changeStatusSchema,
  createMemberSchema,
  listMembersQuerySchema,
  updateMemberSchema,
  updateOwnProfileSchema,
} from '../validators';

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED';

export interface MemberSummary {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: MemberStatus;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberProfileData {
  dateOfBirth: string | null;
  gender: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface MemberAddressData {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
}

export interface MemberContactData {
  id: string;
  type: string;
  value: string;
  label: string | null;
  isPrimary: boolean;
}

export interface MemberDetail extends MemberSummary {
  userId: string | null;
  profile: MemberProfileData | null;
  addresses: MemberAddressData[];
  contacts: MemberContactData[];
}

export interface MemberNoteData {
  id: string;
  body: string;
  authorId: string | null;
  createdAt: Date;
}

export interface MemberDocumentData {
  id: string;
  name: string;
  category: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface MemberActivityData {
  id: string;
  action: string;
  description: string | null;
  actorId: string | null;
  createdAt: Date;
}

export interface MemberStatusHistoryData {
  id: string;
  fromStatus: MemberStatus | null;
  toStatus: MemberStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export type PaginatedMembers = PaginatedResult<MemberSummary>;

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;

/** Actor + request context for auditing and authorship. */
export interface MemberActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
