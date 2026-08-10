import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { PageHeader } from '@/components/page-header';
import { useNotificationStore } from '@/store';
import type { ReportFilters, ReportFormat, ReportRow } from '@superdreams/api-client';
import {
  Alert,
  Button,
  ContentCard,
  DataTable,
  Input,
  Select,
  type DataTableColumn,
} from '@superdreams/ui';

import { reportsApi } from '../api';
import { downloadTextFile } from '../format';
import { useCreateExport, useRunReport, useSaveReport } from '../hooks';

type Row = ReportRow & { __id: string };

const FORMAT_OPTIONS = [
  { label: 'CSV', value: 'CSV' },
  { label: 'Excel (.xlsx)', value: 'XLSX' },
  { label: 'PDF', value: 'PDF' },
];

/** Runs a single report with a date-range filter; supports export and save. */
export default function ReportRunPage() {
  const { code = '' } = useParams<{ code: string }>();
  const notify = useNotificationStore((state) => state.notify);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [format, setFormat] = useState<ReportFormat>('CSV');
  const [saveName, setSaveName] = useState('');

  const run = useRunReport();
  const createExport = useCreateExport();
  const saveReport = useSaveReport();

  const buildFilters = useMemo(() => {
    return (): ReportFilters => {
      const filters: ReportFilters = {};
      if (dateFrom) filters.dateFrom = `${dateFrom}T00:00:00.000Z`;
      if (dateTo) filters.dateTo = `${dateTo}T23:59:59.999Z`;
      return filters;
    };
  }, [dateFrom, dateTo]);

  // Run once on mount (and whenever the report code changes).
  useEffect(() => {
    if (code) {
      run.mutate({ code, filters: buildFilters() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const result = run.data;

  const columns: DataTableColumn<Row>[] = (result?.columns ?? []).map((column) => ({
    id: column.key,
    header: column.label,
    cell: (row: Row) => {
      const value = row[column.key];
      return value == null ? '—' : String(value);
    },
  }));

  const rows: Row[] = (result?.rows ?? []).map((row, index) => ({ ...row, __id: String(index) }));

  const onExport = (): void => {
    createExport.mutate(
      { code, format, filters: buildFilters() },
      {
        onSuccess: (job) => {
          void (async () => {
            try {
              const content = await reportsApi.downloadExport(job.id);
              downloadTextFile(
                job.fileName ?? `${code.toLowerCase()}.csv`,
                content,
                job.contentType ?? 'text/csv',
              );
              notify({
                variant: 'success',
                title: 'Export ready',
                description: `${job.rowCount} rows.`,
              });
            } catch {
              notify({ variant: 'error', title: 'Download failed' });
            }
          })();
        },
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>{result?.name ?? 'Run report'}</title>
      </Helmet>
      <PageHeader title={result?.name ?? code} description="Run, filter and export this report." />

      <ContentCard title="Filters" className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="from">
              From
            </label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="to">
              To
            </label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <Button
            isLoading={run.isPending}
            onClick={() => run.mutate({ code, filters: buildFilters() })}
          >
            Run
          </Button>
          <div className="w-40">
            <Select
              aria-label="Export format"
              options={FORMAT_OPTIONS}
              value={format}
              onChange={(event) => setFormat(event.target.value as ReportFormat)}
            />
          </div>
          <Button variant="outline" isLoading={createExport.isPending} onClick={onExport}>
            Export
          </Button>
        </div>
      </ContentCard>

      {run.isError ? (
        <Alert variant="destructive" title="Could not run this report">
          <div className="space-y-3">
            <p>{run.error.message}</p>
            <Button
              size="sm"
              variant="outline"
              isLoading={run.isPending}
              onClick={() => run.mutate({ code, filters: buildFilters() })}
            >
              Try again
            </Button>
          </div>
        </Alert>
      ) : (
        <ContentCard
          title={result ? `Results (${result.rowCount})` : 'Results'}
          description={
            result ? `Generated ${new Date(result.generatedAt).toLocaleString()}` : undefined
          }
        >
          <DataTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.__id}
            isLoading={run.isPending}
          />
        </ContentCard>
      )}

      <ContentCard title="Save this report" className="mt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="name">
              Name
            </label>
            <Input
              id="name"
              placeholder="My saved report"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            isLoading={saveReport.isPending}
            disabled={saveName.trim().length === 0}
            onClick={() => {
              saveReport.mutate(
                { name: saveName.trim(), code, filters: buildFilters(), isShared: false },
                {
                  onSuccess: () => {
                    setSaveName('');
                    notify({ variant: 'success', title: 'Report saved' });
                  },
                },
              );
            }}
          >
            Save
          </Button>
        </div>
      </ContentCard>
    </>
  );
}
