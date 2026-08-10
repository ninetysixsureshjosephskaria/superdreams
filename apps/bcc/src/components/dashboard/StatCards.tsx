import type { ReactNode } from 'react';

import type { DashboardKpis } from '@superdreams/api-client';
import { Icon, Skeleton, StatCard } from '@superdreams/ui';
import { formatCurrency } from '@superdreams/utils';

/** Wraps a metric value so digits align (tabular figures). */
function Metric({ children }: { children: ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}

/** Row of summary statistic cards backed by the real reporting KPIs. */
export function StatCards({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active members"
        value={<Metric>{kpis.members.active.toLocaleString()}</Metric>}
        hint={`of ${kpis.members.total.toLocaleString()} total`}
        icon={<Icon name="users" size="sm" />}
      />
      <StatCard
        label="Wallet float"
        value={<Metric>{formatCurrency(kpis.walletAvailableMinor / 100, 'USD')}</Metric>}
        hint="available balance"
        icon={<Icon name="wallet" size="sm" />}
      />
      <StatCard
        label="Reward points"
        value={<Metric>{kpis.rewardPoints.toLocaleString()}</Metric>}
        hint="outstanding balance"
        icon={<Icon name="gift" size="sm" />}
      />
      <StatCard
        label="Active campaigns"
        value={<Metric>{kpis.activeCampaigns.toLocaleString()}</Metric>}
        hint={`${kpis.notificationsDelivered.toLocaleString()} notifications delivered`}
        icon={<Icon name="megaphone" size="sm" />}
      />
    </div>
  );
}

/** Loading placeholder matching the StatCards grid + card shape. */
export function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-card border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
