import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { useNotificationStore } from '@/store';
import type { ReportExportData } from '@superdreams/api-client';
import { Alert, Button, DataTable, Pagination, type DataTableColumn } from '@superdreams/ui';

import { reportsApi } from '../api';
import { downloadTextFile } from '../format';
import { useReportExports } from '../hooks';

const PAGE_SIZE = 10;

/** Export history: every generated export with a download action. */
export default function ExportHistoryPage() {
  const notify = useNotificationStore((state) => state.notify);
  const [page, setPage] = useState(1);
  const query = useReportExports({ page, pageSize: PAGE_SIZE });

  const onDownload = async (job: ReportExportData): Promise<void> => {
    try {
      const content = await reportsApi.downloadExport(job.id);
      downloadTextFile(
        job.fileName ?? `${job.reportCode.toLowerCase()}.csv`,
        content,
        job.contentType ?? 'text/csv',
      );
    } catch {
      notify({ variant: 'error', title: 'Download failed' });
    }
  };

  const columns: DataTableColumn<ReportExportData>[] = [
    { id: 'report', header: 'Report', cell: (e) => e.reportCode },
    { id: 'format', header: 'Format', cell: (e) => e.format },
    { id: 'status', header: 'Status', cell: (e) => <StatusPill status={e.status} /> },
    {
      id: 'rows',
      header: 'Rows',
      align: 'right',
      cell: (e) => <span className="tabular-nums">{e.rowCount.toLocaleString()}</span>,
    },
    {
      id: 'created',
      header: 'Created',
      align: 'right',
      cell: (e) => <span className="tabular-nums">{new Date(e.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Export history</title>
      </Helmet>
      <PageHeader title="Export history" description="Generated report exports." />

      {query.isError ? (
        <Alert variant="destructive" title="Could not load exports">
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
          getRowId={(e) => e.id}
          isLoading={query.isPending}
          rowActions={(e) =>
            e.status === 'COMPLETED' ? (
              <Button variant="ghost" size="sm" onClick={() => void onDownload(e)}>
                Download
              </Button>
            ) : null
          }
        />
      )}

      {query.data ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{query.data.total}</span> exports
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
