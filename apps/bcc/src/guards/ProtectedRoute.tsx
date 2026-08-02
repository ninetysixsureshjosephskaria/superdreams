import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { usePermissions } from '@/hooks';
import { useSessionStore } from '@/store';

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Optional permission required to enter (RBAC). */
  permission?: string;
}

/**
 * Route protection backed by the real session + RBAC permissions. Unauthenticated
 * admins are sent to the login page (preserving their destination); an
 * authenticated admin lacking a required permission gets the 403 page.
 */
export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const mustChangePassword = useSessionStore((state) => state.user?.mustChangePassword ?? false);
  const { can } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.login} replace state={{ from: location.pathname + location.search }} />
    );
  }
  if (mustChangePassword && location.pathname !== ROUTES.changePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }
  if (permission && !can(permission)) {
    return <Navigate to={ROUTES.forbidden} replace />;
  }
  return <>{children}</>;
}
