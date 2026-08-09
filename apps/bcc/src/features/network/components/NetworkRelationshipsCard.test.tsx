/* eslint-disable @typescript-eslint/unbound-method -- `networkApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type NetworkMemberDetail } from '@superdreams/api-client';

import { networkApi } from '../api';
import { NetworkRelationshipsCard } from './NetworkRelationshipsCard';

vi.mock('../api', () => ({
  networkApi: { getMemberNode: vi.fn() },
}));

const NODE: NetworkMemberDetail = {
  memberId: 'm-1',
  memberNumber: 'M-001',
  name: 'Ada Member',
  email: 'ada@b.test',
  status: 'ACTIVE',
  referredBy: 'M-REF',
  partnerId: 'M-PARTNER',
  directReferralCount: 4,
  totalDownlineCount: 9,
  units: 30,
};

describe('NetworkRelationshipsCard', () => {
  beforeEach(() => {
    vi.mocked(networkApi.getMemberNode).mockReset().mockResolvedValue(NODE);
    useSessionStore.setState({ permissions: ['network.read'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders backend-provided relationships and counts', async () => {
    renderWithProviders(<NetworkRelationshipsCard memberId="m-1" />);
    expect(await screen.findByText('M-REF')).toBeInTheDocument(); // referred by
    expect(screen.getByText('M-PARTNER')).toBeInTheDocument(); // partner
    expect(screen.getByText('4')).toBeInTheDocument(); // direct referrals
    expect(screen.getByText('9')).toBeInTheDocument(); // total downline
    expect(screen.getByText('30')).toBeInTheDocument(); // units
  });

  it('does not query or render data without network.read', () => {
    useSessionStore.setState({ permissions: [] });
    renderWithProviders(<NetworkRelationshipsCard memberId="m-1" />);
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    expect(networkApi.getMemberNode).not.toHaveBeenCalled();
  });

  it('shows an empty state when the member has no network node', async () => {
    vi.mocked(networkApi.getMemberNode).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Not found', status: 404 }),
    );
    renderWithProviders(<NetworkRelationshipsCard memberId="m-1" />);
    expect(await screen.findByText(/Not in a network/i)).toBeInTheDocument();
  });
});
