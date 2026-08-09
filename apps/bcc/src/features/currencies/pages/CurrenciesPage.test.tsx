/* eslint-disable @typescript-eslint/unbound-method -- `currenciesApi` is a vi.mock of
   standalone vi.fn()s, so referencing its members is safe. */
import { fireEvent, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/store';
import { renderWithProviders } from '@/test/test-utils';
import type { CurrencyData } from '@superdreams/api-client';

import { currenciesApi } from '../api';
import CurrenciesPage from './CurrenciesPage';

vi.mock('../api', () => ({
  currenciesApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const USD: CurrencyData = {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  decimalDigits: 2,
  perUnitValue: 30,
  perUsd: 1,
  isBase: true,
  flagSlug: 'us',
  isActive: true,
};

const AED: CurrencyData = {
  code: 'AED',
  name: 'UAE Dirham',
  symbol: 'د.إ',
  decimalDigits: 2,
  perUnitValue: 110,
  perUsd: 3.67,
  isBase: false,
  flagSlug: 'ae',
  isActive: true,
};

function renderPage(): RenderResult {
  return renderWithProviders(
    <MemoryRouter>
      <CurrenciesPage />
    </MemoryRouter>,
  );
}

describe('CurrenciesPage', () => {
  beforeEach(() => {
    vi.mocked(currenciesApi.list).mockReset().mockResolvedValue([USD, AED]);
    vi.mocked(currenciesApi.create).mockReset().mockResolvedValue(AED);
    vi.mocked(currenciesApi.update).mockReset().mockResolvedValue(AED);
    vi.mocked(currenciesApi.remove).mockReset().mockResolvedValue({ code: 'AED', deleted: true });
    useSessionStore.setState({ permissions: ['currency.manage'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders the currency table', async () => {
    renderPage();
    expect(await screen.findByText('US Dollar')).toBeInTheDocument();
    expect(screen.getByText('UAE Dirham')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
  });

  it('does not offer delete for the base currency', async () => {
    renderPage();
    await screen.findByText('US Dollar');
    // Only the non-base row (AED) exposes Delete.
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it('creates a currency through the backend', async () => {
    renderPage();
    await screen.findByText('US Dollar');
    fireEvent.click(screen.getByRole('button', { name: 'Add currency' }));

    fireEvent.change(screen.getByPlaceholderText('e.g. AED'), { target: { value: 'GBP' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pound' } });
    fireEvent.change(screen.getByLabelText('Per-unit value'), { target: { value: '40' } });

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add currency' }));

    await waitFor(() => expect(currenciesApi.create).toHaveBeenCalledTimes(1));
    expect(currenciesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'GBP', name: 'Pound', perUnitValue: 40, isActive: true }),
    );
  });

  it('updates a currency through the backend', async () => {
    renderPage();
    await screen.findByText('US Dollar');
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[1] as HTMLElement); // AED row

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Dirham (updated)' } });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(currenciesApi.update).toHaveBeenCalledTimes(1));
    expect(currenciesApi.update).toHaveBeenCalledWith(
      'AED',
      expect.objectContaining({ name: 'Dirham (updated)' }),
    );
  });

  it('deletes a currency after confirmation', async () => {
    renderPage();
    await screen.findByText('US Dollar');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Delete AED?')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(currenciesApi.remove).toHaveBeenCalledTimes(1));
    expect(currenciesApi.remove).toHaveBeenCalledWith('AED');
  });

  it('hides management actions without currency.manage', async () => {
    useSessionStore.setState({ permissions: [] });
    renderPage();
    await screen.findByText('US Dollar');
    expect(screen.queryByRole('button', { name: 'Add currency' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
