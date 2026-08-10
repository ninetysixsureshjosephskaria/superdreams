import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { ReportDefinitionData } from '@superdreams/api-client';
import {
  Alert,
  Button,
  DataTable,
  Input,
  Pagination,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { useReportDefinitions } from '../hooks';

const PAGE_SIZE = 10;

const SOURCE_OPTIONS = [
  { label: 'All sources', value: '' },
  { label: 'Members', value: 'MEMBERS' },
  { label: 'Wallet', value: 'WALLET' },
  { label: 'Rewards', value: 'REWARDS' },
  { label: 'Campaigns', value: 'CAMPAIGNS' },
  { label: 'Notifications', value: 'NOTIFICATIONS' },
  { label: 'Audit', value: 'AUDIT' },
  { label: 'User activity', value: 'USER_ACTIVITY' },
];

/** The report catalog: browse, search and open a report to run. */
export default function ReportsCatalogPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');

  const query = useReportDefinitions({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    source: source || undefined,
  });

  const columns: DataTableColumn<ReportDefinitionData>[] = [
    {
      id: 'name',
      header: 'Report',
      cell: (d) => (
        <div>
          <p className="font-medium">{d.name}</p>
          <p className="text-xs text-muted-foreground">{d.description}</p>
        </div>
      ),
    },
    { id: 'category', header: 'Category', cell: (d) => d.categoryLabel ?? '—' },
    { id: 'source', header: 'Source', cell: (d) => d.source },
  ];

  return (
    <>
      <Helmet>
        <title>Reports catalog</title>
      </Helmet>
      <PageHeader title="Reports" description="Browse and run available reports." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Input
            placeholder="Search reports…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Filter by source"
            options={SOURCE_OPTIONS}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load reports">
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
          getRowId={(d) => d.id}
          isLoading={query.isPending}
          rowActions={(d) => (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/run/${d.code}`)}>
              Run
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{query.data.total}</span> reports
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
