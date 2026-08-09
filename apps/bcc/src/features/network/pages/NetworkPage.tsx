import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { usePermissions } from '@/hooks';
import { Tabs } from '@superdreams/ui';

import { InvitesPanel } from '../components/InvitesPanel';
import { PartnersPanel } from '../components/PartnersPanel';

/** Admin network operations: partner networks and (with invite.send) invites. */
export default function NetworkPage() {
  const { can } = usePermissions();

  const items = [{ value: 'partners', label: 'Partners', content: <PartnersPanel /> }];
  if (can('invite.send')) {
    items.push({ value: 'invites', label: 'Invites', content: <InvitesPanel /> });
  }

  return (
    <>
      <Helmet>
        <title>Network</title>
      </Helmet>
      <PageHeader title="Network" description="Partner networks, referrals and invites" />
      <Tabs items={items} />
    </>
  );
}
