import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { MemberSortField, MemberSummary } from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Icon,
  Pagination,
  SearchBox,
  Select,
  type DataTableColumn,
  type DataTableSort,
} from '@superdreams/ui';

import { MemberStatusBadge } from '../components/MemberStatusBadge';
import { useMembers } from '../hooks';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const sortFieldByColumn: Record<string, MemberSortField> = {
  name: 'lastName',
  status: 'status',
  joinedAt: 'joinedAt',
};

/** Admin member list: server-side pagination, search, filter and sort. */
export default function MembersListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'joinedAt', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const query = useMembers({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status ? (status as MemberSummary['status']) : undefined,
    sortBy: sortFieldByColumn[sort.columnId] ?? 'createdAt',
    order: sort.direction,
  });

  const columns: DataTableColumn<MemberSummary>[] = [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      cell: (member) => (
        <div>
          <p className="font-medium">{member.fullName}</p>
          <p className="text-xs text-muted-foreground">{member.memberNumber}</p>
        </div>
      ),
    },
    { id: 'email', header: 'Email', cell: (member) => member.email },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (member) => <MemberStatusBadge status={member.status} />,
    },
    {
      id: 'joinedAt',
      header: 'Joined',
      sortable: true,
      align: 'right',
      cell: (member) => new Date(member.joinedAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Members</title>
      </Helmet>
      <PageHeader
        title="Members"
        description="Search, filter and manage platform members."
        actions={
          <Button
            leftIcon={<Icon name="plus" size="sm" />}
            onClick={() => navigate('/members/new')}
          >
            New member
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <SearchBox
            aria-label="Search members"
            placeholder="Search by name, email, phone…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            onClear={() => {
              setSearchInput('');
            }}
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {selectedIds.length > 0 ? (
          <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
        ) : null}
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load members">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(member) => member.id}
          isLoading={query.isPending}
          sort={sort}
          onSortChange={setSort}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={(member) => (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/members/${member.id}`)}>
              View
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {query.data.total} member{query.data.total === 1 ? '' : 's'}
          </p>
          <Pagination
            page={query.data.page}
            pageCount={query.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </>
  );
}
