/* eslint-disable @typescript-eslint/unbound-method -- `walletApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { walletApi } from '@/features/wallet/api';
import { renderWithProviders } from '@/test/test-utils';
import {
  ApiError,
  type PaginatedTransactions,
  type WalletTransactionData,
} from '@superdreams/api-client';

import EarningsPage from './EarningsPage';

vi.mock('@/features/wallet/api', () => ({
  walletApi: { listMyTransactions: vi.fn() },
}));

function credit(reference: string, amountMinor: number, id = reference): WalletTransactionData {
  return {
    id,
    walletId: 'fw-1',
    reference,
    type: 'CREDIT',
    direction: 'CREDIT',
    status: 'POSTED',
    amountMinor,
    currencyCode: 'USD',
    availableAfterMinor: amountMinor,
    heldAfterMinor: 0,
    description: null,
    holdId: null,
    reversalOfId: null,
    createdBy: null,
    createdAt: '2026-08-08T00:00:00.000Z',
  };
}

const EARNINGS: WalletTransactionData[] = [
  credit('TXN-C-dep1', 5_000), // commission $50
  credit('TXN-R-m2', 2_000), // referral $20
  credit('TXN-P-2026-08-08-m1', 1_000), // daily profit $10
  credit('TXN-B-TRN1', 1_500), // bonus $15
  credit('TXN-A-m1', 3_000), // activation $30
  credit('DEP-123', 30_000), // deposit credit — NOT an earning
];

function page(items: WalletTransactionData[], totalPages = 1): PaginatedTransactions {
  return { items, page: 1, pageSize: 100, total: items.length, totalPages };
}

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <EarningsPage />
    </MemoryRouter>,
  );
}

describe('EarningsPage', () => {
  beforeEach(() => {
    vi.mocked(walletApi.listMyTransactions).mockResolvedValue(page(EARNINGS));
  });

  it('renders the earnings overview with per-category totals', async () => {
    renderPage();
    expect(await screen.findByText('$125.00')).toBeInTheDocument(); // total 50+20+10+15+30
    expect(screen.getByText('$50.00')).toBeInTheDocument(); // commission
    expect(screen.getByText('$20.00')).toBeInTheDocument(); // referral
    expect(screen.getByText('$10.00')).toBeInTheDocument(); // daily profit
    expect(screen.getByText('$15.00')).toBeInTheDocument(); // bonus
    expect(screen.getByText('$30.00')).toBeInTheDocument(); // activation bonus
  });

  it('lists earning credits in history and excludes non-earning credits', async () => {
    renderPage();
    expect(
      await screen.findByText(
        'TXN-C-dep1 · ' + new Date('2026-08-08T00:00:00.000Z').toLocaleString(),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('+$50.00')).toBeInTheDocument();
    // The deposit credit is not an earning and must not appear.
    expect(screen.queryByText(/DEP-123/)).not.toBeInTheDocument();
  });

  it('filters history by earning category', async () => {
    renderPage();
    await screen.findByText('+$50.00');

    fireEvent.change(screen.getByLabelText('Filter by earning type'), {
      target: { value: 'COMMISSION' },
    });

    expect(screen.getByText('+$50.00')).toBeInTheDocument(); // commission stays
    expect(screen.queryByText('+$10.00')).not.toBeInTheDocument(); // profit filtered out
  });

  it('shows a loading state while the ledger is pending', () => {
    vi.mocked(walletApi.listMyTransactions).mockReturnValue(
      new Promise<PaginatedTransactions>(() => {
        /* never resolves */
      }),
    );
    renderPage();
    expect(screen.getByText(/Loading your earnings/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no earnings', async () => {
    vi.mocked(walletApi.listMyTransactions).mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText(/No earnings yet/i)).toBeInTheDocument();
  });

  it('shows an error state when the ledger request fails', async () => {
    vi.mocked(walletApi.listMyTransactions).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText(/Could not load your earnings/i)).toBeInTheDocument();
  });

  it('handles a forbidden response as an error state', async () => {
    vi.mocked(walletApi.listMyTransactions).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Forbidden', status: 403 }),
    );
    renderPage();
    expect(await screen.findByText(/Could not load your earnings/i)).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
  });
});
