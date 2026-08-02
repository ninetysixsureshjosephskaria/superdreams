import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { useSessionStore, type SessionUser } from '@/store';

import { ProtectedRoute } from './ProtectedRoute';

const TEST_USER: SessionUser = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Member',
  email: 'member@test.local',
  mustChangePassword: false,
};

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProtectedRoute>Secret content</ProtectedRoute>} />
        <Route path="/login" element={<div>Sign in required</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    useSessionStore.getState().clear();
  });

  it('renders children when the session is authenticated', () => {
    useSessionStore.setState({ user: TEST_USER, isAuthenticated: true, status: 'authenticated' });
    renderGuarded();
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('redirects to the login page when unauthenticated', () => {
    useSessionStore.setState({ user: null, isAuthenticated: false, status: 'unauthenticated' });
    renderGuarded();
    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });
});
