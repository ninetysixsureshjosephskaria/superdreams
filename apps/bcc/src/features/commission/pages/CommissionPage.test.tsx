/* eslint-disable @typescript-eslint/unbound-method -- `commissionApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type CommissionConfigView } from '@superdreams/api-client';

import { commissionApi } from '../api';
import CommissionPage from './CommissionPage';

vi.mock('../api', () => ({
  commissionApi: {
    getConfig: vi.fn(),
    updateReferralRate: vi.fn(),
    setDefaultTiers: vi.fn(),
    createTarget: vi.fn(),
    deleteTarget: vi.fn(),
  },
}));

const CONFIG: CommissionConfigView = {
  referralRateBps: 200, // 2%
  defaultTiers: [
    { id: 't1', fromUnits: 0, toUnits: 300, rateBps: 500 },
    { id: 't2', fromUnits: 301, toUnits: null, rateBps: 700 },
  ],
  targets: [
    {
      id: 'g1',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      tiers: [{ id: 'gt1', fromUnits: 0, toUnits: null, rateBps: 800 }],
    },
  ],
};

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <CommissionPage />
    </MemoryRouter>,
  );
}

describe('CommissionPage', () => {
  beforeEach(() => {
    vi.mocked(commissionApi.getConfig).mockReset().mockResolvedValue(CONFIG);
    vi.mocked(commissionApi.updateReferralRate).mockReset().mockResolvedValue(CONFIG);
    vi.mocked(commissionApi.setDefaultTiers).mockReset().mockResolvedValue(CONFIG);
    vi.mocked(commissionApi.createTarget).mockReset().mockResolvedValue(CONFIG.targets[0]!);
    vi.mocked(commissionApi.deleteTarget)
      .mockReset()
      .mockResolvedValue({ id: 'g1', deleted: true });
    useSessionStore.setState({ permissions: ['commission.manage'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders the config once loaded', async () => {
    renderPage();
    const rate = await screen.findByLabelText<HTMLInputElement>('Referral rate (%)');
    expect(rate.value).toBe('2');
    // Default tier ranges + a target row.
    expect(screen.getByText('0 – 300')).toBeInTheDocument();
    expect(screen.getByText('301 – ∞')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
  });

  it('shows the empty state when there are no targets', async () => {
    vi.mocked(commissionApi.getConfig).mockResolvedValue({ ...CONFIG, targets: [] });
    renderPage();
    expect(await screen.findByText('No commission targets scheduled.')).toBeInTheDocument();
  });

  it('surfaces a load error', async () => {
    vi.mocked(commissionApi.getConfig).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Boom', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText('Could not load commission config')).toBeInTheDocument();
  });

  it('updates the referral rate through the backend', async () => {
    renderPage();
    const rate = await screen.findByLabelText('Referral rate (%)');
    fireEvent.change(rate, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));

    await waitFor(() => expect(commissionApi.updateReferralRate).toHaveBeenCalledTimes(1));
    expect(commissionApi.updateReferralRate).toHaveBeenCalledWith({ rateBps: 300 });
  });

  it('surfaces a referral-rate update error', async () => {
    vi.mocked(commissionApi.updateReferralRate).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Rate rejected', status: 500 }),
    );
    renderPage();
    await screen.findByLabelText('Referral rate (%)');
    fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    expect(await screen.findByText('Rate rejected')).toBeInTheDocument();
  });

  it('replaces the default tiers through the backend', async () => {
    renderPage();
    await screen.findByLabelText('Referral rate (%)');
    fireEvent.click(screen.getByRole('button', { name: 'Edit tiers' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save tiers' }));

    await waitFor(() => expect(commissionApi.setDefaultTiers).toHaveBeenCalledTimes(1));
    expect(commissionApi.setDefaultTiers).toHaveBeenCalledWith({
      tiers: [
        { fromUnits: 0, toUnits: 300, rateBps: 500 },
        { fromUnits: 301, toUnits: null, rateBps: 700 },
      ],
    });
  });

  it('creates a date-ranged target through the backend', async () => {
    renderPage();
    await screen.findByLabelText('Referral rate (%)');
    fireEvent.click(screen.getByRole('button', { name: 'New target' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Start date'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(within(dialog).getByLabelText('End date'), {
      target: { value: '2026-03-31' },
    });
    fireEvent.change(within(dialog).getByLabelText('Tier 1 rate percent'), {
      target: { value: '6' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create target' }));

    await waitFor(() => expect(commissionApi.createTarget).toHaveBeenCalledTimes(1));
    expect(commissionApi.createTarget).toHaveBeenCalledWith({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      tiers: [{ fromUnits: 0, toUnits: null, rateBps: 600 }],
    });
  });

  it('deletes a target after confirmation', async () => {
    renderPage();
    await screen.findByLabelText('Referral rate (%)');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Delete target 2026-01-01 – 2026-01-31?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(commissionApi.deleteTarget).toHaveBeenCalledTimes(1));
    expect(commissionApi.deleteTarget).toHaveBeenCalledWith('g1');
  });

  it('hides management actions without commission.manage', async () => {
    useSessionStore.setState({ permissions: [] });
    renderPage();
    await screen.findByLabelText('Referral rate (%)');
    expect(screen.queryByRole('button', { name: 'Save rate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit tiers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New target' })).not.toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
