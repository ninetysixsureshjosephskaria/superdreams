/* eslint-disable @typescript-eslint/unbound-method -- `financeApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import type { DepositTrancheData, FinancialLimitsData } from '@superdreams/api-client';

import { financeApi } from '../finance-api';
import { TranchesPanel } from './TranchesPanel';

vi.mock('../finance-api', () => ({
  financeApi: {
    listMyTranches: vi.fn(),
    getLimits: vi.fn(),
    earlyUnlockTranche: vi.fn(),
    listMyRequests: vi.fn(),
  },
}));

const LIMITS: FinancialLimitsData = {
  minDepositUnits: 1,
  maxDepositUnits: 100,
  minWithdrawCents: 3000,
  earlyWithdrawAllowed: true,
  earlyWithdrawFeeBps: 1000, // 10%
  processingMinDays: 3,
  processingMaxDays: 4,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function tranche(overrides: Partial<DepositTrancheData> = {}): DepositTrancheData {
  return {
    id: 'trn-1',
    trancheNumber: 'TRN-0001',
    memberId: 'm-1',
    walletId: 'fw-1',
    depositRequestId: 'dep-1',
    principalCents: 30_000, // 10 units / $300
    bonusBps: 500, // 5%
    bonusCents: 1_500, // $15
    currencyCode: 'USD',
    lockDays: 30,
    maturesAt: '2026-09-01T00:00:00.000Z',
    status: 'LOCKED',
    unlockedAt: null,
    feeCents: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TranchesPanel + EarlyUnlockDialog', () => {
  beforeEach(() => {
    vi.mocked(financeApi.getLimits).mockResolvedValue(LIMITS);
    vi.mocked(financeApi.earlyUnlockTranche).mockReset();
  });

  it('lists a locked tranche with its details and an early-unlock action', async () => {
    vi.mocked(financeApi.listMyTranches).mockResolvedValue([tranche()]);
    renderWithProviders(<TranchesPanel />);

    expect(await screen.findByText('10 units · $300.00')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('5% · $15.00')).toBeInTheDocument(); // bonus
    expect(screen.getByText('30 days')).toBeInTheDocument(); // lock period
    expect(screen.getByRole('button', { name: 'Early-unlock' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no tranches', async () => {
    vi.mocked(financeApi.listMyTranches).mockResolvedValue([]);
    renderWithProviders(<TranchesPanel />);
    expect(await screen.findByText(/No tranches yet/i)).toBeInTheDocument();
  });

  it('does not offer early-unlock for a non-locked tranche', async () => {
    vi.mocked(financeApi.listMyTranches).mockResolvedValue([
      tranche({ id: 'trn-2', status: 'MATURED' }),
    ]);
    renderWithProviders(<TranchesPanel />);
    await screen.findByText('10 units · $300.00');
    expect(screen.getByText('Matured')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Early-unlock' })).not.toBeInTheDocument();
  });

  it('discloses the configured fee and bonus forfeiture before confirmation', async () => {
    vi.mocked(financeApi.listMyTranches).mockResolvedValue([tranche()]);
    renderWithProviders(<TranchesPanel />);
    await screen.findByText('10 units · $300.00');

    fireEvent.click(screen.getByRole('button', { name: 'Early-unlock' }));

    expect(await screen.findByText('Early-unlock fee (10%)')).toBeInTheDocument();
    expect(screen.getByText('- $30.00')).toBeInTheDocument(); // 10% of $300
    expect(screen.getByText('Bonus forfeited')).toBeInTheDocument();
    expect(screen.getByText('- $15.00')).toBeInTheDocument(); // forfeited bonus
  });

  it('confirms early-unlock once and shows the success state', async () => {
    vi.mocked(financeApi.listMyTranches).mockResolvedValue([tranche()]);
    vi.mocked(financeApi.earlyUnlockTranche).mockResolvedValue(
      tranche({ status: 'LIQUIDATED', feeCents: 3_000, bonusCents: 0, unlockedAt: '2026-08-08' }),
    );
    renderWithProviders(<TranchesPanel />);
    await screen.findByText('10 units · $300.00');

    fireEvent.click(screen.getByRole('button', { name: 'Early-unlock' }));
    await screen.findByText('Early-unlock fee (10%)');
    fireEvent.click(screen.getByRole('button', { name: /confirm early-unlock/i }));

    await screen.findByText(/has been early-unlocked/i);
    expect(financeApi.earlyUnlockTranche).toHaveBeenCalledTimes(1);
    expect(financeApi.earlyUnlockTranche).toHaveBeenCalledWith('trn-1');
    expect(screen.queryByRole('button', { name: /confirm early-unlock/i })).not.toBeInTheDocument();
  });
});
