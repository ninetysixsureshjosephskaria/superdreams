import type { PartnerNetworkSummary } from '@superdreams/api-client';
import { Alert, Button, DataTable, EmptyState, type DataTableColumn } from '@superdreams/ui';

import { usePartners } from '../hooks';

const columns: DataTableColumn<PartnerNetworkSummary>[] = [
  { id: 'name', header: 'Partner', cell: (row) => <span className="font-medium">{row.name}</span> },
  {
    id: 'memberNumber',
    header: 'Member #',
    cell: (row) => <span className="tabular-nums text-muted-foreground">{row.memberNumber}</span>,
  },
  {
    id: 'direct',
    header: 'Direct members',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{row.directMemberCount.toLocaleString()}</span>,
  },
  {
    id: 'total',
    header: 'Total network',
    align: 'right',
    cell: (row) => <span className="tabular-nums">{row.totalNetworkCount.toLocaleString()}</span>,
  },
];

/** Read-only list of partners and their downline sizes (requires network.read). */
export function PartnersPanel() {
  const query = usePartners();

  if (query.isError) {
    return (
      <Alert variant="destructive" title="Could not load partners">
        <div className="space-y-3">
          <p>{query.error.message}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void query.refetch();
            }}
          >
            Try again
          </Button>
        </div>
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
