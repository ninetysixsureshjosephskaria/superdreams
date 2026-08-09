/* eslint-disable @typescript-eslint/unbound-method -- `activationBonusApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotificationStore, useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import { ApiError, type ActivationConfigData } from '@superdreams/api-client';

import { activationBonusApi } from '../api';
import ActivationBonusPage from './ActivationBonusPage';

vi.mock('../api', () => ({
  activationBonusApi: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    runSweep: vi.fn(),
  },
}));

const PERCENT_CONFIG: ActivationConfigData = {
  enabled: true,
  rewardType: 'PERCENT',
  value: 500, // 5%
  lockDays: 30,
};

const FIXED_CONFIG: ActivationConfigData = {
  enabled: false,
  rewardType: 'FIXED',
  value: 5000, // $50
  lockDays: 0,
};

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <ActivationBonusPage />
    </MemoryRouter>,
  );
}

let notifySpy: ReturnType<typeof vi.fn>;

describe('ActivationBonusPage', () => {
  beforeEach(() => {
    vi.mocked(activationBonusApi.getConfig).mockReset().mockResolvedValue(PERCENT_CONFIG);
    vi.mocked(activationBonusApi.updateConfig).mockReset().mockResolvedValue(PERCENT_CONFIG);
    vi.mocked(activationBonusApi.runSweep).mockReset().mockResolvedValue({ granted: 3 });
    notifySpy = vi.fn();
    useNotificationStore.setState({ notify: notifySpy });
    useSessionStore.setState({ permissions: ['activation.bonus.manage'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('shows a loading state', () => {
    renderPage();
    expect(screen.getByText('Loading activation config…')).toBeInTheDocument();
  });

  it('renders the percentage config', async () => {
    renderPage();
    const value = await screen.findByLabelText<HTMLInputElement>('Reward value');
    expect(value.value).toBe('5');
    expect(screen.getByText('Reward (% of balance)')).toBeInTheDocument();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('renders the fixed config with the disabled state', async () => {
    vi.mocked(activationBonusApi.getConfig).mockResolvedValue(FIXED_CONFIG);
    renderPage();
    const value = await screen.findByLabelText<HTMLInputElement>('Reward value');
    expect(value.value).toBe('50');
    expect(screen.getByText('Reward (USD)')).toBeInTheDocument();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });

  it('surfaces a load error', async () => {
    vi.mocked(activationBonusApi.getConfig).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'Boom', status: 500 }),
    );
    renderPage();
    expect(await screen.findByText('Could not load activation config')).toBeInTheDocument();
  });

  it('updates the config through the backend', async () => {
    renderPage();
    await screen.findByLabelText('Reward value');
    fireEvent.change(screen.getByLabelText('Reward value'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save config' }));

    await waitFor(() => expect(activationBonusApi.updateConfig).toHaveBeenCalledTimes(1));
    expect(activationBonusApi.updateConfig).toHaveBeenCalledWith({
      enabled: true,
      rewardType: 'PERCENT',
      value: 1000,
      lockDays: 30,
    });
  });

  it('blocks saving an out-of-range percentage', async () => {
    renderPage();
    await screen.findByLabelText('Reward value');
    fireEvent.change(screen.getByLabelText('Reward value'), { target: { value: '150' } });

    expect(screen.getByText(/cannot exceed 100%/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save config' })).toBeDisabled();
    expect(activationBonusApi.updateConfig).not.toHaveBeenCalled();
  });

  it('hides management + sweep without activation.bonus.manage', async () => {
    useSessionStore.setState({ permissions: [] });
    renderPage();
    await screen.findByLabelText('Reward value');
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save config' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run activation sweep' })).not.toBeInTheDocument();
  });

  it('runs the qualification sweep after an explicit confirmation', async () => {
    renderPage();
    await screen.findByLabelText('Reward value');
    fireEvent.click(screen.getByRole('button', { name: 'Run activation sweep' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/credits a real activation bonus/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run sweep' }));

    await waitFor(() => expect(activationBonusApi.runSweep).toHaveBeenCalledTimes(1));
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Activation sweep complete' }),
    );
  });

  it('prevents double-submitting the sweep', async () => {
    vi.mocked(activationBonusApi.runSweep).mockReturnValue(
      new Promise<{ granted: number }>(() => {}),
    );
    renderPage();
    await screen.findByLabelText('Reward value');
    fireEvent.click(screen.getByRole('button', { name: 'Run activation sweep' }));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Run sweep' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(activationBonusApi.runSweep).toHaveBeenCalledTimes(1));
    expect(activationBonusApi.runSweep).toHaveBeenCalledTimes(1);
  });

  it('surfaces a sweep error', async () => {
    vi.mocked(activationBonusApi.runSweep).mockRejectedValue(
      new ApiError({ code: 'HTTP_ERROR', message: 'boom', status: 500 }),
    );
    renderPage();
    await screen.findByLabelText('Reward value');
    fireEvent.click(screen.getByRole('button', { name: 'Run activation sweep' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Run sweep' }));

    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error', title: 'Sweep failed' }),
      ),
    );
  });
});
