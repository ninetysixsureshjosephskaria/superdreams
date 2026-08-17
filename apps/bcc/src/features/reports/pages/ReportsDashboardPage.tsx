import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { RecentActivityItem } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  Icon,
  StatCard,
  type DataTableColumn,
} from '@superdreams/ui';

import { useReportDashboard, useSavedReports } from '../hooks';

/** Analytics overview: KPI cards, recent activity and saved reports. */
export default function ReportsDashboardPage() {
  const navigate = useNavigate();
  const dashboard = useReportDashboard();
  const saved = useSavedReports({ pageSize: 5 });

  const kpis = dashboard.data?.kpis;

  const activityColumns: DataTableColumn<RecentActivityItem>[] = [
    { id: 'module', header: 'Module', cell: (a) => a.module ?? '—' },
    { id: 'action', header: 'Action', cell: (a) => a.action },
    { id: 'entity', header: 'Entity', cell: (a) => a.entityType },
    {
      id: 'when',
      header: 'When',
      align: 'right',
      cell: (a) => <span className="tabular-nums">{new Date(a.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Reports &amp; Analytics</title>
      </Helmet>
      <PageHeader
        title="Reports & Analytics"
        description="Platform-wide KPIs, reports and exports."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/reports/exports')}>
              Export history
            </Button>
            <Button variant="outline" onClick={() => navigate('/reports/schedules')}>
              Scheduled
            </Button>
            <Button
              leftIcon={<Icon name="bar-chart" size="sm" />}
              onClick={() => navigate('/reports/catalog')}
            >
              Browse reports
            </Button>
          </div>
        }
      />

      {dashboard.isError ? (
        <Alert variant="destructive" title="Could not load the dashboard">
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
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Members"
              value={
                <span className="tabular-nums">{(kpis?.members.total ?? 0).toLocaleString()}</span>
              }
              hint={`${kpis?.members.active ?? 0} active`}
            />
            <StatCard
              label="Reward points"
              value={
                <span className="tabular-nums">{(kpis?.rewardPoints ?? 0).toLocaleString()}</span>
              }
              hint="Outstanding balance"
            />
            <StatCard
              label="Active campaigns"
              value={
                <span className="tabular-nums">
                  {(kpis?.activeCampaigns ?? 0).toLocaleString()}
                </span>
              }
            />
            <StatCard
              label="Notifications delivered"
              value={
                <span className="tabular-nums">
                  {(kpis?.notificationsDelivered ?? 0).toLocaleString()}
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ContentCard title="Recent activity" className="lg:col-span-2">
              <DataTable
                columns={activityColumns}
                rows={dashboard.data?.recentActivity ?? []}
                getRowId={(a) => a.id}
                isLoading={dashboard.isPending}
              />
            </ContentCard>

            <ContentCard title="Saved reports">
              {saved.data && saved.data.items.length > 0 ? (
                <ul className="divide-y">
                  {saved.data.items.map((report) => (
                    <li key={report.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{report.name}</p>
                        <p className="text-xs text-muted-foreground">{report.definitionCode}</p>
                      </div>
                      {report.definitionCode ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/reports/run/${report.definitionCode ?? ''}`)}
                        >
                          Run
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">No saved reports yet.</p>
              )}
            </ContentCard>
          </div>
        </>
      )}
    </>
  );
}
