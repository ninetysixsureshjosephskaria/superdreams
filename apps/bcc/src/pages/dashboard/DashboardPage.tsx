import { Helmet } from 'react-helmet-async';

import {
  LatestMembers,
  NotificationsPanel,
  QuickActionsPanel,
  RecentActivity,
  StatCards,
  StatCardsSkeleton,
  WelcomeSection,
} from '@/components/dashboard';
import { PageHeader } from '@/components/page-header';
import { SectionHeading } from '@/components/section-heading';
import { useReportDashboard } from '@/features/reports/hooks';
import { Alert, Button, ContentCard, EmptyState } from '@superdreams/ui';

/** Dashboard home. Live platform overview backed by the reporting KPIs. */
export default function DashboardPage() {
  const dashboard = useReportDashboard();

  return (
    <>
      <Helmet>
        <title>Dashboard</title>
      </Helmet>
      <PageHeader title="Dashboard" description="Overview of the Super Dreams platform." />

      <div className="space-y-8 motion-safe:animate-fade-in">
        <WelcomeSection />

        <section>
          <SectionHeading title="Key metrics" icon="bar-chart" />
          {dashboard.isPending ? (
            <StatCardsSkeleton />
          ) : dashboard.isError ? (
            <Alert variant="destructive" title="Could not load dashboard metrics">
              <div className="space-y-3">
                <p>{dashboard.error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void dashboard.refetch();
                  }}
                >
                  Try again
                </Button>
              </div>
            </Alert>
          ) : (
            <StatCards kpis={dashboard.data.kpis} />
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <LatestMembers />
            <RecentActivity items={dashboard.data?.recentActivity ?? []} />
          </div>
          <div className="space-y-6">
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
