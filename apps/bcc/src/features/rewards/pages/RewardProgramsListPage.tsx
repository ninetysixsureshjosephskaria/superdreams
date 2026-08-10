import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { RewardProgramStatus, RewardProgramSummary } from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Icon,
  Input,
  Pagination,
  SearchBox,
  Select,
  type DataTableColumn,
  type DataTableSort,
} from '@superdreams/ui';

import { RewardProgramStatusBadge } from '../components/RewardBadges';
import { usePrograms } from '../hooks';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const sortFieldByColumn: Record<string, 'name' | 'status' | 'code' | 'createdAt'> = {
  name: 'name',
  status: 'status',
  code: 'code',
};

/** Admin reward program list: server-side pagination, search, filter and sort. */
export default function RewardProgramsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [memberLookup, setMemberLookup] = useState('');
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'name', direction: 'asc' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const query = usePrograms({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status ? (status as RewardProgramStatus) : undefined,
    sortBy: sortFieldByColumn[sort.columnId] ?? 'createdAt',
    order: sort.direction,
  });

  const columns: DataTableColumn<RewardProgramSummary>[] = [
    {
      id: 'name',
      header: 'Program',
      sortable: true,
      cell: (program) => (
        <div>
          <p className="font-medium">{program.name}</p>
          <p className="text-xs text-muted-foreground">{program.code}</p>
        </div>
      ),
    },
    { id: 'type', header: 'Type', cell: (program) => program.type },
    { id: 'category', header: 'Category', cell: (program) => program.categoryCode ?? '—' },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (program) => <RewardProgramStatusBadge status={program.status} />,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Reward programs</title>
      </Helmet>
      <PageHeader
        title="Rewards"
        description="Manage reward programs and member points."
        actions={
          <Button
            leftIcon={<Icon name="plus" size="sm" />}
            onClick={() => navigate('/rewards/new')}
          >
            New program
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <SearchBox
            aria-label="Search programs"
            placeholder="Search by name or code…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
            }}
            onClear={() => {
              setSearchInput('');
            }}
          />
        </div>
        <div className="w-44">
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
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (memberLookup.trim()) {
              navigate(`/rewards/members/${memberLookup.trim()}`);
            }
          }}
        >
          <div className="w-72">
            <Input
              aria-label="Member id"
              placeholder="Open member rewards by member id…"
              value={memberLookup}
              onChange={(event) => {
                setMemberLookup(event.target.value);
              }}
            />
          </div>
          <Button type="submit" variant="outline">
            Open
          </Button>
        </form>
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load programs">
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
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(program) => program.id}
          isLoading={query.isPending}
          sort={sort}
          onSortChange={setSort}
          rowActions={(program) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/rewards/programs/${program.id}`)}
            >
              View
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {query.data.total} program{query.data.total === 1 ? '' : 's'}
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
