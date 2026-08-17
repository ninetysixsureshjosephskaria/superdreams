import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from '@/store';

import { SidebarNav } from './SidebarNav';

const NAV_LABELS = [
  'Dashboard',
  'Members',
  'Rewards',
  'Campaigns',
  'Notifications',
  'Reports',
  'Dream Store',
  'Settings',
];

// The monetary "Finance" section (Wallet, Currencies, Commission, etc.) is not
// exposed — Super Dreams is a points/rewards product.
const REMOVED_LABELS = ['Finance', 'Wallet', 'Currencies', 'Commission'];

const SECTION_LABELS = ['Overview', 'Members & Network', 'Engagement', 'Insights', 'System'];

describe('SidebarNav', () => {
  beforeEach(() => {
    // Super-admin wildcard so every permission-gated item is visible.
    useSessionStore.setState({ permissions: ['*'] });
  });

  afterEach(() => {
    useSessionStore.getState().clear();
  });

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

  it('groups navigation under Super Dreams IA section headers', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>,
    );
    for (const section of SECTION_LABELS) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
  });

  it('does not expose any monetary/currency navigation', () => {
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>,
    );
    for (const label of REMOVED_LABELS) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
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

  it('hides items whose permission the user lacks', () => {
    // No permissions → only ungated items (Dashboard, Dream Store) remain.
    useSessionStore.setState({ permissions: [] });
    render(
      <MemoryRouter>
        <SidebarNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dream Store' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    // A section with all items gated out is dropped entirely (Members & Network
    // has no ungated items, unlike Engagement which keeps Dream Store).
    expect(screen.queryByText('Members & Network')).not.toBeInTheDocument();
  });
});
