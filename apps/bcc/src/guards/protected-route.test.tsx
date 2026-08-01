import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { MOCK_USER } from '@/mocks';
import { useSessionStore } from '@/store';

import { ProtectedRoute } from './ProtectedRoute';

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProtectedRoute>Secret content</ProtectedRoute>} />
        <Route path="/401" element={<div>Sign in required</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute (mock guard)', () => {
  afterEach(() => {
    useSessionStore.setState({ user: MOCK_USER, isAuthenticated: true });
  });

  it('renders children when the (mock) session is authenticated', () => {
    useSessionStore.setState({ user: MOCK_USER, isAuthenticated: true });
    renderGuarded();
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('redirects to 401 when unauthenticated', () => {
    useSessionStore.setState({ user: null, isAuthenticated: false });
    renderGuarded();
    expect(screen.getByText('Sign in required')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });
});
