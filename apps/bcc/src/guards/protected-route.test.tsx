import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { useSessionStore, type SessionUser } from '@/store';

import { ProtectedRoute } from './ProtectedRoute';

const TEST_ADMIN: SessionUser = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Test Admin',
  email: 'admin@test.local',
  roleLabel: 'Administrator',
  mustChangePassword: false,
};

function renderGuarded(permission?: string) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={<ProtectedRoute permission={permission}>Secret content</ProtectedRoute>}
        />
        <Route path="/login" element={<div>Sign in required</div>} />
        <Route path="/403" element={<div>Forbidden</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders children when authenticated with the required permission', () => {
    useSessionStore.setState({
      user: TEST_ADMIN,
      isAuthenticated: true,
      status: 'authenticated',
      permissions: ['member.read'],
    });
    renderGuarded('member.read');
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('redirects to the login page when unauthenticated', () => {
    useSessionStore.setState({ user: null, isAuthenticated: false, status: 'unauthenticated' });
    renderGuarded();
    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('redirects to 403 when the permission is missing', () => {
    useSessionStore.setState({
      user: TEST_ADMIN,
      isAuthenticated: true,
      status: 'authenticated',
      permissions: [],
    });
    renderGuarded('member.read');
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });
});
