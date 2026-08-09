/* eslint-disable @typescript-eslint/unbound-method -- `bonusApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type BonusCampaignData } from '@superdreams/api-client';

import { bonusApi } from '../api';
import BonusCampaignsPage from './BonusCampaignsPage';

vi.mock('../api', () => ({
  bonusApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const LIVE: BonusCampaignData = {
  id: 'b1',
  name: 'Welcome Bonus',
  icon: null,
  scope: 'FIRST_DEPOSIT',
  frequency: 'SINGLE',
  rateBps: 1000,
  lockDays: 30,
  minUnits: 1,
  permanent: true,
  startAt: null,
  endAt: null,
  enabled: true,
  status: 'LIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const SCHEDULED: BonusCampaignData = {
  id: 'b2',
  name: 'Summer Boost',
  icon: null,
  scope: 'ALL_DEPOSITS',
  frequency: 'MULTI',
  rateBps: 500,
  lockDays: 60,
  minUnits: 0,
  permanent: false,
  startAt: '2026-09-01T00:00:00.000Z',
  endAt: '2026-09-30T00:00:00.000Z',
  enabled: true,
  status: 'SCHEDULED',
  createdAt: '2026-01-02T00:00:00.000Z',
};

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <BonusCampaignsPage />
    </MemoryRouter>,
  );
}

describe('BonusCampaignsPage', () => {
  beforeEach(() => {
    vi.mocked(bonusApi.list).mockReset().mockResolvedValue([LIVE, SCHEDULED]);
    vi.mocked(bonusApi.create).mockReset().mockResolvedValue(LIVE);
    vi.mocked(bonusApi.update).mockReset().mockResolvedValue(LIVE);
    vi.mocked(bonusApi.remove).mockReset().mockResolvedValue({ id: 'b1', deleted: true });
    useSessionStore.setState({ permissions: ['bonus.manage'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('shows a loading state', () => {
    renderPage();
    expect(screen.getByText('Loading data')).toBeInTheDocument();
  });

  it('renders campaigns with status and eligibility', async () => {
    renderPage();
    expect(await screen.findByText('Welcome Bonus')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('First deposit')).toBeInTheDocument();
    expect(screen.getByText('All deposits')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument(); // rate 1000 bps
  });

  it('shows an empty state', async () => {
    vi.mocked(bonusApi.list).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No bonus campaigns yet.')).toBeInTheDocument();
  });

  it('surfaces a load error', async () => {
    vi.mocked(bonusApi.list).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Boom', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText('Could not load campaigns')).toBeInTheDocument();
  });

  it('creates a campaign through the backend', async () => {
    renderPage();
    await screen.findByText('Welcome Bonus');
    fireEvent.click(screen.getByRole('button', { name: 'New campaign' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Flash' } });
    fireEvent.change(within(dialog).getByLabelText('Bonus rate (%)'), { target: { value: '15' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create campaign' }));

    await waitFor(() => expect(bonusApi.create).toHaveBeenCalledTimes(1));
    expect(bonusApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Flash',
        scope: 'FIRST_DEPOSIT',
        frequency: 'SINGLE',
        rateBps: 1500,
        minUnits: 0,
        lockDays: 30,
        permanent: false,
        enabled: true,
      }),
    );
  });

  it('blocks creating with an out-of-range rate', async () => {
    renderPage();
    await screen.findByText('Welcome Bonus');
    fireEvent.click(screen.getByRole('button', { name: 'New campaign' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Flash' } });
    fireEvent.change(within(dialog).getByLabelText('Bonus rate (%)'), { target: { value: '150' } });

    expect(within(dialog).getByText(/between 0 and 100%/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create campaign' })).toBeDisabled();
    expect(bonusApi.create).not.toHaveBeenCalled();
  });

  it('updates a campaign through the backend', async () => {
    renderPage();
    await screen.findByText('Welcome Bonus');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0] as HTMLElement);

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Welcome Bonus v2' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(bonusApi.update).toHaveBeenCalledTimes(1));
    expect(bonusApi.update).toHaveBeenCalledWith(
      'b1',
      expect.objectContaining({ name: 'Welcome Bonus v2' }),
    );
  });

  it('deletes a campaign after confirmation', async () => {
    renderPage();
    await screen.findByText('Welcome Bonus');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0] as HTMLElement);

    expect(await screen.findByText('Delete Welcome Bonus?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(bonusApi.remove).toHaveBeenCalledTimes(1));
    expect(bonusApi.remove).toHaveBeenCalledWith('b1');
  });

  it('prevents double-submitting a create', async () => {
    vi.mocked(bonusApi.create).mockReturnValue(new Promise<BonusCampaignData>(() => {}));
    renderPage();
    await screen.findByText('Welcome Bonus');
    fireEvent.click(screen.getByRole('button', { name: 'New campaign' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Flash' } });
    fireEvent.change(within(dialog).getByLabelText('Bonus rate (%)'), { target: { value: '15' } });
    const confirm = within(dialog).getByRole('button', { name: 'Create campaign' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(bonusApi.create).toHaveBeenCalledTimes(1));
    expect(bonusApi.create).toHaveBeenCalledTimes(1);
  });

  it('hides management actions without bonus.manage', async () => {
    useSessionStore.setState({ permissions: [] });
    renderPage();
    await screen.findByText('Welcome Bonus');
    expect(screen.queryByRole('button', { name: 'New campaign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
