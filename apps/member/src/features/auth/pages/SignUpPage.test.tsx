/* eslint-disable @typescript-eslint/unbound-method -- `authApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/services';
import type * as ServicesModule from '@/services';
import { renderWithProviders } from '@/test/test-utils';

import SignUpPage from './SignUpPage';

vi.mock('@/services', async () => {
  const actual = await vi.importActual<typeof ServicesModule>('@/services');
  return {
    ...actual,
    authApi: { register: vi.fn() },
  };
});

function renderPage(initialEntries: string[]): RenderResult {
  return renderWithProviders(
    <MemoryRouter initialEntries={initialEntries}>
      <SignUpPage />
    </MemoryRouter>,
  );
}

/** Fills the required sign-up fields with valid values. */
function fillForm(): void {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Lovelace' } });
  fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'ada@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: 'password123' },
  });
}

const FORM_FIELDS = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'password123',
};

describe('SignUpPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(authApi.register).mockResolvedValue({
      message: 'Check your email',
      email: 'ada@example.com',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows the referral banner and sends referralCode from the URL', async () => {
    renderPage(['/signup?ref=TESTCODE']);

    expect(screen.getByText(/joining via a referral invitation/i)).toBeInTheDocument();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        ...FORM_FIELDS,
        referralCode: 'TESTCODE',
      });
    });
    // Cleared on success so a later signup does not reuse a stale code.
    expect(sessionStorage.getItem('sd:ref')).toBeNull();
  });

  it('persists a URL ref to sessionStorage and reuses it on a plain /signup', async () => {
    // First visit carries the code and persists it.
    const first = renderPage(['/signup?ref=ABC']);
    expect(sessionStorage.getItem('sd:ref')).toBe('ABC');
    first.unmount();

    // Second visit has no ?ref= but should read it back from sessionStorage.
    renderPage(['/signup']);
    expect(screen.getByText(/joining via a referral invitation/i)).toBeInTheDocument();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        ...FORM_FIELDS,
        referralCode: 'ABC',
      });
    });
  });

  it('shows no banner and omits referralCode with a clean session', async () => {
    renderPage(['/signup']);

    expect(screen.queryByText(/joining via a referral invitation/i)).not.toBeInTheDocument();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(FORM_FIELDS);
    });
    const payload = vi.mocked(authApi.register).mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty('referralCode');
  });
});
