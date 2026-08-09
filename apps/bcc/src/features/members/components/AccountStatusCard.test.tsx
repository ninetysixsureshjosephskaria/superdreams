/* eslint-disable @typescript-eslint/unbound-method -- `membersApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type MemberAccountView } from '@superdreams/api-client';

import { membersApi } from '../api';
import { AccountStatusCard } from './AccountStatusCard';

vi.mock('../api', () => ({
  membersApi: { getAccount: vi.fn(), changeAccountStatus: vi.fn() },
}));

function account(overrides: Partial<MemberAccountView> = {}): MemberAccountView {
  return {
    memberId: 'm-1',
    linked: true,
    userId: 'u-1',
    accountStatus: 'ACTIVE',
    emailVerified: true,
    email: 'a@b.test',
    ...overrides,
  };
}

describe('AccountStatusCard', () => {
  beforeEach(() => {
    vi.mocked(membersApi.getAccount).mockReset().mockResolvedValue(account());
    vi.mocked(membersApi.changeAccountStatus).mockReset().mockResolvedValue(account());
    useSessionStore.setState({ permissions: ['account.status'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('displays account status and the full set of actions incl. Inactivate', async () => {
    renderWithProviders(<AccountStatusCard id="m-1" />);
    expect(await screen.findByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inactivate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    // Already ACTIVE → Reactivate disabled.
    expect(screen.getByRole('button', { name: 'Reactivate' })).toBeDisabled();
  });

  it('hides actions without account.status permission', async () => {
    useSessionStore.setState({ permissions: [] });
    renderWithProviders(<AccountStatusCard id="m-1" />);
    await screen.findByText('ACTIVE');
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
  });

  it('confirms then calls the backend with the reason', async () => {
    renderWithProviders(<AccountStatusCard id="m-1" />);
    await screen.findByText('ACTIVE');

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Fraud review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));

    // Confirmation dialog appears before the mutation runs.
    expect(await screen.findByText('Suspend login account?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));

    await waitFor(() => expect(membersApi.changeAccountStatus).toHaveBeenCalledTimes(1));
    expect(membersApi.changeAccountStatus).toHaveBeenCalledWith('m-1', {
      status: 'SUSPENDED',
      reason: 'Fraud review',
    });
  });

  it('keeps the dialog open when the backend rejects', async () => {
    vi.mocked(membersApi.changeAccountStatus).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Invalid transition', status: 422 }),
    );
    renderWithProviders(<AccountStatusCard id="m-1" />);
    await screen.findByText('ACTIVE');

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await screen.findByText('Deactivate login account?');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(membersApi.changeAccountStatus).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Deactivate login account?')).toBeInTheDocument(); // still open
  });

  it('disables the confirm button while a change is in flight (double-submit guard)', async () => {
    vi.mocked(membersApi.changeAccountStatus).mockReturnValue(
      new Promise<MemberAccountView>(() => {
        /* never resolves */
      }),
    );
    renderWithProviders(<AccountStatusCard id="m-1" />);
    await screen.findByText('ACTIVE');

    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    await screen.findByText('Suspend login account?');
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Suspend' });
    fireEvent.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    expect(membersApi.changeAccountStatus).toHaveBeenCalledTimes(1);
  });
});
