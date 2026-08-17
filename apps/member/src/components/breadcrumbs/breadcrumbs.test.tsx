import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('builds a Home → module trail for a module route', () => {
    render(
      <MemoryRouter initialEntries={['/network']}>
        <Breadcrumbs />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Network')).toHaveAttribute('aria-current', 'page');
  });

  it('shows only Home at the root', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumbs />
      </MemoryRouter>,
    );
    expect(screen.getByText('Home')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
  });
});
