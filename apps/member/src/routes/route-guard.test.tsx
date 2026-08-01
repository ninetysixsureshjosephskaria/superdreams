import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { RouteGuard } from './route-guard';

describe('RouteGuard', () => {
  it('renders children when access is allowed', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RouteGuard isAllowed>Protected content</RouteGuard>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects when access is denied', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <RouteGuard isAllowed={false} redirectTo="/denied">
                Protected content
              </RouteGuard>
            }
          />
          <Route path="/denied" element={<div>Denied</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
