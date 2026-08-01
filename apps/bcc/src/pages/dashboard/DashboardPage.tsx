import { Helmet } from 'react-helmet-async';

import {
  LatestMembers,
  NotificationsPanel,
  QuickActionsPanel,
  RecentActivity,
  StatCards,
  WelcomeSection,
} from '@/components/dashboard';
import { PageHeader } from '@/components/page-header';
import { useReportDashboard } from '@/features/reports/hooks';
import { Alert, ContentCard, EmptyState, Skeleton } from '@superdreams/ui';

/** Dashboard home. Live platform overview backed by the reporting KPIs. */
export default function DashboardPage() {
  const dashboard = useReportDashboard();

  return (
    <>
      <Helmet>
        <title>Dashboard</title>
      </Helmet>
      <PageHeader title="Dashboard" description="Overview of the Super Dreams platform." />

      <div className="space-y-6">
        <WelcomeSection />

        {dashboard.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : dashboard.isError ? (
          <Alert variant="destructive" title="Could not load dashboard metrics">
            {dashboard.error.message}
          </Alert>
        ) : (
          <StatCards kpis={dashboard.data.kpis} />
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <LatestMembers />
            <RecentActivity items={dashboard.data?.recentActivity ?? []} />
          </div>
          <div className="space-y-4">
            <QuickActionsPanel />
            <NotificationsPanel />
            <ContentCard title="Announcements">
              <EmptyState
                title="Nothing to announce"
                description="Announcements will appear here."
              />
            </ContentCard>
          </div>
        </div>
      </div>
    </>
  );
}
