import type { AxiosInstance } from 'axios';

/**
 * Network / referrals / invites API resource (Phase 2D) — the single shared
 * definition of the HTTP contract used by the Member Portal and BCC admin.
 * JSON dates are strings over the wire.
 */

export type InviteRole = 'PARTNER' | 'MEMBER';
export type InviteStatus = 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface Invite {
  id: string;
  code: string;
  role: InviteRole;
  status: InviteStatus;
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

export interface InvitePreview {
  role: InviteRole;
  status: InviteStatus;
  valid: boolean;
}

export interface PaginatedInvites {
  items: Invite[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface NetworkMemberNode {
  memberId: string;
  memberNumber: string;
  name: string;
  referredBy: string | null;
  partnerId: string | null;
  directReferralCount: number;
  depth: number;
}

export interface ReferralSummary {
  memberId: string;
  memberNumber: string;
  referredBy: string | null;
  partnerId: string | null;
  directReferralCount: number;
  totalDownlineCount: number;
}

export interface PartnerNetworkSummary {
  partnerMemberId: string;
  memberNumber: string;
  name: string;
  directMemberCount: number;
  totalNetworkCount: number;
}

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
  units: number;
}

export interface CreateInviteInput {
  role: InviteRole;
  assignedAdminId?: string;
  assignedPartnerId?: string;
  expiresInDays?: number;
}

export interface ListInvitesParams {
  page?: number;
  pageSize?: number;
  role?: InviteRole;
  status?: InviteStatus;
  sortBy?: 'createdAt' | 'expiresAt' | 'status';
  order?: 'asc' | 'desc';
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface NetworkApi {
  // Member self-service (own network only).
  getMyReferralSummary(): Promise<ReferralSummary>;
  getMyReferrals(): Promise<NetworkMemberNode[]>;
  getMyDownline(): Promise<NetworkMemberNode[]>;
  // Admin network visibility.
  listPartners(): Promise<PartnerNetworkSummary[]>;
  getMemberNode(memberId: string): Promise<NetworkMemberDetail>;
  // Invites.
  createInvite(input: CreateInviteInput): Promise<Invite>;
  listInvites(params?: ListInvitesParams): Promise<PaginatedInvites>;
  getInvite(code: string): Promise<Invite>;
  previewInvite(code: string): Promise<InvitePreview>;
  acceptInvite(code: string): Promise<Invite>;
  revokeInvite(code: string): Promise<Invite>;
  deleteInvite(code: string): Promise<{ code: string; deleted: boolean }>;
}

/** Binds the network/invites resource to a configured API client. */
export function createNetworkApi(client: AxiosInstance): NetworkApi {
  const network = '/api/v1/network';
  const invites = '/api/v1/invites';
  return {
    async getMyReferralSummary() {
      const response = await client.get<Envelope<ReferralSummary>>(`${network}/me`);
      return response.data.data;
    },
    async getMyReferrals() {
      const response = await client.get<ItemsEnvelope<NetworkMemberNode>>(
        `${network}/me/referrals`,
      );
      return response.data.data.items;
    },
    async getMyDownline() {
      const response = await client.get<ItemsEnvelope<NetworkMemberNode>>(`${network}/me/downline`);
      return response.data.data.items;
    },
    async listPartners() {
      const response = await client.get<ItemsEnvelope<PartnerNetworkSummary>>(
        `${network}/partners`,
      );
      return response.data.data.items;
    },
    async getMemberNode(memberId) {
      const response = await client.get<Envelope<NetworkMemberDetail>>(
        `${network}/members/${memberId}`,
      );
      return response.data.data;
    },
    async createInvite(input) {
      const response = await client.post<Envelope<Invite>>(invites, input);
      return response.data.data;
    },
    async listInvites(params) {
      const response = await client.get<Envelope<PaginatedInvites>>(invites, { params });
      return response.data.data;
    },
    async getInvite(code) {
      const response = await client.get<Envelope<Invite>>(`${invites}/${code}`);
      return response.data.data;
    },
    async previewInvite(code) {
      const response = await client.get<Envelope<InvitePreview>>(`${invites}/${code}/preview`);
      return response.data.data;
    },
    async acceptInvite(code) {
      const response = await client.post<Envelope<Invite>>(`${invites}/${code}/accept`);
      return response.data.data;
    },
    async revokeInvite(code) {
      const response = await client.post<Envelope<Invite>>(`${invites}/${code}/revoke`);
      return response.data.data;
    },
    async deleteInvite(code) {
      const response = await client.delete<Envelope<{ code: string; deleted: boolean }>>(
        `${invites}/${code}`,
      );
      return response.data.data;
    },
  };
}
