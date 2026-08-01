import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { ProtectedRoute } from '@/guards';
import { AppLayout, PublicLayout } from '@/layouts';
import { RouteErrorPage } from '@/pages/error/RouteErrorPage';

// Pages are code-split; layouts render a Suspense fallback while they load.
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const WalletPage = lazy(() => import('@/features/wallet/pages/WalletPage'));
const GamesPage = lazy(() => import('@/features/games/pages/GamesPage'));
const DreamStorePage = lazy(() => import('@/features/dream-store/pages/DreamStorePage'));
const UnauthorizedPage = lazy(() => import('@/pages/errors/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('@/pages/errors/ForbiddenPage'));
const ServerErrorPage = lazy(() => import('@/pages/errors/ServerErrorPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

/**
 * Application router.
 *
 * Navigation is limited to Home, Games, Dream Store, Wallet and Profile (see
 * `navigation/nav-config.ts`). All five are fully functional and backed by the
 * real API. Other member feature pages remain in the codebase but are
 * intentionally not routed here.
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
      { path: ROUTES.dreamStore.replace(/^\//, ''), element: <DreamStorePage /> },
      { path: ROUTES.wallet.replace(/^\//, ''), element: <WalletPage /> },
      { path: ROUTES.profile.replace(/^\//, ''), element: <ProfilePage /> },
    ],
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
