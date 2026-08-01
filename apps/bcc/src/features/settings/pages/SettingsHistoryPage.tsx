import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import type { SettingHistoryData } from '@superdreams/api-client';
import { Alert, DataTable, Input, Pagination, type DataTableColumn } from '@superdreams/ui';

import { useSettingsHistory } from '../hooks';

const PAGE_SIZE = 15;

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/** Settings change history: an audit trail of configuration changes. */
export default function SettingsHistoryPage() {
  const [page, setPage] = useState(1);
  const [key, setKey] = useState('');
  const query = useSettingsHistory({ page, pageSize: PAGE_SIZE, key: key || undefined });

  const columns: DataTableColumn<SettingHistoryData>[] = [
    { id: 'key', header: 'Setting', cell: (h) => h.key },
    { id: 'category', header: 'Category', cell: (h) => h.categoryCode },
    { id: 'old', header: 'Old value', cell: (h) => renderValue(h.oldValue) },
    { id: 'new', header: 'New value', cell: (h) => renderValue(h.newValue) },
    { id: 'version', header: 'Version', align: 'right', cell: (h) => h.version },
    {
      id: 'when',
      header: 'When',
      align: 'right',
      cell: (h) => new Date(h.createdAt).toLocaleString(),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Settings history</title>
      </Helmet>
      <PageHeader title="Settings history" description="A trail of configuration changes." />

      <div className="mb-4 w-64">
        <Input
          placeholder="Filter by setting key…"
          value={key}
          onChange={(event) => {
            setKey(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load history">
          {query.error.message}
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          getRowId={(h) => h.id}
          isLoading={query.isPending}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{query.data.total} changes</p>
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
