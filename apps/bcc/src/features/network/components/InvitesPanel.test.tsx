/* eslint-disable @typescript-eslint/unbound-method -- `networkApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import {
  ApiError,
  type Invite,
  type PaginatedInvites,
  type PartnerNetworkSummary,
} from '@superdreams/api-client';

import { networkApi } from '../api';
import { InvitesPanel } from './InvitesPanel';

vi.mock('../api', () => ({
  networkApi: {
    listPartners: vi.fn(),
    listInvites: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
    deleteInvite: vi.fn(),
  },
}));

const PARTNER_A: PartnerNetworkSummary = {
  partnerMemberId: 'p-1',
  memberNumber: 'M-P1',
  name: 'Pat Partner',
  directMemberCount: 3,
  totalNetworkCount: 12,
};

const PARTNER_B: PartnerNetworkSummary = {
  partnerMemberId: 'p-2',
  memberNumber: 'M-P2',
  name: 'Robin Partner',
  directMemberCount: 1,
  totalNetworkCount: 4,
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

/** Renders the panel, opens the Create-invite dialog, and returns its element. */
async function openDialog(): Promise<HTMLElement> {
  renderWithProviders(<InvitesPanel />);
  fireEvent.click(await screen.findByRole('button', { name: 'Create invite' }));
  return screen.findByRole('dialog');
}

describe('InvitesPanel — Create invite / partner assignment (M2)', () => {
  beforeEach(() => {
    vi.mocked(networkApi.listPartners).mockReset().mockResolvedValue([PARTNER_A, PARTNER_B]);
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT show the Partner selector for a Partner invite', async () => {
    const dialog = await openDialog();
    // The selector is present for the default MEMBER role...
    await within(dialog).findByLabelText('Assigned partner');

    // ...and disappears entirely once the role is switched to PARTNER.
    fireEvent.change(within(dialog).getByLabelText('Invite role'), {
      target: { value: 'PARTNER' },
    });
    await waitFor(() =>
      expect(within(dialog).queryByLabelText('Assigned partner')).not.toBeInTheDocument(),
    );
  });

  it('shows the Partner selector for a Member invite', async () => {
    const dialog = await openDialog();
    // MEMBER is the default role.
    expect(await within(dialog).findByLabelText('Assigned partner')).toBeInTheDocument();
  });

  it('loads eligible partners into the selector', async () => {
    const dialog = await openDialog();
    const select = await within(dialog).findByLabelText('Assigned partner');

    expect(within(select).getByRole('option', { name: 'Pat Partner (M-P1)' })).toBeInTheDocument();
    expect(
      within(select).getByRole('option', { name: 'Robin Partner (M-P2)' }),
    ).toBeInTheDocument();
    expect(networkApi.listPartners).toHaveBeenCalledTimes(1);
  });

  it('submits the selected partner id as assignedPartnerId', async () => {
    const dialog = await openDialog();
    const select = await within(dialog).findByLabelText('Assigned partner');
    fireEvent.change(select, { target: { value: 'p-2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create invite' }));

    await waitFor(() => expect(networkApi.createInvite).toHaveBeenCalledTimes(1));
    expect(networkApi.createInvite).toHaveBeenCalledWith({
      role: 'MEMBER',
      assignedPartnerId: 'p-2',
    });
  });

  it('blocks submission of a Member invite when no partner is chosen', async () => {
    const dialog = await openDialog();
    await within(dialog).findByLabelText('Assigned partner');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create invite' }));

    expect(
      await within(dialog).findByText(/select a partner for this member invitation/i),
    ).toBeInTheDocument();
    expect(networkApi.createInvite).not.toHaveBeenCalled();
  });

  it('handles a partner-list load failure inside the dialog', async () => {
    vi.mocked(networkApi.listPartners).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    const dialog = await openDialog();

    expect(await within(dialog).findByText(/could not load partners/i)).toBeInTheDocument();
    // With no loadable partner, the member invite cannot be submitted.
    expect(within(dialog).getByRole('button', { name: 'Create invite' })).toBeDisabled();
  });

  it('explains when there are no partners to assign', async () => {
    vi.mocked(networkApi.listPartners).mockResolvedValue([]);
    const dialog = await openDialog();

    expect(await within(dialog).findByText(/no partners available/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create invite' })).toBeDisabled();
    expect(networkApi.createInvite).not.toHaveBeenCalled();
  });
});
