import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import type { NotificationChannel, NotificationTemplateData } from '@superdreams/api-client';
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

import { TemplateStatusBadge } from '../components/NotificationBadges';
import { useTemplates } from '../hooks';

const PAGE_SIZE = 10;

const CHANNEL_OPTIONS = [
  { label: 'All channels', value: '' },
  { label: 'In-app', value: 'IN_APP' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Push', value: 'PUSH' },
];

const sortFieldByColumn: Record<string, 'name' | 'code' | 'createdAt'> = {
  name: 'name',
  code: 'code',
};

/** Admin notification template list. */
export default function TemplatesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
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

  const query = useTemplates({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    channel: channel ? (channel as NotificationChannel) : undefined,
    sortBy: sortFieldByColumn[sort.columnId] ?? 'createdAt',
    order: sort.direction,
  });

  const columns: DataTableColumn<NotificationTemplateData>[] = [
    {
      id: 'name',
      header: 'Template',
      sortable: true,
      cell: (t) => (
        <div>
          <p className="font-medium">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.code}</p>
        </div>
      ),
    },
    { id: 'channel', header: 'Channel', cell: (t) => t.channel },
    { id: 'group', header: 'Group', cell: (t) => t.groupCode ?? '—' },
    { id: 'status', header: 'Status', cell: (t) => <TemplateStatusBadge status={t.status} /> },
  ];

  return (
    <>
      <Helmet>
        <title>Notification templates</title>
      </Helmet>
      <PageHeader
        title="Templates"
        description="Reusable notification templates with variables."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/notifications')}>
              Dashboard
            </Button>
            <Button
              leftIcon={<Icon name="plus" size="sm" />}
              onClick={() => navigate('/notifications/templates/new')}
            >
              New template
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <SearchBox
            aria-label="Search templates"
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
            aria-label="Filter by channel"
            options={CHANNEL_OPTIONS}
            value={channel}
            onChange={(event) => {
              setChannel(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {query.isError ? (
        <Alert variant="destructive" title="Could not load templates">
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
          getRowId={(t) => t.id}
          isLoading={query.isPending}
          sort={sort}
          onSortChange={setSort}
          rowActions={(t) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/notifications/templates/${t.id}/edit`)}
            >
              Edit
            </Button>
          )}
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{query.data.total}</span> templates
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
