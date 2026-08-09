/* eslint-disable @typescript-eslint/unbound-method -- `walletApi`/`financeApi` are
   vi.mocks of standalone vi.fn()s, so referencing their members is safe. */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import type {
  FinancialLimitsData,
  FinancialRequestData,
  WalletDetail,
} from '@superdreams/api-client';

import { walletApi } from '../api';
import { financeApi } from '../finance-api';
import { WithdrawDialog } from './WithdrawDialog';

vi.mock('../api', () => ({
  walletApi: { getMine: vi.fn() },
}));

vi.mock('../finance-api', () => ({
  financeApi: {
    getLimits: vi.fn(),
    listMyRequests: vi.fn(),
    createWithdrawal: vi.fn(),
    createDeposit: vi.fn(),
  },
}));

const LIMITS: FinancialLimitsData = {
  minDepositUnits: 1,
  maxDepositUnits: 100,
  minWithdrawCents: 3000,
  earlyWithdrawAllowed: true,
  earlyWithdrawFeeBps: 1000,
  processingMinDays: 3,
  processingMaxDays: 4,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function financialWallet(availableMinor: number): WalletDetail {
  return {
    id: 'fw-1',
    walletNumber: 'W-FIN-1',
    memberId: 'm-1',
    kind: 'FINANCIAL',
    currencyCode: 'USD',
    status: 'ACTIVE',
    balance: { currencyCode: 'USD', availableMinor, heldMinor: 0, totalMinor: availableMinor },
    openedAt: '2026-01-01T00:00:00.000Z',
    closedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    limits: null,
  };
}

function pendingWithdrawal(units: number): FinancialRequestData {
  return {
    id: 'wdr-1',
    requestNumber: 'WDR-0001',
    memberId: 'm-1',
    walletId: 'fw-1',
    type: 'WITHDRAW',
    status: 'PENDING',
    amountCents: units * 3000,
    units,
    currencyCode: 'USD',
    early: false,
    reason: null,
    decidedBy: null,
    decidedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function unitsInput(): HTMLElement {
  return screen.getByPlaceholderText('e.g. 5');
}

describe('WithdrawDialog', () => {
  beforeEach(() => {
    // 10 units ($300) available by default.
    vi.mocked(walletApi.getMine).mockResolvedValue(financialWallet(30_000));
    vi.mocked(financeApi.getLimits).mockResolvedValue(LIMITS);
    vi.mocked(financeApi.createWithdrawal).mockReset();
  });

  it('shows the current available financial balance', async () => {
    renderWithProviders(<WithdrawDialog isOpen onClose={() => {}} />);
    expect(await screen.findByText('10 units · $300.00')).toBeInTheDocument();
  });

  it('converts units to USD for the requested amount (1 unit = $30)', async () => {
    renderWithProviders(<WithdrawDialog isOpen onClose={() => {}} />);
    await screen.findByText('10 units · $300.00');

    fireEvent.change(unitsInput(), { target: { value: '4' } });

    expect(screen.getByText('4 units · $120.00')).toBeInTheDocument(); // withdrawal amount
    expect(screen.getByText('6 units · $180.00')).toBeInTheDocument(); // remaining balance
  });

  it('rejects a below-minimum withdrawal client-side', async () => {
    vi.mocked(financeApi.getLimits).mockResolvedValue({ ...LIMITS, minWithdrawCents: 6_000 });
    renderWithProviders(<WithdrawDialog isOpen onClose={() => {}} />);
    await screen.findByText(/Minimum withdrawal/i);

    fireEvent.change(unitsInput(), { target: { value: '1' } });

    expect(screen.getByText(/Minimum withdrawal is \$60\.00/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit withdrawal/i })).toBeDisabled();
    expect(financeApi.createWithdrawal).not.toHaveBeenCalled();
  });

  it('rejects an amount greater than the available balance', async () => {
    renderWithProviders(<WithdrawDialog isOpen onClose={() => {}} />);
    await screen.findByText('10 units · $300.00');

    fireEvent.change(unitsInput(), { target: { value: '11' } });

    expect(screen.getByText(/exceeds your available balance/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit withdrawal/i })).toBeDisabled();
    expect(financeApi.createWithdrawal).not.toHaveBeenCalled();
  });

  it('submits a valid withdrawal once and shows the awaiting-approval state', async () => {
    vi.mocked(financeApi.createWithdrawal).mockResolvedValue(pendingWithdrawal(4));
    renderWithProviders(<WithdrawDialog isOpen onClose={() => {}} />);
    await screen.findByText('10 units · $300.00');

    fireEvent.change(unitsInput(), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /submit withdrawal/i }));

    await screen.findByText(/awaiting approval/i);
    expect(financeApi.createWithdrawal).toHaveBeenCalledTimes(1);
    expect(financeApi.createWithdrawal).toHaveBeenCalledWith({ units: 4 });
    // The form (and its submit control) is replaced by the success state.
    expect(screen.queryByRole('button', { name: /submit withdrawal/i })).not.toBeInTheDocument();
  });
});
