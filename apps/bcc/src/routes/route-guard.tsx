import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export interface RouteGuardProps {
  /** Whether access is permitted. */
  isAllowed: boolean;
  /** Where to redirect when access is denied. */
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Generic route guard seam. Renders its children when access is allowed,
 * otherwise redirects. Authentication/RBAC will supply `isAllowed` in a later
 * phase; this phase implements no authentication.
 */
export function RouteGuard({ isAllowed, redirectTo = '/', children }: RouteGuardProps) {
  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
}
