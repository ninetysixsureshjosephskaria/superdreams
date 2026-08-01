import { useMembers } from '@/features/members/hooks';
import type { MemberStatus, MemberSummary } from '@superdreams/api-client';
import {
  Badge,
  ContentCard,
  DataTable,
  type BadgeVariant,
  type DataTableColumn,
} from '@superdreams/ui';

const statusVariant: Record<MemberStatus, BadgeVariant> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'destructive',
  INACTIVE: 'secondary',
  ARCHIVED: 'outline',
};

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
    cell: (member) => (
      <Badge variant={statusVariant[member.status]}>{member.status.toLowerCase()}</Badge>
    ),
  },
  {
    id: 'joined',
    header: 'Joined',
    align: 'right',
    cell: (member) => new Date(member.joinedAt).toLocaleDateString(),
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
