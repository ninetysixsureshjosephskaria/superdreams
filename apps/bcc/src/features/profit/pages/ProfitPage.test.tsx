/* eslint-disable @typescript-eslint/unbound-method -- `profitApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotificationStore, useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import {
  ApiError,
  type ProfitDistributionData,
  type ProfitScheduleData,
} from '@superdreams/api-client';

import { profitApi } from '../api';
import ProfitPage from './ProfitPage';

vi.mock('../api', () => ({
  profitApi: {
    getSchedule: vi.fn(),
    planSchedule: vi.fn(),
    setScheduleDay: vi.fn(),
    publishSchedule: vi.fn(),
    distribute: vi.fn(),
    listHistory: vi.fn(),
  },
}));

const DRAFT: ProfitScheduleData = {
  month: '2026-08',
  status: 'DRAFT',
  memberMonthlyBps: 3000, // 30%
  partnerMonthlyBps: 1500, // 15%
  publishedAt: null,
  days: [
    { day: '2026-08-01', memberBps: 100, partnerBps: 50, distributeAt: '23:30', off: false },
    { day: '2026-08-02', memberBps: 100, partnerBps: 50, distributeAt: '23:45', off: false },
  ],
};

const PUBLISHED: ProfitScheduleData = {
  ...DRAFT,
  status: 'PUBLISHED',
  publishedAt: '2026-08-01T00:00:00.000Z',
};

const DIST: ProfitDistributionData = {
  day: '2026-08-01',
  reference: 'TXN-P-2026-08-01',
  memberBps: 100,
  partnerBps: 50,
  memberAmountCents: 12_345,
  partnerAmountCents: 6_789,
  membersCredited: 10,
  partnersCredited: 2,
};

function notFound(): ApiError {
  return new ApiError({ code: 'NOT_FOUND', message: 'No schedule for that month.', status: 404 });
}

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <ProfitPage />
    </MemoryRouter>,
  );
}

let notifySpy: ReturnType<typeof vi.fn>;

describe('ProfitPage', () => {
  beforeEach(() => {
    vi.mocked(profitApi.getSchedule).mockReset().mockResolvedValue(DRAFT);
    vi.mocked(profitApi.planSchedule).mockReset().mockResolvedValue(DRAFT);
    vi.mocked(profitApi.setScheduleDay).mockReset().mockResolvedValue(DRAFT);
    vi.mocked(profitApi.publishSchedule).mockReset().mockResolvedValue(PUBLISHED);
    vi.mocked(profitApi.distribute).mockReset().mockResolvedValue(DIST);
    vi.mocked(profitApi.listHistory).mockReset().mockResolvedValue([DIST]);
    notifySpy = vi.fn();
    useNotificationStore.setState({ notify: notifySpy });
    useSessionStore.setState({ permissions: ['profit.schedule', 'profit.distribute'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('shows a loading state while the schedule loads', () => {
    renderPage();
    expect(screen.getByText('Loading schedule…')).toBeInTheDocument();
  });

  it('renders the schedule overview and daily table', async () => {
    // Scope to schedule-only so the history card (which also lists the day) is hidden.
    useSessionStore.setState({ permissions: ['profit.schedule'] });
    renderPage();
    expect(await screen.findByText('DRAFT')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument(); // member monthly
    expect(screen.getByText('15%')).toBeInTheDocument(); // partner monthly
    expect(screen.getByText('2026-08-01')).toBeInTheDocument(); // a day row
    expect(screen.getByText('23:30')).toBeInTheDocument(); // its distribute time
  });

  it('shows a no-schedule empty state on 404', async () => {
    vi.mocked(profitApi.getSchedule).mockRejectedValue(notFound());
    renderPage();
    expect(await screen.findByText(/No schedule for/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan schedule' })).toBeInTheDocument();
  });

  it('surfaces a non-404 load error', async () => {
    vi.mocked(profitApi.getSchedule).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Boom', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText('Could not load schedule')).toBeInTheDocument();
  });

  it('plans a schedule through the backend', async () => {
    renderPage();
    await screen.findByText('DRAFT');
    fireEvent.change(screen.getByLabelText('Schedule month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: 'Re-plan' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Member monthly target (%)'), {
      target: { value: '40' },
    });
    fireEvent.change(within(dialog).getByLabelText('Partner monthly target (%)'), {
      target: { value: '20' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Plan schedule' }));

    await waitFor(() => expect(profitApi.planSchedule).toHaveBeenCalledTimes(1));
    expect(profitApi.planSchedule).toHaveBeenCalledWith({
      month: '2026-08',
      memberMonthlyBps: 4000,
      partnerMonthlyBps: 2000,
    });
  });

  it('blocks planning with an out-of-range target', async () => {
    renderPage();
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Re-plan' }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Member monthly target (%)'), {
      target: { value: '20000' },
    });
    expect(within(dialog).getByText(/between 0 and 10,000%/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Plan schedule' })).toBeDisabled();
    expect(profitApi.planSchedule).not.toHaveBeenCalled();
  });

  it('publishes after confirmation', async () => {
    renderPage();
    await screen.findByText('DRAFT');
    fireEvent.change(screen.getByLabelText('Schedule month'), { target: { value: '2026-08' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Publish the 2026-08 schedule?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(profitApi.publishSchedule).toHaveBeenCalledTimes(1));
    expect(profitApi.publishSchedule).toHaveBeenCalledWith({ month: '2026-08' });
  });

  it('handles a publish error gracefully', async () => {
    vi.mocked(profitApi.publishSchedule).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'nope', status: 409 }),
    );
    renderPage();
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'Could not publish' }),
      ),
    );
  });

  it('hides distribution + history without profit.distribute', async () => {
    vi.mocked(profitApi.getSchedule).mockResolvedValue(PUBLISHED);
    useSessionStore.setState({ permissions: ['profit.schedule'] });
    renderPage();
    await screen.findByText('PUBLISHED');
    expect(screen.queryByRole('button', { name: 'Distribute' })).not.toBeInTheDocument();
    expect(screen.queryByText('Distribution history')).not.toBeInTheDocument();
  });

  it('distributes a day after an explicit real-credit confirmation', async () => {
    vi.mocked(profitApi.getSchedule).mockResolvedValue(PUBLISHED);
    renderPage();
    await screen.findByText('PUBLISHED');
    fireEvent.click(screen.getAllByRole('button', { name: 'Distribute' })[0] as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/credits real profit/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Distribute now' }));

    await waitFor(() => expect(profitApi.distribute).toHaveBeenCalledTimes(1));
    expect(profitApi.distribute).toHaveBeenCalledWith({ day: '2026-08-01' });
  });

  it('prevents double-submitting a distribution', async () => {
    vi.mocked(profitApi.getSchedule).mockResolvedValue(PUBLISHED);
    vi.mocked(profitApi.distribute).mockReturnValue(new Promise<ProfitDistributionData>(() => {}));
    renderPage();
    await screen.findByText('PUBLISHED');
    fireEvent.click(screen.getAllByRole('button', { name: 'Distribute' })[0] as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Distribute now' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    // The re-entry guard means the two synchronous clicks yield exactly one call.
    await waitFor(() => expect(profitApi.distribute).toHaveBeenCalledTimes(1));
    expect(profitApi.distribute).toHaveBeenCalledTimes(1);
  });

  it('handles a distribution error gracefully', async () => {
    vi.mocked(profitApi.getSchedule).mockResolvedValue(PUBLISHED);
    vi.mocked(profitApi.distribute).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'boom', status: 500 }),
    );
    renderPage();
    await screen.findByText('PUBLISHED');
    fireEvent.click(screen.getAllByRole('button', { name: 'Distribute' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Distribute now' }));

    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'Distribution failed' }),
      ),
    );
  });

  it('renders distribution history for the month', async () => {
    vi.mocked(profitApi.getSchedule).mockResolvedValue(PUBLISHED);
    renderPage();
    await screen.findByText('PUBLISHED');
    // Pin the month so the history range is deterministic regardless of wall-clock.
    fireEvent.change(screen.getByLabelText('Schedule month'), { target: { value: '2026-08' } });
    expect(await screen.findByText('TXN-P-2026-08-01')).toBeInTheDocument();
    expect(profitApi.listHistory).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-31' });
  });
});
