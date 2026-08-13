import type { AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { createNetworkApi, type Invite } from './network';

const INVITE: Invite = {
  id: 'i1',
  code: 'ABC123',
  role: 'PARTNER',
  status: 'USED',
  assignedAdminId: null,
  assignedPartnerId: null,
  invitedByUserId: null,
  expiresAt: null,
  usedByUserId: 'u1',
  usedByMemberId: 'm1',
  usedAt: '2026-08-13T00:00:00.000Z',
  revokedAt: null,
  createdAt: '2026-08-13T00:00:00.000Z',
};

describe('networkApi.registerWithInvite', () => {
  it('POSTs the credentials to /invites/:code/register and unwraps the envelope', async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true, data: INVITE } });
    const api = createNetworkApi({ post } as unknown as AxiosInstance);

    const input = {
      email: 'invited@example.com',
      password: 'SuperDreams!123',
      firstName: 'New',
      lastName: 'Partner',
    };
    const result = await api.registerWithInvite('ABC123', input);

    expect(post).toHaveBeenCalledWith('/api/v1/invites/ABC123/register', input);
    expect(result).toEqual(INVITE);
  });
});
