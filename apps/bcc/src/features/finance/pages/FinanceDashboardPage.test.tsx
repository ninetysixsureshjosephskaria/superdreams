/* eslint-disable @typescript-eslint/unbound-method -- `financeApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { screen, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import {
  ApiError,
  type FinancialLimitsData,
  type FinancialRequestData,
  type ListFinancialRequestsParams,
  type PaginatedFinancialRequests,
} from '@superdreams/api-client';

import { financeApi } from '../api';
import FinanceDashboardPage from './FinanceDashboardPage';

vi.mock('../api', () => ({
  financeApi: { listRequests: vi.fn(), getLimits: vi.fn() },
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

function request(overrides: Partial<FinancialRequestData>): FinancialRequestData {
  return {
    id: 'req-1',
    requestNumber: 'DEP-1001',
    memberId: 'm-1',
    walletId: 'fw-1',
    type: 'DEPOSIT',
    status: 'PENDING',
    amountCents: 30_000,
    units: 10,
    currencyCode: 'USD',
    early: false,
    reason: null,
    decidedBy: null,
    decidedAt: null,
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    ...overrides,
  };
}

function page(items: FinancialRequestData[], total = items.length): PaginatedFinancialRequests {
  return { items, page: 1, pageSize: Math.max(items.length, 1), total, totalPages: 1 };
}

function mockQueue() {
  vi.mocked(financeApi.listRequests).mockImplementation((params?: ListFinancialRequestsParams) => {
    if (params?.status === 'PENDING' && params?.type === 'DEPOSIT')
      return Promise.resolve(page([], 3));
    if (params?.status === 'PENDING' && params?.type === 'WITHDRAW')
      return Promise.resolve(page([], 2));
    if (params?.status === 'HOLD') return Promise.resolve(page([], 1));
    return Promise.resolve(page([request({})], 1)); // recent list
  });
  vi.mocked(financeApi.getLimits).mockResolvedValue(LIMITS);
}

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <FinanceDashboardPage />
    </MemoryRouter>,
  );
}

describe('FinanceDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(financeApi.listRequests).mockReset();
    vi.mocked(financeApi.getLimits).mockReset();
  });

  it('renders action-queue counts from the backend totals', async () => {
    mockQueue();
    renderPage();
    expect(await screen.findByText('3')).toBeInTheDocument(); // pending deposits
    expect(screen.getByText('2')).toBeInTheDocument(); // pending withdrawals
    expect(screen.getByText('1')).toBeInTheDocument(); // on hold
  });

  it('renders the recent requests table with real request data', async () => {
    mockQueue();
    renderPage();
    expect(await screen.findByText('DEP-1001')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument(); // 30000 cents
  });

  it('renders the limits policy from the backend', async () => {
    mockQueue();
    renderPage();
    expect(await screen.findByText('1 units')).toBeInTheDocument(); // min deposit
    expect(screen.getByText('10000 units')).toBeInTheDocument(); // max deposit
    expect(screen.getByText('10%')).toBeInTheDocument(); // early-withdraw fee (1000 bps)
  });

  it('shows placeholder counts while the queue is loading', () => {
    vi.mocked(financeApi.listRequests).mockReturnValue(
      new Promise<PaginatedFinancialRequests>(() => {
        /* never resolves */
      }),
    );
    vi.mocked(financeApi.getLimits).mockReturnValue(
      new Promise<FinancialLimitsData>(() => {
        /* never resolves */
      }),
    );
    renderPage();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('shows an error state when the queue request fails', async () => {
    vi.mocked(financeApi.listRequests).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    vi.mocked(financeApi.getLimits).mockResolvedValue(LIMITS);
    renderPage();
    expect(await screen.findByText(/Could not load recent requests/i)).toBeInTheDocument();
  });
});
