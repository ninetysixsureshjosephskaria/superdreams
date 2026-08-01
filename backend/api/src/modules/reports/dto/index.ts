import type { z } from 'zod';

import type { PaginatedResult } from '@/database/types';

import type {
  createExportSchema,
  createScheduleSchema,
  dashboardLayoutSchema,
  favoriteSchema,
  listExportsQuerySchema,
  listHistoryQuerySchema,
  listReportsQuerySchema,
  reportFiltersSchema,
  runReportSchema,
  saveReportSchema,
  savedFilterSchema,
  updateScheduleSchema,
} from '../validators';

export type ReportSource =
  'MEMBERS' | 'WALLET' | 'REWARDS' | 'CAMPAIGNS' | 'NOTIFICATIONS' | 'AUDIT' | 'USER_ACTIVITY';
export type ReportFormat = 'CSV' | 'XLSX' | 'PDF';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type JobStatusValue = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type WidgetType = 'KPI' | 'CHART' | 'TABLE' | 'SUMMARY' | 'ACTIVITY';

/** A single output cell — reports are plain tabular data. */
export type ReportCell = string | number | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportColumn {
  key: string;
  label: string;
}

/** The result of executing a report generator. */
export interface ReportResult {
  code: string;
  name: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportRow;
  filters: ReportFilterValues;
  rowCount: number;
  generatedAt: Date;
}

/** Raw filter inputs (as validated). */
export type ReportFilterValues = z.infer<typeof reportFiltersSchema>;

/** Normalized filters passed to generators (dates parsed, absent → null). */
export interface NormalizedFilters {
  from: Date | null;
  to: Date | null;
  status: string | null;
  memberId: string | null;
  campaignId: string | null;
  rewardProgramId: string | null;
  walletId: string | null;
  channel: string | null;
}

export interface ReportCategoryData {
  id: string;
  code: string;
  label: string;
  description: string | null;
}

export interface ReportDefinitionData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  source: string;
  categoryCode: string | null;
  categoryLabel: string | null;
  isActive: boolean;
}

export interface SavedReportData {
  id: string;
  name: string;
  definitionId: string;
  definitionCode: string | null;
  ownerId: string;
  filters: ReportFilterValues | null;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExportData {
  id: string;
  reportCode: string;
  format: ReportFormat;
  status: JobStatusValue;
  filters: ReportFilterValues | null;
  rowCount: number;
  contentType: string | null;
  fileName: string | null;
  error: string | null;
  requestedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ReportScheduleData {
  id: string;
  reportCode: string;
  name: string;
  frequency: ScheduleFrequency;
  cron: string | null;
  filters: ReportFilterValues | null;
  format: ReportFormat;
  isActive: boolean;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecutionData {
  id: string;
  reportCode: string;
  trigger: string;
  status: JobStatusValue;
  filters: ReportFilterValues | null;
  rowCount: number;
  durationMs: number;
  error: string | null;
  runBy: string | null;
  createdAt: Date;
}

export interface DashboardWidgetData {
  id: string;
  code: string;
  type: WidgetType;
  title: string;
  description: string | null;
  config: Record<string, unknown> | null;
  isActive: boolean;
}

export interface DashboardLayoutItem {
  widgetCode: string;
  position: number;
  size?: string | undefined;
}

export interface DashboardKpis {
  members: { total: number; active: number };
  walletAvailableMinor: number;
  rewardPoints: number;
  activeCampaigns: number;
  notificationsDelivered: number;
}

export interface RecentActivityItem {
  id: string;
  module: string | null;
  action: string;
  entityType: string;
  userId: string | null;
  createdAt: Date;
}

export interface DashboardData {
  kpis: DashboardKpis;
  widgets: DashboardWidgetData[];
  layout: DashboardLayoutItem[];
  recentActivity: RecentActivityItem[];
}

export interface SavedFilterData {
  id: string;
  userId: string;
  reportCode: string;
  name: string;
  filters: ReportFilterValues | null;
  createdAt: Date;
}

export interface FavoriteReportData {
  id: string;
  definitionId: string;
  definitionCode: string | null;
  createdAt: Date;
}

export interface MemberWalletSummary {
  hasWallet: boolean;
  currencyCode: string | null;
  availableMinor: number;
  heldMinor: number;
  totalMinor: number;
  recentTransactions: Array<{
    reference: string;
    type: string;
    direction: string;
    amountMinor: number;
    description: string | null;
    createdAt: Date;
  }>;
}

export interface MemberRewardSummary {
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  recentTransactions: Array<{
    reference: string;
    type: string;
    direction: string;
    points: number;
    description: string | null;
    createdAt: Date;
  }>;
}

export type PaginatedDefinitions = PaginatedResult<ReportDefinitionData>;
export type PaginatedExports = PaginatedResult<ReportExportData>;
export type PaginatedSchedules = PaginatedResult<ReportScheduleData>;
export type PaginatedExecutions = PaginatedResult<ReportExecutionData>;
export type PaginatedSavedReports = PaginatedResult<SavedReportData>;

export type RunReportInput = z.infer<typeof runReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type CreateExportInput = z.infer<typeof createExportSchema>;
export type ListExportsQuery = z.infer<typeof listExportsQuerySchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;
export type SaveReportInput = z.infer<typeof saveReportSchema>;
export type SavedFilterInput = z.infer<typeof savedFilterSchema>;
export type DashboardLayoutInput = z.infer<typeof dashboardLayoutSchema>;
export type FavoriteInput = z.infer<typeof favoriteSchema>;

/** Actor + request context for auditing and authorship. */
export interface ReportActor {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
}
