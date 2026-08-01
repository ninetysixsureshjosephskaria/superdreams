import type {
  DashboardWidgetData,
  ReportDefinitionData,
  ReportExecutionData,
  ReportExportData,
  ReportFilterValues,
  ReportScheduleData,
  SavedFilterData,
  SavedReportData,
} from '../dto';
import type { DefinitionRow } from '../repositories/catalog.repository';
import type { WidgetRow } from '../repositories/dashboard.repository';
import type { ExportRow } from '../repositories/export.repository';
import type { ExecutionRow } from '../repositories/history.repository';
import type { SavedFilterRow, SavedReportView } from '../repositories/saved.repository';
import type { ScheduleRow } from '../repositories/schedule.repository';

function asFilters(value: unknown): ReportFilterValues | null {
  return (value as ReportFilterValues | null) ?? null;
}

export function toDefinition(row: DefinitionRow): ReportDefinitionData {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    source: row.source,
    categoryCode: row.categoryCode,
    categoryLabel: row.categoryLabel,
    isActive: row.isActive,
  };
}

export function toExport(row: ExportRow): ReportExportData {
  return {
    id: row.id,
    reportCode: row.reportCode,
    format: row.format,
    status: row.status,
    filters: asFilters(row.filters),
    rowCount: row.rowCount,
    contentType: row.contentType,
    fileName: row.fileName,
    error: row.error,
    requestedBy: row.requestedBy,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  };
}

export function toSchedule(row: ScheduleRow): ReportScheduleData {
  return {
    id: row.id,
    reportCode: row.reportCode,
    name: row.name,
    frequency: row.frequency,
    cron: row.cron,
    filters: asFilters(row.filters),
    format: row.format,
    isActive: row.isActive,
    nextRunAt: row.nextRunAt,
    lastRunAt: row.lastRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toExecution(row: ExecutionRow): ReportExecutionData {
  return {
    id: row.id,
    reportCode: row.reportCode,
    trigger: row.trigger,
    status: row.status,
    filters: asFilters(row.filters),
    rowCount: row.rowCount,
    durationMs: row.durationMs,
    error: row.error,
    runBy: row.runBy,
    createdAt: row.createdAt,
  };
}

export function toSavedReport(row: SavedReportView): SavedReportData {
  return {
    id: row.id,
    name: row.name,
    definitionId: row.definitionId,
    definitionCode: row.definitionCode,
    ownerId: row.ownerId,
    filters: row.filters,
    isShared: row.isShared,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toSavedFilter(row: SavedFilterRow): SavedFilterData {
  return {
    id: row.id,
    userId: row.userId,
    reportCode: row.reportCode,
    name: row.name,
    filters: asFilters(row.filters),
    createdAt: row.createdAt,
  };
}

export function toWidget(row: WidgetRow): DashboardWidgetData {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    title: row.title,
    description: row.description,
    config: (row.config as Record<string, unknown> | null) ?? null,
    isActive: row.isActive,
  };
}
