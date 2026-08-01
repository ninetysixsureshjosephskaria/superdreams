import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SidebarNav } from './SidebarNav';

const NAV_LABELS = [
  'Dashboard',
  'Members',
  'Wallet',
  'Rewards',
  'Campaigns',
  'Notifications',
  'Reports',
  'Dream Store',
  'Settings',
];

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

  it('highlights the active route', () => {
    render(
      <MemoryRouter initialEntries={['/members']}>
        <SidebarNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Members' })).toHaveClass('bg-accent');
  });
});
