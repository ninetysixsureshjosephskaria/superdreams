import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from '@/store';

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

// Labels unique to section headers (excludes 'Finance', which also names a link).
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
    // 'Finance' appears as both a section header and a nav link.
    expect(screen.getAllByText('Finance').length).toBeGreaterThanOrEqual(2);
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
    // A section with all items gated out is dropped entirely.
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
  });
});
