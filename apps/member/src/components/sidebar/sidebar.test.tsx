import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SidebarNav } from './SidebarNav';

const NAV_LABELS = ['Home', 'Games', 'Dream Store', 'Wallet', 'Profile'];

const REMOVED_LABELS = ['Rewards', 'Campaigns', 'Notifications', 'Statements', 'Support'];

describe('SidebarNav', () => {
  it('renders every primary navigation item as a link', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>,
    );
    for (const label of NAV_LABELS) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('does not render removed navigation items', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>,
    );
    for (const label of REMOVED_LABELS) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('highlights the active route', () => {
    render(
      <MemoryRouter initialEntries={['/wallet']}>
        <SidebarNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Wallet' })).toHaveClass('bg-accent');
  });
});
