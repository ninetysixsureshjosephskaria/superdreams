/* eslint-disable @typescript-eslint/unbound-method -- `authApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type * as ReactRouterDom from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/services';
import type * as Services from '@/services';
import { useNotificationStore, useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError } from '@superdreams/api-client';

import { ChangePasswordCard } from './ChangePasswordCard';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/services', async () => {
  const actual = await vi.importActual<typeof Services>('@/services');
  return { ...actual, authApi: { changePassword: vi.fn() } };
});

function fill(current: string, next: string, confirm: string): void {
  fireEvent.change(screen.getByLabelText(/^current password/i), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(/^confirm new password/i), { target: { value: confirm } });
}

describe('ChangePasswordCard', () => {
  const notify = vi.fn();

  beforeEach(() => {
    navigate.mockReset();
    notify.mockReset();
    vi.mocked(authApi.changePassword).mockReset().mockResolvedValue({ message: 'ok' });
    useNotificationStore.setState({ notify });
    useSessionStore.setState({
      user: { id: 'u-1', email: 'admin@superdreams.com' } as never,
      permissions: [],
    });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('changes the password: sends current+new, clears session and redirects to login', async () => {
    renderWithProviders(<ChangePasswordCard />);
    fill('OldPass123', 'NewPass123', 'NewPass123');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledTimes(1));
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login', { replace: true }));
    expect(useSessionStore.getState().user).toBeNull();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }));
  });

  it('surfaces the backend error when the current password is incorrect', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      new ApiError({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect.',
        status: 400,
      }),
    );
    renderWithProviders(<ChangePasswordCard />);
    fill('WrongPass123', 'NewPass123', 'NewPass123');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(useSessionStore.getState().user).not.toBeNull();
  });

  it('blocks submission when the confirmation does not match', async () => {
    renderWithProviders(<ChangePasswordCard />);
    fill('OldPass123', 'NewPass123', 'Different123');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('enforces the password policy on the new password', async () => {
    renderWithProviders(<ChangePasswordCard />);
    fill('OldPass123', 'weak', 'weak');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password as the new one', async () => {
    renderWithProviders(<ChangePasswordCard />);
    fill('SamePass123', 'SamePass123', 'SamePass123');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(
      await screen.findByText('Choose a password different from your current one.'),
    ).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });
});
