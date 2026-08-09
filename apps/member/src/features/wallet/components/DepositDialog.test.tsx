/* eslint-disable @typescript-eslint/unbound-method -- `financeApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members for assertions/setup is safe. */
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import type { FinancialLimitsData, FinancialRequestData } from '@superdreams/api-client';

import { financeApi } from '../finance-api';
import { DepositDialog } from './DepositDialog';

vi.mock('../finance-api', () => ({
  financeApi: {
    getLimits: vi.fn(),
    listMyRequests: vi.fn(),
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

function pendingRequest(units: number): FinancialRequestData {
  return {
    id: 'req-1',
    requestNumber: 'FR-0001',
    memberId: 'member-1',
    walletId: null,
    type: 'DEPOSIT',
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
  return screen.getByPlaceholderText('e.g. 10');
}

describe('DepositDialog', () => {
  beforeEach(() => {
    vi.mocked(financeApi.getLimits).mockResolvedValue(LIMITS);
    vi.mocked(financeApi.createDeposit).mockReset();
  });

  it('shows the live USD equivalent for the entered units (1 unit = $30)', async () => {
    renderWithProviders(<DepositDialog isOpen onClose={() => {}} />);
    await screen.findByText(/Allowed range/i);

    fireEvent.change(unitsInput(), { target: { value: '10' } });

    expect(screen.getByText('$300.00')).toBeInTheDocument();
  });

  it('blocks submission and shows an error when above the backend maximum', async () => {
    renderWithProviders(<DepositDialog isOpen onClose={() => {}} />);
    await screen.findByText(/Allowed range/i);

    fireEvent.change(unitsInput(), { target: { value: '101' } });

    expect(screen.getByText(/Maximum deposit is 100 units/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit deposit/i })).toBeDisabled();
    expect(financeApi.createDeposit).not.toHaveBeenCalled();
  });

  it('always explains that funds are credited only after approval', async () => {
    renderWithProviders(<DepositDialog isOpen onClose={() => {}} />);
    await screen.findByText(/Allowed range/i);
    expect(screen.getByText(/credited only after your request is approved/i)).toBeInTheDocument();
  });

  it('submits the deposit once and shows a pending-approval success state', async () => {
    vi.mocked(financeApi.createDeposit).mockResolvedValue(pendingRequest(10));
    renderWithProviders(<DepositDialog isOpen onClose={() => {}} />);
    await screen.findByText(/Allowed range/i);

    fireEvent.change(unitsInput(), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /submit deposit/i }));

    await screen.findByText(/pending approval/i);
    expect(financeApi.createDeposit).toHaveBeenCalledTimes(1);
    expect(financeApi.createDeposit).toHaveBeenCalledWith({ units: 10 });
    // The form is replaced by the success state — no second submit control remains.
    expect(screen.queryByRole('button', { name: /submit deposit/i })).not.toBeInTheDocument();
  });
});
