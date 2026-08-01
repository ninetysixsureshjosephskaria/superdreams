import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { CampaignStatus, CampaignSummary } from '@superdreams/api-client';
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

import { CampaignStatusBadge } from '../components/CampaignBadges';
import { useCampaigns } from '../hooks';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const sortFieldByColumn: Record<string, 'name' | 'status' | 'startsAt' | 'createdAt'> = {
  name: 'name',
  status: 'status',
  startsAt: 'startsAt',
};

/** Admin campaign list: server-side pagination, search, filter and sort. */
export default function CampaignsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<DataTableSort>({ columnId: 'createdAt', direction: 'desc' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  const query = useCampaigns({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status ? (status as CampaignStatus) : undefined,
    sortBy: sortFieldByColumn[sort.columnId] ?? 'createdAt',
    order: sort.direction,
  });

  const columns: DataTableColumn<CampaignSummary>[] = [
    {
      id: 'name',
      header: 'Campaign',
      sortable: true,
      cell: (campaign) => (
        <div>
          <p className="font-medium">{campaign.name}</p>
          <p className="text-xs text-muted-foreground">{campaign.code}</p>
        </div>
      ),
    },
    { id: 'type', header: 'Type', cell: (campaign) => campaign.type },
    { id: 'audience', header: 'Audience', cell: (campaign) => campaign.audienceType },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (campaign) => <CampaignStatusBadge status={campaign.status} />,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Campaigns</title>
      </Helmet>
      <PageHeader
        title="Campaigns"
        description="Create, target and run member campaigns."
        actions={
          <Button
            leftIcon={<Icon name="plus" size="sm" />}
            onClick={() => navigate('/campaigns/new')}
          >
            New campaign
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <SearchBox
            aria-label="Search campaigns"
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
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load campaigns">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(campaign) => campaign.id}
          isLoading={query.isPending}
          sort={sort}
          onSortChange={setSort}
          rowActions={(campaign) => (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
              View
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {query.data.total} campaign{query.data.total === 1 ? '' : 's'}
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
