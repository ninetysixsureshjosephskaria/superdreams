import { Helmet } from 'react-helmet-async';

import {
  LatestNotifications,
  QuickActions,
  RecentTransactions,
  RewardsSummaryCard,
  WalletSummaryCard,
  WelcomeBanner,
} from '@/components/dashboard';
import { PageHeader } from '@/components/page-header';
import { ContentCard, EmptyState } from '@superdreams/ui';

/** Member home dashboard. Live overview backed by the member's wallet, rewards and inbox. */
export default function DashboardPage() {
  return (
    <>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <PageHeader title="Home" description="Your member portal overview." />

      <div className="space-y-6">
        <WelcomeBanner />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <WalletSummaryCard />
          <RewardsSummaryCard />
          <QuickActions />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentTransactions />
          </div>
          <div className="space-y-4">
            <LatestNotifications />
            <ContentCard title="Offers">
              <EmptyState
                title="No offers yet"
                description="Personalized offers will appear here."
              />
            </ContentCard>
          </div>
        </div>
      </div>
    </>
  );
}
