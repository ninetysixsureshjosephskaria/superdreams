import type { AxiosInstance } from 'axios';

/**
 * Member Management API resource — the single, shared definition of the member
 * HTTP contract used by every application (no duplicated API logic). Types
 * mirror the backend DTOs (JSON dates are strings over the wire).
 */

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
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
}

export interface MemberDocumentData {
  id: string;
  name: string;
  category: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface MemberActivityData {
  id: string;
  action: string;
  description: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface MemberStatusHistoryData {
  id: string;
  fromStatus: MemberStatus | null;
  toStatus: MemberStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface PaginatedMembers {
  items: MemberSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type MemberSortField = 'createdAt' | 'updatedAt' | 'joinedAt' | 'lastName' | 'status';

export interface ListMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: MemberStatus;
  joinedFrom?: string;
  joinedTo?: string;
  sortBy?: MemberSortField;
  order?: 'asc' | 'desc';
}

export interface MemberProfileInput {
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface CreateMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: MemberStatus;
  profile?: MemberProfileInput;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  profile?: MemberProfileInput;
}

export interface ChangeStatusInput {
  status: MemberStatus;
  reason?: string;
}

export interface AddNoteInput {
  body: string;
}

export interface AddDocumentInput {
  name: string;
  category?: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface UpdateOwnProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  profile?: MemberProfileInput;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

/** Result of the Super Admin "Generate Demo Members" action. */
export interface GenerateDemoMembersResult {
  created: number;
  skipped: number;
  message: string;
}

/** Authentication account status (login access) — distinct from member.status. */
export type AuthAccountStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

/** A member's underlying auth account view. */
export interface MemberAccountView {
  memberId: string;
  linked: boolean;
  userId: string | null;
  accountStatus: AuthAccountStatus | null;
  emailVerified: boolean;
  email: string | null;
}

export interface ChangeAccountStatusInput {
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  reason?: string;
}

export interface MembersApi {
  list(params?: ListMembersParams): Promise<PaginatedMembers>;
  get(id: string): Promise<MemberDetail>;
  create(input: CreateMemberInput): Promise<MemberDetail>;
  update(id: string, input: UpdateMemberInput): Promise<MemberDetail>;
  changeStatus(id: string, input: ChangeStatusInput): Promise<MemberDetail>;
  /** Read the member's authentication account status (requires account.read). */
  getAccount(id: string): Promise<MemberAccountView>;
  /** Change the member's authentication account status (requires account.status). */
  changeAccountStatus(id: string, input: ChangeAccountStatusInput): Promise<MemberAccountView>;
  archive(id: string): Promise<void>;
  listActivity(id: string): Promise<MemberActivityData[]>;
  listStatusHistory(id: string): Promise<MemberStatusHistoryData[]>;
  listNotes(id: string): Promise<MemberNoteData[]>;
  addNote(id: string, input: AddNoteInput): Promise<MemberNoteData>;
  listDocuments(id: string): Promise<MemberDocumentData[]>;
  addDocument(id: string, input: AddDocumentInput): Promise<MemberDocumentData>;
  getMe(): Promise<MemberDetail>;
  updateMe(input: UpdateOwnProfileInput): Promise<MemberDetail>;
  /** Super Admin only: idempotently generate demo members; returns created/skipped counts. */
  generateDemoMembers(count?: number): Promise<GenerateDemoMembersResult>;
}

/** Binds the members resource to a configured API client. */
export function createMembersApi(client: AxiosInstance): MembersApi {
  const base = '/api/v1/members';
  return {
    async list(params) {
      const response = await client.get<Envelope<PaginatedMembers>>(base, { params });
      return response.data.data;
    },
    async get(id) {
      const response = await client.get<Envelope<MemberDetail>>(`${base}/${id}`);
      return response.data.data;
    },
    async create(input) {
      const response = await client.post<Envelope<MemberDetail>>(base, input);
      return response.data.data;
    },
    async update(id, input) {
      const response = await client.put<Envelope<MemberDetail>>(`${base}/${id}`, input);
      return response.data.data;
    },
    async changeStatus(id, input) {
      const response = await client.patch<Envelope<MemberDetail>>(`${base}/${id}/status`, input);
      return response.data.data;
    },
    async getAccount(id) {
      const response = await client.get<Envelope<MemberAccountView>>(`${base}/${id}/account`);
      return response.data.data;
    },
    async changeAccountStatus(id, input) {
      const response = await client.patch<Envelope<MemberAccountView>>(
        `${base}/${id}/account-status`,
        input,
      );
      return response.data.data;
    },
    async archive(id) {
      await client.delete(`${base}/${id}`);
    },
    async listActivity(id) {
      const response = await client.get<ItemsEnvelope<MemberActivityData>>(
        `${base}/${id}/activity`,
      );
      return response.data.data.items;
    },
    async listStatusHistory(id) {
      const response = await client.get<ItemsEnvelope<MemberStatusHistoryData>>(
        `${base}/${id}/status-history`,
      );
      return response.data.data.items;
    },
    async listNotes(id) {
      const response = await client.get<ItemsEnvelope<MemberNoteData>>(`${base}/${id}/notes`);
      return response.data.data.items;
    },
    async addNote(id, input) {
      const response = await client.post<Envelope<MemberNoteData>>(`${base}/${id}/notes`, input);
      return response.data.data;
    },
    async listDocuments(id) {
      const response = await client.get<ItemsEnvelope<MemberDocumentData>>(
        `${base}/${id}/documents`,
      );
      return response.data.data.items;
    },
    async addDocument(id, input) {
      const response = await client.post<Envelope<MemberDocumentData>>(
        `${base}/${id}/documents`,
        input,
      );
      return response.data.data;
    },
    async getMe() {
      const response = await client.get<Envelope<MemberDetail>>(`${base}/me`);
      return response.data.data;
    },
    async updateMe(input) {
      const response = await client.put<Envelope<MemberDetail>>(`${base}/me`, input);
      return response.data.data;
    },
    async generateDemoMembers(count) {
      const response = await client.post<Envelope<GenerateDemoMembersResult>>(
        `${base}/demo`,
        count !== undefined ? { count } : {},
      );
      return response.data.data;
    },
  };
}
