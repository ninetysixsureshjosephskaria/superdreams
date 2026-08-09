/* eslint-disable @typescript-eslint/unbound-method -- `financeApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import {
  ApiError,
  type FinancialRequestData,
  type PaginatedFinancialRequests,
} from '@superdreams/api-client';

import { financeApi } from '../api';
import FinanceQueuePage from './FinanceQueuePage';

vi.mock('../api', () => ({
  financeApi: {
    listRequests: vi.fn(),
    getRequest: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
    holdRequest: vi.fn(),
  },
}));

const FULL_PERMS = ['finance.read', 'deposits.approve', 'withdrawals.approve'];

function request(overrides: Partial<FinancialRequestData> = {}): FinancialRequestData {
  return {
    id: 'req-1',
    requestNumber: 'DEP-1001',
    memberId: 'member-uuid-1',
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
  return { items, page: 1, pageSize: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) };
}

function setPermissions(permissions: string[]) {
  useSessionStore.setState({ permissions });
}

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <FinanceQueuePage />
    </MemoryRouter>,
  );
}

describe('FinanceQueuePage', () => {
  beforeEach(() => {
    vi.mocked(financeApi.listRequests)
      .mockReset()
      .mockResolvedValue(page([request({})]));
    vi.mocked(financeApi.getRequest).mockReset().mockResolvedValue(request({}));
    vi.mocked(financeApi.approveRequest)
      .mockReset()
      .mockResolvedValue(request({ status: 'APPROVED' }));
    vi.mocked(financeApi.rejectRequest)
      .mockReset()
      .mockResolvedValue(request({ status: 'REJECTED' }));
    vi.mocked(financeApi.holdRequest)
      .mockReset()
      .mockResolvedValue(request({ status: 'HOLD' }));
    setPermissions(FULL_PERMS);
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('loads then renders queue rows', async () => {
    renderPage();
    expect(screen.queryByText('DEP-1001')).not.toBeInTheDocument(); // pending
    expect(await screen.findByText('DEP-1001')).toBeInTheDocument(); // loaded
    expect(screen.getByText('$300.00')).toBeInTheDocument();
    expect(screen.getByText('1 requests')).toBeInTheDocument();
  });

  it('filters by status via the backend query params', async () => {
    renderPage();
    await screen.findByText('DEP-1001');

    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'PENDING' } });

    await waitFor(() =>
      expect(financeApi.listRequests).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', page: 1 }),
      ),
    );
  });

  it('opens the review modal with request detail', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));

    expect(await screen.findByText('Review request')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeInTheDocument();
    // Member id is shown (row + modal) — never a fabricated name.
    expect(screen.getAllByText('member-uuid-1').length).toBeGreaterThan(0);
  });

  it('approves a request through the backend and closes on success', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm approve/i }));

    await waitFor(() => expect(financeApi.approveRequest).toHaveBeenCalledTimes(1));
    expect(financeApi.approveRequest).toHaveBeenCalledWith('req-1', undefined);
  });

  it('requires a reason to reject and sends it to the backend', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));

    const confirm = await screen.findByRole('button', { name: /confirm reject/i });
    expect(confirm).toBeDisabled(); // reason required

    fireEvent.change(screen.getByPlaceholderText(/audit trail/i), {
      target: { value: 'Suspicious activity' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm reject/i }));

    await waitFor(() => expect(financeApi.rejectRequest).toHaveBeenCalledTimes(1));
    expect(financeApi.rejectRequest).toHaveBeenCalledWith('req-1', {
      reason: 'Suspicious activity',
    });
  });

  it('holds a request through the backend', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hold' }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm hold/i }));

    await waitFor(() => expect(financeApi.holdRequest).toHaveBeenCalledTimes(1));
  });

  it('prevents double submission while a decision is in flight', async () => {
    vi.mocked(financeApi.approveRequest).mockReturnValue(
      new Promise<FinancialRequestData>(() => {
        /* never resolves */
      }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const confirm = await screen.findByRole('button', { name: /confirm approve/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(financeApi.approveRequest).toHaveBeenCalledTimes(1));
  });

  it('surfaces a decision error and keeps the modal open', async () => {
    vi.mocked(financeApi.approveRequest).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Insufficient balance', status: 422 }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm approve/i }));

    expect(await screen.findByText('Insufficient balance')).toBeInTheDocument();
    expect(screen.getByText('Review request')).toBeInTheDocument(); // still open
  });

  it('hides decision actions without the required permission', async () => {
    setPermissions(['finance.read']); // no deposits.approve
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));

    expect(await screen.findByText(/Not permitted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows an error state when the queue fails to load', async () => {
    vi.mocked(financeApi.listRequests).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Server error', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText(/Could not load the action queue/i)).toBeInTheDocument();
  });
});
