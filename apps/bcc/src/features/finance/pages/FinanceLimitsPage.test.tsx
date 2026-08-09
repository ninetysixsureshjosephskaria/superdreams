/* eslint-disable @typescript-eslint/unbound-method -- `financeApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type FinancialLimitsData } from '@superdreams/api-client';

import { financeApi } from '../api';
import FinanceLimitsPage from './FinanceLimitsPage';

vi.mock('../api', () => ({
  financeApi: { getLimits: vi.fn(), updateLimits: vi.fn() },
}));

const LIMITS: FinancialLimitsData = {
  minDepositUnits: 1,
  maxDepositUnits: 10_000,
  minWithdrawCents: 3_000,
  earlyWithdrawAllowed: true,
  earlyWithdrawFeeBps: 1_000,
  processingMinDays: 3,
  processingMaxDays: 4,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <FinanceLimitsPage />
    </MemoryRouter>,
  );
}

describe('FinanceLimitsPage', () => {
  beforeEach(() => {
    vi.mocked(financeApi.getLimits).mockReset().mockResolvedValue(LIMITS);
    vi.mocked(financeApi.updateLimits).mockReset().mockResolvedValue(LIMITS);
    useSessionStore.setState({ permissions: ['finance.read', 'finance.limits.manage'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('loads current limits into the form', async () => {
    renderPage();
    const min = await screen.findByLabelText<HTMLInputElement>('Minimum deposit (units)');
    expect(min.value).toBe('1');
    expect(screen.getByLabelText<HTMLInputElement>('Early-unlock fee (%)').value).toBe('10');
  });

  it('saves converted values to the backend', async () => {
    renderPage();
    await screen.findByLabelText('Minimum deposit (units)');

    fireEvent.click(screen.getByRole('button', { name: 'Save limits' }));

    await waitFor(() => expect(financeApi.updateLimits).toHaveBeenCalledTimes(1));
    expect(financeApi.updateLimits).toHaveBeenCalledWith({
      minDepositUnits: 1,
      maxDepositUnits: 10_000,
      minWithdrawCents: 3_000,
      earlyWithdrawAllowed: true,
      earlyWithdrawFeeBps: 1_000,
      processingMinDays: 3,
      processingMaxDays: 4,
    });
  });

  it('blocks saving an out-of-range fee', async () => {
    renderPage();
    await screen.findByLabelText('Early-unlock fee (%)');

    fireEvent.change(screen.getByLabelText('Early-unlock fee (%)'), { target: { value: '150' } });

    expect(screen.getByText(/between 0 and 100%/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save limits' })).toBeDisabled();
    expect(financeApi.updateLimits).not.toHaveBeenCalled();
  });

  it('hides the save action without finance.limits.manage', async () => {
    useSessionStore.setState({ permissions: ['finance.read'] });
    renderPage();
    await screen.findByLabelText('Minimum deposit (units)');
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save limits' })).not.toBeInTheDocument();
  });

  it('surfaces an update error', async () => {
    vi.mocked(financeApi.updateLimits).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    renderPage();
    await screen.findByLabelText('Minimum deposit (units)');
    fireEvent.click(screen.getByRole('button', { name: 'Save limits' }));
    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });
});
