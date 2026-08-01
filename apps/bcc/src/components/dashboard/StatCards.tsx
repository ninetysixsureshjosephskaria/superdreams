import type { DashboardKpis } from '@superdreams/api-client';
import { Icon, StatCard } from '@superdreams/ui';
import { formatCurrency } from '@superdreams/utils';

/** Row of summary statistic cards backed by the real reporting KPIs. */
export function StatCards({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active members"
        value={kpis.members.active.toLocaleString()}
        hint={`of ${kpis.members.total.toLocaleString()} total`}
        icon={<Icon name="users" size="sm" />}
      />
      <StatCard
        label="Wallet float"
        value={formatCurrency(kpis.walletAvailableMinor / 100, 'USD')}
        hint="available balance"
        icon={<Icon name="wallet" size="sm" />}
      />
      <StatCard
        label="Reward points"
        value={kpis.rewardPoints.toLocaleString()}
        hint="outstanding balance"
        icon={<Icon name="gift" size="sm" />}
      />
      <StatCard
        label="Active campaigns"
        value={kpis.activeCampaigns.toLocaleString()}
        hint={`${kpis.notificationsDelivered.toLocaleString()} notifications delivered`}
        icon={<Icon name="megaphone" size="sm" />}
      />
    </div>
  );
}
