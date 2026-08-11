/* eslint-disable @typescript-eslint/unbound-method -- `networkApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type NetworkMemberNode, type ReferralSummary } from '@superdreams/api-client';

import { networkApi } from '../api';
import NetworkPage from './NetworkPage';

/** NetworkPage renders a PageHeader (breadcrumbs use the router), so it needs one. */
function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <NetworkPage />
    </MemoryRouter>,
  );
}

vi.mock('../api', () => ({
  networkApi: {
    getMyReferralSummary: vi.fn(),
    getMyReferrals: vi.fn(),
    getMyDownline: vi.fn(),
  },
}));

const SUMMARY: ReferralSummary = {
  memberId: 'm-1',
  memberNumber: 'M-001',
  referredBy: null,
  partnerId: null,
  directReferralCount: 2,
  totalDownlineCount: 3,
  referralCode: 'MYCODE',
  referrer: { memberId: 'up-1', memberNumber: 'M-000', name: 'Upline Uma' },
};

function node(overrides: Partial<NetworkMemberNode>): NetworkMemberNode {
  return {
    memberId: 'x',
    memberNumber: 'M-000',
    name: 'Member',
    referredBy: 'm-1',
    partnerId: null,
    directReferralCount: 0,
    depth: 1,
    ...overrides,
  };
}

const REFERRALS: NetworkMemberNode[] = [
  node({ memberId: 'r-1', memberNumber: 'M-002', name: 'Alice', directReferralCount: 1, depth: 1 }),
  node({ memberId: 'r-2', memberNumber: 'M-003', name: 'Bob', directReferralCount: 0, depth: 1 }),
];

const DOWNLINE: NetworkMemberNode[] = [
  ...REFERRALS,
  node({ memberId: 'd-1', memberNumber: 'M-004', name: 'Carol', referredBy: 'r-1', depth: 2 }),
];

describe('NetworkPage', () => {
  beforeEach(() => {
    vi.mocked(networkApi.getMyReferralSummary).mockResolvedValue(SUMMARY);
    vi.mocked(networkApi.getMyReferrals).mockResolvedValue(REFERRALS);
    vi.mocked(networkApi.getMyDownline).mockResolvedValue(DOWNLINE);
  });

  it('renders the network overview from backend data', async () => {
    renderPage();
    expect(await screen.findByText('M-001')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // direct referrals
    expect(screen.getByText('3')).toBeInTheDocument(); // total network
  });

  it('renders direct referrals (default tab)', async () => {
    renderPage();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('M-002')).toBeInTheDocument();
    expect(screen.getByText('1 referral')).toBeInTheDocument();
  });

  it('renders the downline grouped by backend-provided level', async () => {
    renderPage();
    await screen.findByText('Alice');

    fireEvent.click(screen.getByRole('tab', { name: 'Downline' }));

    expect(await screen.findByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Level 1')).toBeInTheDocument();
    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });

  it('shows empty states when the member has no referrals or downline', async () => {
    vi.mocked(networkApi.getMyReferrals).mockResolvedValue([]);
    vi.mocked(networkApi.getMyDownline).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/No direct referrals yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Downline' }));
    expect(await screen.findByText(/Your network is empty/i)).toBeInTheDocument();
  });

  it('shows a loading state while the summary is pending', () => {
    vi.mocked(networkApi.getMyReferralSummary).mockReturnValue(
      new Promise<ReferralSummary>(() => {
        /* never resolves */
      }),
    );
    renderPage();
    expect(screen.getByText(/Loading your network/i)).toBeInTheDocument();
  });

  it('shows an error state when the network request fails', async () => {
    vi.mocked(networkApi.getMyReferralSummary).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText(/Could not load your network/i)).toBeInTheDocument();
  });

  it('handles a forbidden response as an error state', async () => {
    vi.mocked(networkApi.getMyReferralSummary).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Forbidden', status: 403 }),
    );
    renderPage();
    expect(await screen.findByText(/Could not load your network/i)).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });

  it('renders the referral link and copies it via the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderPage();
    await screen.findByText('M-001');

    const expectedUrl = `${window.location.origin}/signup?ref=MYCODE`;
    const linkInput = screen.getByLabelText<HTMLInputElement>('Your referral link');
    expect(linkInput.value).toBe(expectedUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(expectedUrl);
  });

  it('renders the upline referrer', async () => {
    renderPage();
    expect(await screen.findByText(/Referred by:/)).toBeInTheDocument();
    expect(screen.getByText('Upline Uma')).toBeInTheDocument();
    expect(screen.getByText(/M-000/)).toBeInTheDocument();
  });

  it('hides the referral card when the member has no referral code', async () => {
    vi.mocked(networkApi.getMyReferralSummary).mockResolvedValue({
      ...SUMMARY,
      referralCode: null,
      referrer: null,
    });
    renderPage();
    await screen.findByText('M-001');

    expect(screen.queryByText('Your referral link')).not.toBeInTheDocument();
    expect(screen.getByText(/You joined directly/i)).toBeInTheDocument();
  });
});
