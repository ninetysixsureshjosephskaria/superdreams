import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

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
const MembersListPage = lazy(() => import('@/features/members/pages/MembersListPage'));
const MemberDetailsPage = lazy(() => import('@/features/members/pages/MemberDetailsPage'));
const MemberCreatePage = lazy(() => import('@/features/members/pages/MemberCreatePage'));
const MemberEditPage = lazy(() => import('@/features/members/pages/MemberEditPage'));
const WalletsListPage = lazy(() => import('@/features/wallets/pages/WalletsListPage'));
const FinanceDashboardPage = lazy(() => import('@/features/finance/pages/FinanceDashboardPage'));
const FinanceQueuePage = lazy(() => import('@/features/finance/pages/FinanceQueuePage'));
const NetworkPage = lazy(() => import('@/features/network/pages/NetworkPage'));
const FinanceLimitsPage = lazy(() => import('@/features/finance/pages/FinanceLimitsPage'));
const CurrenciesPage = lazy(() => import('@/features/currencies/pages/CurrenciesPage'));
const CommissionPage = lazy(() => import('@/features/commission/pages/CommissionPage'));
const ProfitPage = lazy(() => import('@/features/profit/pages/ProfitPage'));
const BonusCampaignsPage = lazy(() => import('@/features/bonus/pages/BonusCampaignsPage'));
const ActivationBonusPage = lazy(
  () => import('@/features/activation-bonus/pages/ActivationBonusPage'),
);
const WalletDetailsPage = lazy(() => import('@/features/wallets/pages/WalletDetailsPage'));
const WalletCreatePage = lazy(() => import('@/features/wallets/pages/WalletCreatePage'));
const RewardProgramsListPage = lazy(
  () => import('@/features/rewards/pages/RewardProgramsListPage'),
);
const RewardProgramDetailsPage = lazy(
  () => import('@/features/rewards/pages/RewardProgramDetailsPage'),
);
const ProgramCreatePage = lazy(() => import('@/features/rewards/pages/ProgramCreatePage'));
const ProgramEditPage = lazy(() => import('@/features/rewards/pages/ProgramEditPage'));
const MemberRewardsPage = lazy(() => import('@/features/rewards/pages/MemberRewardsPage'));
const RewardTransactionsPage = lazy(
  () => import('@/features/rewards/pages/RewardTransactionsPage'),
);
const CampaignsListPage = lazy(() => import('@/features/campaigns/pages/CampaignsListPage'));
const CampaignDetailsPage = lazy(() => import('@/features/campaigns/pages/CampaignDetailsPage'));
const CampaignCreatePage = lazy(() => import('@/features/campaigns/pages/CampaignCreatePage'));
const CampaignEditPage = lazy(() => import('@/features/campaigns/pages/CampaignEditPage'));
const NotificationsDashboardPage = lazy(
  () => import('@/features/notifications/pages/NotificationsDashboardPage'),
);
const TemplatesListPage = lazy(() => import('@/features/notifications/pages/TemplatesListPage'));
const TemplateCreatePage = lazy(() => import('@/features/notifications/pages/TemplateCreatePage'));
const TemplateEditPage = lazy(() => import('@/features/notifications/pages/TemplateEditPage'));
const SendNotificationPage = lazy(
  () => import('@/features/notifications/pages/SendNotificationPage'),
);
const ReportsDashboardPage = lazy(() => import('@/features/reports/pages/ReportsDashboardPage'));
const ReportsCatalogPage = lazy(() => import('@/features/reports/pages/ReportsCatalogPage'));
const ReportRunPage = lazy(() => import('@/features/reports/pages/ReportRunPage'));
const ExportHistoryPage = lazy(() => import('@/features/reports/pages/ExportHistoryPage'));
const SchedulesPage = lazy(() => import('@/features/reports/pages/SchedulesPage'));
const SettingsDashboardPage = lazy(() => import('@/features/settings/pages/SettingsDashboardPage'));
const FeatureTogglesPage = lazy(() => import('@/features/settings/pages/FeatureTogglesPage'));
const MaintenancePage = lazy(() => import('@/features/settings/pages/MaintenancePage'));
const SettingsHistoryPage = lazy(() => import('@/features/settings/pages/SettingsHistoryPage'));
const DreamStoreProductsPage = lazy(() => import('@/features/dream-store/pages/ProductsPage'));
const DreamStoreProductDetailPage = lazy(
  () => import('@/features/dream-store/pages/ProductDetailPage'),
);
const DreamStoreCategoriesPage = lazy(() => import('@/features/dream-store/pages/CategoriesPage'));
const DreamStoreOrdersPage = lazy(() => import('@/features/dream-store/pages/OrdersPage'));
const DreamStoreInventoryPage = lazy(() => import('@/features/dream-store/pages/InventoryPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage'));
const UnauthorizedPage = lazy(() => import('@/pages/errors/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('@/pages/errors/ForbiddenPage'));
const ServerErrorPage = lazy(() => import('@/pages/errors/ServerErrorPage'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));

/**
 * Application router.
 *
 * The admin area is wrapped in {@link ProtectedRoute} (a mock guard in this
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
      {
        path: 'members',
        element: (
          <ProtectedRoute permission="member.read">
            <MembersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'members/new',
        element: (
          <ProtectedRoute permission="member.create">
            <MemberCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'members/:id',
        element: (
          <ProtectedRoute permission="member.read">
            <MemberDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'members/:id/edit',
        element: (
          <ProtectedRoute permission="member.update">
            <MemberEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wallet',
        element: (
          <ProtectedRoute permission="wallet.read">
            <WalletsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wallet/new',
        element: (
          <ProtectedRoute permission="wallet.create">
            <WalletCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wallet/:id',
        element: (
          <ProtectedRoute permission="wallet.read">
            <WalletDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <ProtectedRoute permission="finance.read">
            <FinanceDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/queue',
        element: (
          <ProtectedRoute permission="finance.read">
            <FinanceQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/limits',
        element: (
          <ProtectedRoute permission="finance.read">
            <FinanceLimitsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/profit',
        element: (
          <ProtectedRoute permission="profit.schedule">
            <ProfitPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/bonus-campaigns',
        element: (
          <ProtectedRoute permission="bonus.manage">
            <BonusCampaignsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/activation-bonus',
        element: (
          <ProtectedRoute permission="activation.bonus.manage">
            <ActivationBonusPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'network',
        element: (
          <ProtectedRoute permission="network.read">
            <NetworkPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'currencies',
        element: (
          <ProtectedRoute permission="currency.manage">
            <CurrenciesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'commission',
        element: (
          <ProtectedRoute permission="commission.manage">
            <CommissionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards',
        element: (
          <ProtectedRoute permission="reward.read">
            <RewardProgramsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards/new',
        element: (
          <ProtectedRoute permission="reward.program.create">
            <ProgramCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards/transactions',
        element: (
          <ProtectedRoute permission="reward.read">
            <RewardTransactionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards/programs/:id',
        element: (
          <ProtectedRoute permission="reward.read">
            <RewardProgramDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards/programs/:id/edit',
        element: (
          <ProtectedRoute permission="reward.program.update">
            <ProgramEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'rewards/members/:memberId',
        element: (
          <ProtectedRoute permission="reward.read">
            <MemberRewardsPage />
          </ProtectedRoute>
        ),
      },
      { path: 'dream-store', element: <Navigate to="/dream-store/products" replace /> },
      { path: 'dream-store/products', element: <DreamStoreProductsPage /> },
      { path: 'dream-store/products/:id', element: <DreamStoreProductDetailPage /> },
      { path: 'dream-store/categories', element: <DreamStoreCategoriesPage /> },
      { path: 'dream-store/orders', element: <DreamStoreOrdersPage /> },
      { path: 'dream-store/inventory', element: <DreamStoreInventoryPage /> },
      {
        path: 'campaigns',
        element: (
          <ProtectedRoute permission="campaign.read">
            <CampaignsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'campaigns/new',
        element: (
          <ProtectedRoute permission="campaign.create">
            <CampaignCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'campaigns/:id',
        element: (
          <ProtectedRoute permission="campaign.read">
            <CampaignDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'campaigns/:id/edit',
        element: (
          <ProtectedRoute permission="campaign.update">
            <CampaignEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute permission="notification.read">
            <NotificationsDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications/send',
        element: (
          <ProtectedRoute permission="notification.send">
            <SendNotificationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications/templates',
        element: (
          <ProtectedRoute permission="notification.read">
            <TemplatesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications/templates/new',
        element: (
          <ProtectedRoute permission="notification.template.create">
            <TemplateCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications/templates/:id/edit',
        element: (
          <ProtectedRoute permission="notification.template.update">
            <TemplateEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute permission="report.read">
            <ReportsDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/catalog',
        element: (
          <ProtectedRoute permission="report.read">
            <ReportsCatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/run/:code',
        element: (
          <ProtectedRoute permission="report.read">
            <ReportRunPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/exports',
        element: (
          <ProtectedRoute permission="report.export">
            <ExportHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports/schedules',
        element: (
          <ProtectedRoute permission="report.schedule">
            <SchedulesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute permission="settings.read">
            <SettingsDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/feature-flags',
        element: (
          <ProtectedRoute permission="settings.read">
            <FeatureTogglesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/maintenance',
        element: (
          <ProtectedRoute permission="settings.read">
            <MaintenancePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/history',
        element: (
          <ProtectedRoute permission="settings.read">
            <SettingsHistoryPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTES.login.replace(/^\//, ''),
    element: lazyPage(<LoginPage />),
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
