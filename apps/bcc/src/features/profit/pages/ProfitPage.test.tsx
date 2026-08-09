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

/** Current month as `YYYY-MM` — mirrors the page's own default. */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const DRAFT: ProfitScheduleData = {
  month: '2026-08',
  status: 'DRAFT',
  memberMonthlyBps: 3000, // 30%
  partnerMonthlyBps: 1500, // 15%
  publishedAt: null,
  days: [
    { day: '2026-08-01', memberBps: 100, partnerBps: 50, distributeAt: '23:30', off: false },
    { day: '2026-08-02', memberBps: 0, partnerBps: 0, distributeAt: null, off: true },
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

function renderPage(initialEntries: string[] = ['/?month=2026-08']): RenderResult {
  return renderWithProviders(
    <MemoryRouter initialEntries={initialEntries}>
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

  // --- Loading / error / empty ------------------------------------------------

  it('shows a loading state while the schedule loads', () => {
    renderPage();
    expect(screen.getByText('Loading schedule…')).toBeInTheDocument();
  });

  it('surfaces a non-404 load error', async () => {
    vi.mocked(profitApi.getSchedule).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Boom', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText('Could not load schedule')).toBeInTheDocument();
  });

  it('shows a no-schedule empty state on 404', async () => {
    vi.mocked(profitApi.getSchedule).mockRejectedValue(notFound());
    renderPage();
    expect(await screen.findByText(/No schedule for/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan schedule' })).toBeInTheDocument();
  });

  // --- Month navigation -------------------------------------------------------

  it('loads the current month by default (no month param)', async () => {
    renderPage(['/']);
    await screen.findByText('DRAFT');
    expect(profitApi.getSchedule).toHaveBeenCalledWith(currentMonth());
  });

  it('requests the schedule for the month in the URL param', async () => {
    renderPage(['/?month=2026-08']);
    await screen.findByText('DRAFT');
    expect(profitApi.getSchedule).toHaveBeenCalledWith('2026-08');
  });

  it('navigates to the previous month', async () => {
    renderPage(['/?month=2026-08']);
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    await waitFor(() => expect(profitApi.getSchedule).toHaveBeenCalledWith('2026-07'));
  });

  it('navigates to the next month', async () => {
    renderPage(['/?month=2026-08']);
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    await waitFor(() => expect(profitApi.getSchedule).toHaveBeenCalledWith('2026-09'));
  });

  it('jumps back to the current month', async () => {
    renderPage(['/?month=2025-01']);
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'This month' }));
    await waitFor(() => expect(profitApi.getSchedule).toHaveBeenCalledWith(currentMonth()));
  });

  it('requests the correct month when the picker changes', async () => {
    renderPage(['/?month=2026-08']);
    await screen.findByText('DRAFT');
    fireEvent.change(screen.getByLabelText('Schedule month'), { target: { value: '2026-07' } });
    await waitFor(() => expect(profitApi.getSchedule).toHaveBeenCalledWith('2026-07'));
  });

  // --- Calendar rendering -----------------------------------------------------

  it('renders the overview and a draft calendar with rates, times and off days', async () => {
    useSessionStore.setState({ permissions: ['profit.schedule'] });
    renderPage();
    expect(await screen.findByText('DRAFT')).toBeInTheDocument(); // overview status badge
    expect(screen.getByText('30%')).toBeInTheDocument(); // member monthly
    expect(screen.getByText('15%')).toBeInTheDocument(); // partner monthly
    // Calendar grid: weekday headers + per-day content from backend values.
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Calendar — August 2026')).toBeInTheDocument();
    expect(screen.getAllByText('M 1%').length).toBeGreaterThan(0); // day 1 member rate
    expect(screen.getByText('23:30')).toBeInTheDocument(); // day 1 distribute time
    expect(screen.getByText('Off')).toBeInTheDocument(); // day 2 is off
  });

  it('defaults to the calendar grid (not the table) with a header month label', async () => {
    renderPage(['/?month=2026-08']);
    // Wait for the schedule to load into the default (calendar) view.
    expect(await screen.findByText('Calendar — August 2026')).toBeInTheDocument();
    // The month label is visible in the header between the prev/next controls.
    expect(screen.getByTestId('current-month-label')).toHaveTextContent('August 2026');
    // Default view is the 7-column calendar: weekday headers render immediately…
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Calendar — August 2026')).toBeInTheDocument();
    // …and the table view (its "Daily schedule" heading) is NOT mounted yet.
    expect(screen.queryByText('Daily schedule')).not.toBeInTheDocument();
    // Switching to the table view mounts it on demand.
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }));
    expect(screen.getByText('Daily schedule')).toBeInTheDocument();
  });

  it('renders a published calendar with distribute controls', async () => {
    vi.mocked(profitApi.getSchedule).mockResolvedValue(PUBLISHED);
    renderPage();
    await screen.findByText('PUBLISHED'); // overview
    // Published day cells expose a Distribute action (day 2 is off → excluded).
    expect(screen.getAllByRole('button', { name: 'Distribute' })).toHaveLength(1);
    // History marks day 1 as already distributed.
    expect(await screen.findByText('Distributed')).toBeInTheDocument();
  });

  // --- Day editing ------------------------------------------------------------

  it('opens the day editor from a draft calendar cell and saves', async () => {
    renderPage();
    await screen.findByText('DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Edit 2026-08-01' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit 2026-08-01')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Member rate (%)'), { target: { value: '2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save day' }));

    await waitFor(() => expect(profitApi.setScheduleDay).toHaveBeenCalledTimes(1));
    expect(profitApi.setScheduleDay).toHaveBeenCalledWith({
      day: '2026-08-01',
      memberBps: 200,
      partnerBps: 50,
      off: false,
    });
  });

  // --- View toggle ------------------------------------------------------------

  it('toggles between calendar and table views', async () => {
    useSessionStore.setState({ permissions: ['profit.schedule'] });
    renderPage();
    await screen.findByText('DRAFT');
    // Calendar is primary: weekday header present, no full-date table rows yet.
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.queryByText('2026-08-01')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Table view' }));
    expect(screen.getByText('Daily schedule')).toBeInTheDocument();
    expect(screen.getByText('2026-08-01')).toBeInTheDocument(); // full date in the table

    fireEvent.click(screen.getByRole('button', { name: 'Calendar view' }));
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.queryByText('2026-08-01')).not.toBeInTheDocument();
  });

  // --- Planning ---------------------------------------------------------------

  it('plans a schedule through the backend', async () => {
    renderPage();
    await screen.findByText('DRAFT');
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

  // --- Publishing -------------------------------------------------------------

  it('publishes after confirmation', async () => {
    renderPage();
    await screen.findByText('DRAFT');
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

  // --- Distribution + permission gating --------------------------------------

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
    renderPage(['/?month=2026-08']);
    await screen.findByText('PUBLISHED');
    expect(await screen.findByText('TXN-P-2026-08-01')).toBeInTheDocument();
    expect(profitApi.listHistory).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-31' });
  });
});
