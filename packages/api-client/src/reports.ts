import type { AxiosInstance } from 'axios';

/**
 * Reports & Analytics API resource — the single, shared definition of the
 * reporting HTTP contract used by every application (no duplicated API logic).
 * JSON dates are strings over the wire.
 */

export type ReportFormat = 'CSV' | 'XLSX' | 'PDF';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type WidgetType = 'KPI' | 'CHART' | 'TABLE' | 'SUMMARY' | 'ACTIVITY';

export type ReportCell = string | number | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  memberId?: string;
  campaignId?: string;
  rewardProgramId?: string;
  walletId?: string;
  channel?: string;
}

export interface ReportResult {
  code: string;
  name: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  summary: ReportRow;
  filters: ReportFilters;
  rowCount: number;
  generatedAt: string;
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

export interface ReportExportData {
  id: string;
  reportCode: string;
  format: ReportFormat;
  status: JobStatus;
  filters: ReportFilters | null;
  rowCount: number;
  contentType: string | null;
  fileName: string | null;
  error: string | null;
  requestedBy: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ReportScheduleData {
  id: string;
  reportCode: string;
  name: string;
  frequency: ScheduleFrequency;
  cron: string | null;
  filters: ReportFilters | null;
  format: ReportFormat;
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExecutionData {
  id: string;
  reportCode: string;
  trigger: string;
  status: JobStatus;
  filters: ReportFilters | null;
  rowCount: number;
  durationMs: number;
  error: string | null;
  runBy: string | null;
  createdAt: string;
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
  size?: string;
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
  createdAt: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  widgets: DashboardWidgetData[];
  layout: DashboardLayoutItem[];
  recentActivity: RecentActivityItem[];
}

export interface SavedReportData {
  id: string;
  name: string;
  definitionId: string;
  definitionCode: string | null;
  ownerId: string;
  filters: ReportFilters | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedFilterData {
  id: string;
  userId: string;
  reportCode: string;
  name: string;
  filters: ReportFilters | null;
  createdAt: string;
}

export interface FavoriteReportData {
  id: string;
  definitionId: string;
  definitionCode: string | null;
  createdAt: string;
}

export interface ReportTransactionLine {
  reference: string;
  type: string;
  direction: string;
  description: string | null;
  createdAt: string;
}

export interface MemberWalletSummary {
  hasWallet: boolean;
  currencyCode: string | null;
  availableMinor: number;
  heldMinor: number;
  totalMinor: number;
  recentTransactions: Array<ReportTransactionLine & { amountMinor: number }>;
}

export interface MemberRewardSummary {
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  recentTransactions: Array<ReportTransactionLine & { points: number }>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type ReportSortField = 'createdAt' | 'name' | 'code';

export interface ListReportsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  source?: string;
  sortBy?: ReportSortField;
  order?: 'asc' | 'desc';
}

export interface ListExportsParams {
  page?: number;
  pageSize?: number;
  code?: string;
  status?: JobStatus;
  format?: ReportFormat;
}

export interface ListHistoryParams {
  page?: number;
  pageSize?: number;
  code?: string;
  status?: JobStatus;
  trigger?: 'RUN' | 'EXPORT' | 'SCHEDULE';
}

export interface RunReportInput {
  code: string;
  filters?: ReportFilters;
}

export interface CreateExportInput {
  code: string;
  format?: ReportFormat;
  filters?: ReportFilters;
}

export interface CreateScheduleInput {
  code: string;
  name: string;
  frequency?: ScheduleFrequency;
  cron?: string;
  filters?: ReportFilters;
  format?: ReportFormat;
}

export interface UpdateScheduleInput {
  name?: string;
  frequency?: ScheduleFrequency;
  cron?: string | null;
  filters?: ReportFilters;
  format?: ReportFormat;
  isActive?: boolean;
}

export interface SaveReportInput {
  name: string;
  code: string;
  filters?: ReportFilters;
  isShared?: boolean;
}

export interface SaveFilterInput {
  reportCode: string;
  name: string;
  filters: ReportFilters;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface ReportsApi {
  list(params?: ListReportsParams): Promise<Paginated<ReportDefinitionData>>;
  get(id: string): Promise<ReportDefinitionData>;
  categories(): Promise<ReportCategoryData[]>;
  run(input: RunReportInput): Promise<ReportResult>;
  listExports(params?: ListExportsParams): Promise<Paginated<ReportExportData>>;
  getExport(id: string): Promise<ReportExportData>;
  createExport(input: CreateExportInput): Promise<ReportExportData>;
  downloadExport(id: string): Promise<string>;
  listSchedules(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<ReportScheduleData>>;
  createSchedule(input: CreateScheduleInput): Promise<ReportScheduleData>;
  updateSchedule(id: string, input: UpdateScheduleInput): Promise<ReportScheduleData>;
  deleteSchedule(id: string): Promise<void>;
  history(params?: ListHistoryParams): Promise<Paginated<ReportExecutionData>>;
  dashboard(): Promise<DashboardData>;
  updateDashboardLayout(layout: DashboardLayoutItem[]): Promise<DashboardLayoutItem[]>;
  listSaved(params?: { page?: number; pageSize?: number }): Promise<Paginated<SavedReportData>>;
  save(input: SaveReportInput): Promise<SavedReportData>;
  deleteSaved(id: string): Promise<void>;
  listSavedFilters(): Promise<SavedFilterData[]>;
  saveFilter(input: SaveFilterInput): Promise<SavedFilterData>;
  listFavorites(): Promise<FavoriteReportData[]>;
  addFavorite(definitionCode: string): Promise<{ added: boolean }>;
  removeFavorite(definitionCode: string): Promise<{ removed: boolean }>;
  myWalletSummary(): Promise<MemberWalletSummary>;
  myRewardSummary(): Promise<MemberRewardSummary>;
}

/** Binds the reports resource to a configured API client. */
export function createReportsApi(client: AxiosInstance): ReportsApi {
  const base = '/api/v1';
  return {
    async list(params) {
      const response = await client.get<Envelope<Paginated<ReportDefinitionData>>>(
        `${base}/reports`,
        { params },
      );
      return response.data.data;
    },
    async get(id) {
      const response = await client.get<Envelope<ReportDefinitionData>>(`${base}/reports/${id}`);
      return response.data.data;
    },
    async categories() {
      const response = await client.get<ItemsEnvelope<ReportCategoryData>>(
        `${base}/reports/categories`,
      );
      return response.data.data.items;
    },
    async run(input) {
      const response = await client.post<Envelope<ReportResult>>(`${base}/reports/run`, input);
      return response.data.data;
    },
    async listExports(params) {
      const response = await client.get<Envelope<Paginated<ReportExportData>>>(
        `${base}/reports/exports`,
        { params },
      );
      return response.data.data;
    },
    async getExport(id) {
      const response = await client.get<Envelope<ReportExportData>>(
        `${base}/reports/exports/${id}`,
      );
      return response.data.data;
    },
    async createExport(input) {
      const response = await client.post<Envelope<ReportExportData>>(
        `${base}/reports/exports`,
        input,
      );
      return response.data.data;
    },
    async downloadExport(id) {
      const response = await client.get<string>(`${base}/reports/exports/${id}/download`, {
        responseType: 'text',
      });
      return response.data;
    },
    async listSchedules(params) {
      const response = await client.get<Envelope<Paginated<ReportScheduleData>>>(
        `${base}/reports/schedules`,
        { params },
      );
      return response.data.data;
    },
    async createSchedule(input) {
      const response = await client.post<Envelope<ReportScheduleData>>(
        `${base}/reports/schedule`,
        input,
      );
      return response.data.data;
    },
    async updateSchedule(id, input) {
      const response = await client.patch<Envelope<ReportScheduleData>>(
        `${base}/reports/schedules/${id}`,
        input,
      );
      return response.data.data;
    },
    async deleteSchedule(id) {
      await client.delete(`${base}/reports/schedules/${id}`);
    },
    async history(params) {
      const response = await client.get<Envelope<Paginated<ReportExecutionData>>>(
        `${base}/reports/history`,
        { params },
      );
      return response.data.data;
    },
    async dashboard() {
      const response = await client.get<Envelope<DashboardData>>(`${base}/dashboards`);
      return response.data.data;
    },
    async updateDashboardLayout(layout) {
      const response = await client.put<Envelope<{ layout: DashboardLayoutItem[] }>>(
        `${base}/dashboards/layout`,
        { layout },
      );
      return response.data.data.layout;
    },
    async listSaved(params) {
      const response = await client.get<Envelope<Paginated<SavedReportData>>>(
        `${base}/reports/saved`,
        { params },
      );
      return response.data.data;
    },
    async save(input) {
      const response = await client.post<Envelope<SavedReportData>>(`${base}/reports/saved`, input);
      return response.data.data;
    },
    async deleteSaved(id) {
      await client.delete(`${base}/reports/saved/${id}`);
    },
    async listSavedFilters() {
      const response = await client.get<ItemsEnvelope<SavedFilterData>>(
        `${base}/reports/saved-filters`,
      );
      return response.data.data.items;
    },
    async saveFilter(input) {
      const response = await client.post<Envelope<SavedFilterData>>(
        `${base}/reports/saved-filters`,
        input,
      );
      return response.data.data;
    },
    async listFavorites() {
      const response = await client.get<ItemsEnvelope<FavoriteReportData>>(
        `${base}/reports/favorites`,
      );
      return response.data.data.items;
    },
    async addFavorite(definitionCode) {
      const response = await client.post<Envelope<{ added: boolean }>>(
        `${base}/reports/favorites`,
        { definitionCode },
      );
      return response.data.data;
    },
    async removeFavorite(definitionCode) {
      const response = await client.delete<Envelope<{ removed: boolean }>>(
        `${base}/reports/favorites/${definitionCode}`,
      );
      return response.data.data;
    },
    async myWalletSummary() {
      const response = await client.get<Envelope<MemberWalletSummary>>(
        `${base}/reports/me/wallet-summary`,
      );
      return response.data.data;
    },
    async myRewardSummary() {
      const response = await client.get<Envelope<MemberRewardSummary>>(
        `${base}/reports/me/rewards-summary`,
      );
      return response.data.data;
    },
  };
}
