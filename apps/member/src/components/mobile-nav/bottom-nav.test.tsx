import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders the primary items plus a More button', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    );
    for (const label of ['Home', 'Games', 'Redeem', 'Network']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'More navigation' })).toBeInTheDocument();
    // Removed items never appear in the bottom bar — including the now-hidden
    // monetary Wallet (points/rewards product only).
    expect(screen.queryByRole('link', { name: 'Wallet' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Rewards' })).not.toBeInTheDocument();
  });
});
