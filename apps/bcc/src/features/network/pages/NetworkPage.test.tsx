/* eslint-disable @typescript-eslint/unbound-method -- `networkApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import {
  ApiError,
  type Invite,
  type PaginatedInvites,
  type PartnerNetworkSummary,
} from '@superdreams/api-client';

import { networkApi } from '../api';
import NetworkPage from './NetworkPage';

vi.mock('../api', () => ({
  networkApi: {
    listPartners: vi.fn(),
    getMemberNode: vi.fn(),
    listInvites: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    deleteInvite: vi.fn(),
  },
}));

const PARTNER: PartnerNetworkSummary = {
  partnerMemberId: 'p-1',
  memberNumber: 'M-P1',
  name: 'Pat Partner',
  directMemberCount: 3,
  totalNetworkCount: 12,
};

function invite(overrides: Partial<Invite> = {}): Invite {
  return {
    id: 'i-1',
    code: 'ABCD1234',
    role: 'MEMBER',
    status: 'PENDING',
    assignedAdminId: null,
    assignedPartnerId: null,
    invitedByUserId: null,
    expiresAt: null,
    usedByUserId: null,
    usedByMemberId: null,
    usedAt: null,
    revokedAt: null,
    createdAt: '2026-08-08T00:00:00.000Z',
    ...overrides,
  };
}

function invitesPage(items: Invite[]): PaginatedInvites {
  return { items, page: 1, pageSize: 20, total: items.length, totalPages: 1 };
}

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <NetworkPage />
    </MemoryRouter>,
  );
}

describe('NetworkPage', () => {
  beforeEach(() => {
    vi.mocked(networkApi.listPartners).mockReset().mockResolvedValue([PARTNER]);
    vi.mocked(networkApi.listInvites)
      .mockReset()
      .mockResolvedValue(invitesPage([invite()]));
    vi.mocked(networkApi.createInvite)
      .mockReset()
      .mockResolvedValue(invite({ code: 'NEW12345' }));
    vi.mocked(networkApi.revokeInvite)
      .mockReset()
      .mockResolvedValue(invite({ status: 'REVOKED' }));
    vi.mocked(networkApi.deleteInvite)
      .mockReset()
      .mockResolvedValue({ code: 'ABCD1234', deleted: true });
    useSessionStore.setState({ permissions: ['network.read', 'invite.send'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders the partners list from the backend', async () => {
    renderPage();
    expect(await screen.findByText('Pat Partner')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // total network
  });

  it('shows an error state when partners fail to load', async () => {
    vi.mocked(networkApi.listPartners).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText(/Could not load partners/i)).toBeInTheDocument();
  });

  it('lists invites on the Invites tab', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Invites' }));
    expect(await screen.findByText('ABCD1234')).toBeInTheDocument();
  });

  it('creates a member invite with the selected partner through the backend', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Invites' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Create invite' }));

    const dialog = await screen.findByRole('dialog');
    // A Member invite (the default role) now requires selecting a Partner.
    const partnerSelect = await within(dialog).findByLabelText('Assigned partner');
    fireEvent.change(partnerSelect, { target: { value: 'p-1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create invite' }));

    await waitFor(() => expect(networkApi.createInvite).toHaveBeenCalledTimes(1));
    expect(networkApi.createInvite).toHaveBeenCalledWith({
      role: 'MEMBER',
      assignedPartnerId: 'p-1',
    });
    expect(await screen.findByText('NEW12345')).toBeInTheDocument();
  });

  it('revokes an invite through the backend after confirmation', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Invites' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));

    expect(await screen.findByText('Revoke invite?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(networkApi.revokeInvite).toHaveBeenCalledTimes(1));
    expect(networkApi.revokeInvite).toHaveBeenCalledWith('ABCD1234');
  });

  it('hides the Invites tab without invite.send', async () => {
    useSessionStore.setState({ permissions: ['network.read'] });
    renderPage();
    await screen.findByText('Pat Partner');
    expect(screen.queryByRole('tab', { name: 'Invites' })).not.toBeInTheDocument();
  });
});
