import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { ProtectedRoute } from '@/guards';
import { AppLayout, PublicLayout } from '@/layouts';
import { RouteErrorPage } from '@/pages/error/RouteErrorPage';
import { LoadingScreen } from '@superdreams/ui';

/** Wraps a lazily-loaded standalone page (one with no layout) in a Suspense boundary. */
function lazyPage(node: ReactNode): ReactNode {
  return <Suspense fallback={<LoadingScreen />}>{node}</Suspense>;
}

// Pages are code-split; layouts render a Suspense fallback while they load.
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const NetworkPage = lazy(() => import('@/features/network/pages/NetworkPage'));
// The monetary Wallet and Earnings pages are intentionally not routed — Super
// Dreams is a points/rewards product with no user-facing currency/money UI. The
// feature code and backend/APIs remain intact but are not reachable in the portal.
const GamesPage = lazy(() => import('@/features/games/pages/GamesPage'));
const RedemptionPage = lazy(() => import('@/features/redemption/pages/RedemptionPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const SignUpPage = lazy(() => import('@/features/auth/pages/SignUpPage'));
const JoinPage = lazy(() => import('@/features/auth/pages/JoinPage'));
const ActivatePage = lazy(() => import('@/features/auth/pages/ActivatePage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage'));
const UnauthorizedPage = lazy(() => import('@/pages/errors/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('@/pages/errors/ForbiddenPage'));
const ServerErrorPage = lazy(() => import('@/pages/errors/ServerErrorPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

/**
 * Application router.
 *
 * Navigation covers Home, Games, Redeem, Network and Profile (see
 * `navigation/nav-config.ts`). All are fully functional and backed by the real
 * API. Other member feature pages remain in the codebase but are intentionally
 * not routed here — the Dream Store page code is retained (backend unchanged) but
 * is not exposed in the Member Portal (P2); likewise the monetary Wallet and
 * Earnings pages are retained but not routed (points/rewards product only).
 *
 * The member area is wrapped in {@link ProtectedRoute} (a mock guard in this
 * phase — no real authentication). Error pages live in the public layout so a
 * redirect from the guard never loops.
 */
export const router = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: ROUTES.games.replace(/^\//, ''), element: <GamesPage /> },
      { path: ROUTES.redemption.replace(/^\//, ''), element: <RedemptionPage /> },
      { path: ROUTES.network.replace(/^\//, ''), element: <NetworkPage /> },
      { path: ROUTES.profile.replace(/^\//, ''), element: <ProfilePage /> },
    ],
  },
  {
    path: ROUTES.login.replace(/^\//, ''),
    element: lazyPage(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.signup.replace(/^\//, ''),
    element: lazyPage(<SignUpPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.join.replace(/^\//, ''),
    element: lazyPage(<JoinPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.activate.replace(/^\//, ''),
    element: lazyPage(<ActivatePage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.forgotPassword.replace(/^\//, ''),
    element: lazyPage(<ForgotPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.resetPassword.replace(/^\//, ''),
    element: lazyPage(<ResetPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: ROUTES.changePassword.replace(/^\//, ''),
    element: <ProtectedRoute>{lazyPage(<ChangePasswordPage />)}</ProtectedRoute>,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.unauthorized.replace(/^\//, ''), element: <UnauthorizedPage /> },
      { path: ROUTES.forbidden.replace(/^\//, ''), element: <ForbiddenPage /> },
      { path: ROUTES.serverError.replace(/^\//, ''), element: <ServerErrorPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
