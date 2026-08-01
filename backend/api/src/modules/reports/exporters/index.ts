import type { ReportFormat, ReportResult } from '../dto';

export interface ExportPayload {
  content: string;
  contentType: string;
  extension: string;
}

/**
 * Turns a report result into a downloadable payload. CSV is fully rendered
 * natively (no dependencies). XLSX/PDF are pluggable: a real binary renderer can
 * be registered here, but the default falls back to CSV content so an export job
 * always completes with usable data rather than failing — no heavy export
 * libraries are introduced in this phase.
 */
export interface ReportExporter {
  readonly format: ReportFormat;
  export(result: ReportResult): ExportPayload;
}

/** Escapes a value for CSV (RFC 4180: quote when it contains `,`, `"` or newlines). */
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Renders a report result as CSV text (header row + one row per record). */
export function renderCsv(result: ReportResult): string {
  const header = result.columns.map((column) => csvEscape(column.label)).join(',');
  const lines = result.rows.map((row) =>
    result.columns
      .map((column) => {
        const cell = row[column.key];
        return csvEscape(cell == null ? '' : String(cell));
      })
      .join(','),
  );
  return [header, ...lines].join('\r\n');
}

export class CsvExporter implements ReportExporter {
  public readonly format = 'CSV' as const;
  public export(result: ReportResult): ExportPayload {
    return { content: renderCsv(result), contentType: 'text/csv; charset=utf-8', extension: 'csv' };
  }
}

/**
 * XLSX exporter — pluggable seam. Renders CSV content (openable by every
 * spreadsheet application) and records the requested format. A future binary
 * `.xlsx` renderer can be dropped in without touching the reporting framework.
 */
export class XlsxExporter implements ReportExporter {
  public readonly format = 'XLSX' as const;
  public export(result: ReportResult): ExportPayload {
    return { content: renderCsv(result), contentType: 'text/csv; charset=utf-8', extension: 'csv' };
  }
}

/**
 * PDF exporter — pluggable seam. Renders a plain-text tabular representation
 * and records the requested format. A future binary PDF renderer can replace
 * this without changing callers.
 */
export class PdfExporter implements ReportExporter {
  public readonly format = 'PDF' as const;
  public export(result: ReportResult): ExportPayload {
    const header = result.columns.map((column) => column.label).join('\t');
    const body = result.rows
      .map((row) => result.columns.map((column) => row[column.key] ?? '').join('\t'))
      .join('\n');
    return {
      content: `${result.name}\n\n${header}\n${body}\n`,
      contentType: 'text/plain; charset=utf-8',
      extension: 'txt',
    };
  }
}

/** Registry of exporters keyed by format. */
export class ExporterRegistry {
  private readonly exporters = new Map<ReportFormat, ReportExporter>();

  public register(exporter: ReportExporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  public get(format: ReportFormat): ReportExporter {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`No exporter registered for format ${format}.`);
    }
    return exporter;
  }
}

export function createDefaultExporterRegistry(): ExporterRegistry {
  const registry = new ExporterRegistry();
  registry.register(new CsvExporter());
  registry.register(new XlsxExporter());
  registry.register(new PdfExporter());
  return registry;
}
