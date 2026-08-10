import { StatusPill } from '@/components/status-pill';
import { useMembers } from '@/features/members/hooks';
import type { MemberSummary } from '@superdreams/api-client';
import { ContentCard, DataTable, type DataTableColumn } from '@superdreams/ui';

const columns: DataTableColumn<MemberSummary>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (member) => <span className="font-medium">{member.fullName}</span>,
  },
  {
    id: 'email',
    header: 'Email',
    cell: (member) => <span className="text-muted-foreground">{member.email}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (member) => <StatusPill status={member.status} />,
  },
  {
    id: 'joined',
    header: 'Joined',
    align: 'right',
    cell: (member) => (
      <span className="tabular-nums text-muted-foreground">
        {new Date(member.joinedAt).toLocaleDateString()}
      </span>
    ),
  },
];

/** Latest members table backed by the real members API. */
export function LatestMembers() {
  const query = useMembers({ page: 1, pageSize: 5, order: 'desc' });

  return (
    <ContentCard title="Latest members" description="Newest sign-ups">
      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(member) => member.id}
        isLoading={query.isPending}
        emptyState="No members yet."
      />
    </ContentCard>
  );
}
