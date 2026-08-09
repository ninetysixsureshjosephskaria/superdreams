import type { PartnerNetworkSummary } from '@superdreams/api-client';
import { Alert, DataTable, EmptyState, type DataTableColumn } from '@superdreams/ui';

import { usePartners } from '../hooks';

const columns: DataTableColumn<PartnerNetworkSummary>[] = [
  { id: 'name', header: 'Partner', cell: (row) => row.name },
  { id: 'memberNumber', header: 'Member #', cell: (row) => row.memberNumber },
  {
    id: 'direct',
    header: 'Direct members',
    align: 'right',
    cell: (row) => row.directMemberCount.toLocaleString(),
  },
  {
    id: 'total',
    header: 'Total network',
    align: 'right',
    cell: (row) => row.totalNetworkCount.toLocaleString(),
  },
];

/** Read-only list of partners and their downline sizes (requires network.read). */
export function PartnersPanel() {
  const query = usePartners();

  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load partners">
        {query.error.message}
      </Alert>
    );
  }
  if (!query.isPending && query.data && query.data.length === 0) {
    return <EmptyState title="No partners" description="No partner networks exist yet." />;
  }
  return (
    <DataTable
      columns={columns}
      rows={query.data ?? []}
      getRowId={(row) => row.partnerMemberId}
      isLoading={query.isPending}
    />
  );
}
