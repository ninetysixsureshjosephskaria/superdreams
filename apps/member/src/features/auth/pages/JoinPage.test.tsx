/* eslint-disable @typescript-eslint/unbound-method -- `networkApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { networkApi } from '@/services';
import type * as ServicesModule from '@/services';
import { renderWithProviders } from '@/test/test-utils';
import type { Invite, InvitePreview } from '@superdreams/api-client';

import JoinPage from './JoinPage';

vi.mock('@/services', async () => {
  const actual = await vi.importActual<typeof ServicesModule>('@/services');
  return {
    ...actual,
    networkApi: { previewInvite: vi.fn(), registerWithInvite: vi.fn() },
  };
});

function renderPage(initialEntries: string[]): RenderResult {
  return renderWithProviders(
    <MemoryRouter initialEntries={initialEntries}>
      <JoinPage />
    </MemoryRouter>,
  );
}

function fillForm(): void {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'ada@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: 'password123' },
  });
}

const previewOf = (over: Partial<InvitePreview> = {}): InvitePreview => ({
  role: 'PARTNER',
  status: 'PENDING',
  valid: true,
  ...over,
});

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

describe('JoinPage', () => {
  beforeEach(() => {
    vi.mocked(networkApi.previewInvite).mockResolvedValue(previewOf());
    vi.mocked(networkApi.registerWithInvite).mockResolvedValue(INVITE);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('previews the invite, shows the Partner role, then registers and confirms activation', async () => {
    renderPage(['/join?code=ABC123']);

    await waitFor(() => expect(networkApi.previewInvite).toHaveBeenCalledWith('ABC123'));
    // Role context from the preview is shown.
    expect(await screen.findByText(/invited to join as a Partner/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /accept your Partner invitation/i }),
    ).toBeInTheDocument();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(networkApi.registerWithInvite).toHaveBeenCalledWith('ABC123', {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'password123',
      });
    });
    expect(await screen.findByText(/you.re all set/i)).toBeInTheDocument();
  });

  it('shows the Member role for a MEMBER invitation', async () => {
    vi.mocked(networkApi.previewInvite).mockResolvedValue(previewOf({ role: 'MEMBER' }));
    renderPage(['/join?code=MEM123']);
    expect(await screen.findByText(/invited to join as a Member/i)).toBeInTheDocument();
  });

  it('blocks the form and explains when the invitation is no longer valid', async () => {
    vi.mocked(networkApi.previewInvite).mockResolvedValue(
      previewOf({ status: 'EXPIRED', valid: false }),
    );
    renderPage(['/join?code=OLD123']);

    expect(await screen.findByText(/invitation no longer valid/i)).toBeInTheDocument();
    expect(screen.getByText(/this invitation has expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument();
    expect(networkApi.registerWithInvite).not.toHaveBeenCalled();
  });

  it('shows an incomplete-link message and previews nothing when ?code= is missing', () => {
    renderPage(['/join']);

    expect(screen.getByText(/invitation link incomplete/i)).toBeInTheDocument();
    expect(networkApi.previewInvite).not.toHaveBeenCalled();
    expect(networkApi.registerWithInvite).not.toHaveBeenCalled();
  });
});
