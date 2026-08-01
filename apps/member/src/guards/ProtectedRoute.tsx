import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { usePermissions } from '@/hooks';
import { useSessionStore } from '@/store';

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Optional permission required to enter (RBAC-ready). */
  permission?: string;
}

/**
 * Route-protection seam. **This phase performs no real authentication** — it
 * consults the MOCK session/permission stores. When authentication + RBAC are
 * wired, only this file changes: unauthenticated → 401, unauthorized → 403.
 */
export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const { can } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.unauthorized} replace state={{ from: location.pathname }} />;
  }
  if (permission && !can(permission)) {
    return <Navigate to={ROUTES.forbidden} replace />;
  }
  return <>{children}</>;
}
