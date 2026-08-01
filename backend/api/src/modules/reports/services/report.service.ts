import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { BusinessRuleError, NotFoundError } from '@/errors';

import { nextRunAfter } from '../domain/cadence';
import type {
  DashboardData,
  DashboardLayoutItem,
  MemberRewardSummary,
  MemberWalletSummary,
  NormalizedFilters,
  PaginatedDefinitions,
  PaginatedExecutions,
  PaginatedExports,
  PaginatedSavedReports,
  PaginatedSchedules,
  ReportActor,
  ReportCategoryData,
  ReportDefinitionData,
  ReportExportData,
  ReportFilterValues,
  ReportResult,
  ReportScheduleData,
  SavedFilterData,
  SavedReportData,
  FavoriteReportData,
} from '../dto';
import type { ReportEventBus } from '../events';
import { createDefaultExporterRegistry, type ExporterRegistry } from '../exporters';
import { getGenerator } from '../generators';
import {
  toDefinition,
  toExecution,
  toExport,
  toSavedFilter,
  toSavedReport,
  toSchedule,
  toWidget,
} from '../mappers';
import type {
  DashboardRepository,
  DefinitionRow,
  ReportAuditRepository,
  ReportCatalogRepository,
  ReportExportRepository,
  ReportHistoryRepository,
  ReportScheduleRepository,
  ReportSourceRepository,
  SavedReportRepository,
} from '../repositories';
import type { AuditActionType } from '../repositories/audit.repository';
import type { ExportRow } from '../repositories/export.repository';
import {
  createExportSchema,
  createScheduleSchema,
  dashboardLayoutSchema,
  favoriteSchema,
  listExportsQuerySchema,
  listHistoryQuerySchema,
  listReportsQuerySchema,
  runReportSchema,
  saveReportSchema,
  savedFilterSchema,
  updateScheduleSchema,
} from '../validators';

const MODULE = 'reports';
const RECENT_ACTIVITY_LIMIT = 10;

/**
 * Reports & Analytics business logic. Read-only over the business modules: it
 * runs report generators (which read source projections), manages report
 * metadata (saved reports, exports, schedules, history, dashboards, filters,
 * favorites), and never writes to any business table.
 */
export class ReportService {
  private readonly exporters: ExporterRegistry;

  public constructor(
    private readonly db: Database,
    private readonly source: ReportSourceRepository,
    private readonly catalog: ReportCatalogRepository,
    private readonly exportsRepo: ReportExportRepository,
    private readonly schedules: ReportScheduleRepository,
    private readonly history: ReportHistoryRepository,
    private readonly dashboards: DashboardRepository,
    private readonly saved: SavedReportRepository,
    private readonly audit: ReportAuditRepository,
    private readonly events: ReportEventBus,
    exporters?: ExporterRegistry,
  ) {
    this.exporters = exporters ?? createDefaultExporterRegistry();
  }

  // --- Catalog ---------------------------------------------------------------

  public async listReports(query: unknown): Promise<PaginatedDefinitions> {
    const parsed = listReportsQuerySchema.parse(query);
    const { rows, total } = await this.catalog.search(parsed);
    return buildPaginatedResult(rows.map(toDefinition), total, parsed.page, parsed.pageSize);
  }

  public async getReport(id: string): Promise<ReportDefinitionData> {
    const definition = await this.catalog.findById(id);
    if (!definition) {
      throw new NotFoundError('Report not found.');
    }
    return toDefinition(definition);
  }

  public async listCategories(): Promise<ReportCategoryData[]> {
    return this.catalog.listCategories();
  }

  // --- Run -------------------------------------------------------------------

  public async runReport(input: unknown, actor: ReportActor): Promise<ReportResult> {
    const data = runReportSchema.parse(input);
    const definition = await this.requireDefinition(data.code);
    const start = Date.now();
    try {
      const result = await this.generate(definition, data.filters);
      await this.history.record({
        reportCode: definition.code,
        trigger: 'RUN',
        status: 'COMPLETED',
        filters: data.filters ?? null,
        rowCount: result.rowCount,
        durationMs: Date.now() - start,
        error: null,
        runBy: actor.userId,
      });
      await this.writeAudit(
        definition.id,
        'CREATE',
        { trigger: 'RUN', code: definition.code },
        actor,
      );
      await this.events.publish({
        type: 'ReportGenerated',
        code: definition.code,
        rowCount: result.rowCount,
        actorId: actor.userId,
        at: new Date(),
      });
      return result;
    } catch (error) {
      await this.history.record({
        reportCode: definition.code,
        trigger: 'RUN',
        status: 'FAILED',
        filters: data.filters ?? null,
        rowCount: 0,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error.',
        runBy: actor.userId,
      });
      throw error;
    }
  }

  // --- Exports ---------------------------------------------------------------

  public async listExports(query: unknown): Promise<PaginatedExports> {
    const parsed = listExportsQuerySchema.parse(query);
    const page = await this.exportsRepo.search(parsed);
    return { ...page, items: page.items.map(toExport) };
  }

  public async getExport(id: string): Promise<ReportExportData> {
    return toExport(await this.requireExport(id));
  }

  public async createExport(input: unknown, actor: ReportActor): Promise<ReportExportData> {
    const data = createExportSchema.parse(input);
    const definition = await this.requireDefinition(data.code);

    const created = await this.exportsRepo.create({
      reportCode: definition.code,
      format: data.format,
      status: 'PENDING',
      filters: data.filters ?? null,
      rowCount: 0,
      requestedBy: actor.userId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    const processed = await this.processExportRow(created, definition, actor);
    return toExport(processed);
  }

  public async downloadExport(
    id: string,
  ): Promise<{ content: string; contentType: string; fileName: string }> {
    const row = await this.requireExport(id);
    if (row.status !== 'COMPLETED') {
      throw new BusinessRuleError('Export is not ready for download.');
    }
    return {
      content: row.content ?? '',
      contentType: row.contentType ?? 'text/plain; charset=utf-8',
      fileName: row.fileName ?? `${row.reportCode.toLowerCase()}.txt`,
    };
  }

  /** Processes pending export jobs (used by the scheduler for large/queued runs). */
  public async processExports(
    actor: ReportActor,
    asOf: Date = new Date(),
    limit = 50,
  ): Promise<number> {
    const pending = await this.exportsRepo.listPending(asOf, limit);
    let processed = 0;
    for (const row of pending) {
      const definition = await this.catalog.findByCode(row.reportCode);
      if (!definition) {
        await this.exportsRepo.markCompleted(row.id, {
          status: 'FAILED',
          rowCount: 0,
          content: null,
          contentType: null,
          fileName: null,
          error: 'Unknown report code.',
          format: row.format,
        });
        continue;
      }
      await this.processExportRow(row, definition, actor);
      processed += 1;
    }
    return processed;
  }

  private async processExportRow(
    row: ExportRow,
    definition: DefinitionRow,
    actor: ReportActor,
  ): Promise<ExportRow> {
    const start = Date.now();
    try {
      const result = await this.generate(
        definition,
        (row.filters as ReportFilterValues | null) ?? undefined,
      );
      const payload = this.exporters.get(row.format).export(result);
      const fileName = `${definition.code.toLowerCase()}.${payload.extension}`;
      const updated = await this.exportsRepo.markCompleted(row.id, {
        status: 'COMPLETED',
        rowCount: result.rowCount,
        content: payload.content,
        contentType: payload.contentType,
        fileName,
        error: null,
        format: row.format,
      });
      await this.history.record({
        reportCode: definition.code,
        trigger: 'EXPORT',
        status: 'COMPLETED',
        filters: (row.filters as ReportFilterValues | null) ?? null,
        rowCount: result.rowCount,
        durationMs: Date.now() - start,
        error: null,
        runBy: actor.userId,
      });
      await this.writeAudit(row.id, 'CREATE', { trigger: 'EXPORT', format: row.format }, actor);
      await this.events.publish({
        type: 'ReportExported',
        exportId: row.id,
        code: definition.code,
        format: row.format,
        at: new Date(),
      });
      return updated ?? row;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error.';
      const failed = await this.exportsRepo.markCompleted(row.id, {
        status: 'FAILED',
        rowCount: 0,
        content: null,
        contentType: null,
        fileName: null,
        error: message,
        format: row.format,
      });
      await this.history.record({
        reportCode: definition.code,
        trigger: 'EXPORT',
        status: 'FAILED',
        filters: (row.filters as ReportFilterValues | null) ?? null,
        rowCount: 0,
        durationMs: Date.now() - start,
        error: message,
        runBy: actor.userId,
      });
      return failed ?? row;
    }
  }

  // --- Schedules -------------------------------------------------------------

  public async listSchedules(query: unknown): Promise<PaginatedSchedules> {
    const parsed = listReportsQuerySchema.pick({ page: true, pageSize: true }).parse(query);
    const page = await this.schedules.search(parsed);
    return { ...page, items: page.items.map(toSchedule) };
  }

  public async createSchedule(input: unknown, actor: ReportActor): Promise<ReportScheduleData> {
    const data = createScheduleSchema.parse(input);
    await this.requireDefinition(data.code);
    const nextRunAt = nextRunAfter(data.frequency, new Date(), data.cron ?? null);
    const created = await this.schedules.create({
      reportCode: data.code,
      name: data.name,
      frequency: data.frequency,
      cron: data.cron ?? null,
      filters: data.filters ?? null,
      format: data.format,
      isActive: true,
      nextRunAt,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.writeAudit(
      created.id,
      'CREATE',
      { code: data.code, frequency: data.frequency },
      actor,
    );
    await this.events.publish({
      type: 'ReportScheduled',
      scheduleId: created.id,
      code: data.code,
      actorId: actor.userId,
      at: new Date(),
    });
    return toSchedule(created);
  }

  public async updateSchedule(
    id: string,
    input: unknown,
    actor: ReportActor,
  ): Promise<ReportScheduleData> {
    const data = updateScheduleSchema.parse(input);
    const existing = await this.schedules.findById(id);
    if (!existing) {
      throw new NotFoundError('Schedule not found.');
    }
    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.filters !== undefined) values.filters = data.filters;
    if (data.format !== undefined) values.format = data.format;
    if (data.isActive !== undefined) values.isActive = data.isActive;
    if (data.cron !== undefined) values.cron = data.cron;
    if (data.frequency !== undefined) {
      values.frequency = data.frequency;
      values.nextRunAt = nextRunAfter(
        data.frequency,
        new Date(),
        data.cron ?? existing.cron ?? null,
      );
    }
    const updated = (await this.schedules.update(id, values)) ?? existing;
    await this.writeAudit(id, 'UPDATE', { fields: Object.keys(values) }, actor);
    return toSchedule(updated);
  }

  public async deleteSchedule(id: string, actor: ReportActor): Promise<void> {
    const existing = await this.schedules.findById(id);
    if (!existing) {
      throw new NotFoundError('Schedule not found.');
    }
    await this.schedules.softDelete(id, actor.userId);
    await this.writeAudit(id, 'DELETE', { code: existing.reportCode }, actor);
  }

  /** Runs all due schedules, producing an export per schedule. Idempotent per run window. */
  public async runDueSchedules(
    actor: ReportActor,
    asOf: Date = new Date(),
    limit = 50,
  ): Promise<number> {
    const due = await this.schedules.listDue(asOf, limit);
    let count = 0;
    for (const schedule of due) {
      const definition = await this.catalog.findByCode(schedule.reportCode);
      if (!definition) {
        continue;
      }
      const filters = (schedule.filters as ReportFilterValues | null) ?? undefined;
      const exportRow = await this.exportsRepo.create({
        reportCode: schedule.reportCode,
        format: schedule.format,
        status: 'PENDING',
        filters: filters ?? null,
        rowCount: 0,
        requestedBy: actor.userId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });
      await this.processExportRow(exportRow, definition, actor);
      await this.schedules.update(schedule.id, {
        lastRunAt: asOf,
        nextRunAt: nextRunAfter(schedule.frequency, asOf, schedule.cron),
      });
      await this.history.record({
        reportCode: schedule.reportCode,
        trigger: 'SCHEDULE',
        status: 'COMPLETED',
        filters: filters ?? null,
        rowCount: exportRow.rowCount,
        durationMs: 0,
        error: null,
        runBy: actor.userId,
      });
      count += 1;
    }
    return count;
  }

  // --- History ---------------------------------------------------------------

  public async listHistory(query: unknown): Promise<PaginatedExecutions> {
    const parsed = listHistoryQuerySchema.parse(query);
    const page = await this.history.search(parsed);
    return { ...page, items: page.items.map(toExecution) };
  }

  // --- Dashboards ------------------------------------------------------------

  public async getDashboard(userId: string): Promise<DashboardData> {
    const [kpis, widgetRows, layoutRow, recentActivity] = await Promise.all([
      this.source.dashboardKpis(),
      this.dashboards.listWidgets(),
      this.dashboards.getLayout(userId),
      this.source.recentActivity(RECENT_ACTIVITY_LIMIT),
    ]);
    const widgets = widgetRows.map(toWidget);
    const layout: DashboardLayoutItem[] =
      layoutRow && Array.isArray(layoutRow.layout)
        ? (layoutRow.layout as DashboardLayoutItem[])
        : widgets.map((widget, index) => ({ widgetCode: widget.code, position: index }));
    return {
      kpis: {
        members: { total: kpis.membersTotal, active: kpis.membersActive },
        walletAvailableMinor: kpis.walletAvailableMinor,
        rewardPoints: kpis.rewardPoints,
        activeCampaigns: kpis.activeCampaigns,
        notificationsDelivered: kpis.notificationsDelivered,
      },
      widgets,
      layout,
      recentActivity,
    };
  }

  public async updateDashboardLayout(
    userId: string,
    input: unknown,
    actor: ReportActor,
  ): Promise<DashboardLayoutItem[]> {
    const data = dashboardLayoutSchema.parse(input);
    await this.dashboards.upsertLayout(userId, data.layout, actor.userId);
    await this.writeAudit(userId, 'UPDATE', { widgets: data.layout.length }, actor);
    await this.events.publish({ type: 'DashboardUpdated', userId, at: new Date() });
    return data.layout;
  }

  // --- Saved reports ---------------------------------------------------------

  public async listSavedReports(userId: string, query: unknown): Promise<PaginatedSavedReports> {
    const parsed = listReportsQuerySchema.pick({ page: true, pageSize: true }).parse(query);
    const page = await this.saved.listSavedReports(userId, parsed);
    return { ...page, items: page.items.map(toSavedReport) };
  }

  public async saveReport(
    userId: string,
    input: unknown,
    actor: ReportActor,
  ): Promise<SavedReportData> {
    const data = saveReportSchema.parse(input);
    const definition = await this.requireDefinition(data.code);
    const created = await this.saved.createSavedReport({
      name: data.name,
      definitionId: definition.id,
      ownerId: userId,
      filters: data.filters ?? null,
      isShared: data.isShared ?? false,
    });
    await this.writeAudit(created.id, 'CREATE', { code: definition.code }, actor);
    return toSavedReport({
      id: created.id,
      name: created.name,
      definitionId: created.definitionId,
      definitionCode: definition.code,
      ownerId: created.ownerId,
      filters: (created.filters as ReportFilterValues | null) ?? null,
      isShared: created.isShared,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  public async deleteSavedReport(id: string, userId: string): Promise<void> {
    const deleted = await this.saved.deleteSavedReport(id, userId);
    if (!deleted) {
      throw new NotFoundError('Saved report not found.');
    }
  }

  // --- Saved filters ---------------------------------------------------------

  public async listSavedFilters(userId: string): Promise<SavedFilterData[]> {
    return (await this.saved.listSavedFilters(userId)).map(toSavedFilter);
  }

  public async createSavedFilter(
    userId: string,
    input: unknown,
    actor: ReportActor,
  ): Promise<SavedFilterData> {
    const data = savedFilterSchema.parse(input);
    const created = await this.saved.createSavedFilter({
      userId,
      reportCode: data.reportCode,
      name: data.name,
      filters: data.filters,
    });
    await this.writeAudit(created.id, 'CREATE', { reportCode: data.reportCode }, actor);
    await this.events.publish({
      type: 'SavedFilterCreated',
      savedFilterId: created.id,
      userId,
      at: new Date(),
    });
    return toSavedFilter(created);
  }

  // --- Favorites -------------------------------------------------------------

  public async listFavorites(userId: string): Promise<FavoriteReportData[]> {
    return (await this.saved.listFavorites(userId)).map((row) => ({
      id: row.id,
      definitionId: row.definitionId,
      definitionCode: row.definitionCode,
      createdAt: row.createdAt,
    }));
  }

  public async addFavorite(userId: string, input: unknown): Promise<{ added: boolean }> {
    const data = favoriteSchema.parse(input);
    const definition = await this.requireDefinition(data.definitionCode);
    const created = await this.saved.addFavorite(userId, definition.id);
    return { added: created != null };
  }

  public async removeFavorite(
    userId: string,
    definitionCode: string,
  ): Promise<{ removed: boolean }> {
    const definition = await this.requireDefinition(definitionCode.toUpperCase());
    const removed = await this.saved.removeFavorite(userId, definition.id);
    return { removed };
  }

  // --- Member portal (own data) ----------------------------------------------

  public async memberWalletSummary(userId: string): Promise<MemberWalletSummary> {
    const memberId = await this.source.memberIdByUserId(userId);
    if (!memberId) {
      throw new NotFoundError('No member profile is linked to this account.');
    }
    return this.source.walletSummaryForMember(memberId);
  }

  public async memberRewardSummary(userId: string): Promise<MemberRewardSummary> {
    const memberId = await this.source.memberIdByUserId(userId);
    if (!memberId) {
      throw new NotFoundError('No member profile is linked to this account.');
    }
    return this.source.rewardSummaryForMember(memberId);
  }

  // --- Internals -------------------------------------------------------------

  private async generate(
    definition: DefinitionRow,
    filters?: ReportFilterValues,
  ): Promise<ReportResult> {
    if (!definition.isActive) {
      throw new BusinessRuleError('Report is not active.');
    }
    const generator = getGenerator(definition.code);
    if (!generator) {
      throw new NotFoundError('No generator is registered for this report.');
    }
    const normalized: NormalizedFilters = this.normalizeFilters(filters);
    const output = await generator({ source: this.source }, normalized);
    return {
      code: definition.code,
      name: definition.name,
      columns: output.columns,
      rows: output.rows,
      summary: output.summary,
      filters: filters ?? {},
      rowCount: output.rows.length,
      generatedAt: new Date(),
    };
  }

  private normalizeFilters(filters?: ReportFilterValues): NormalizedFilters {
    return {
      from: filters?.dateFrom ? new Date(filters.dateFrom) : null,
      to: filters?.dateTo ? new Date(filters.dateTo) : null,
      status: filters?.status ?? null,
      memberId: filters?.memberId ?? null,
      campaignId: filters?.campaignId ?? null,
      rewardProgramId: filters?.rewardProgramId ?? null,
      walletId: filters?.walletId ?? null,
      channel: filters?.channel ?? null,
    };
  }

  private async requireDefinition(code: string): Promise<DefinitionRow> {
    const definition = await this.catalog.findByCode(code);
    if (!definition) {
      throw new NotFoundError('Report not found.');
    }
    return definition;
  }

  private async requireExport(id: string): Promise<ExportRow> {
    const row = await this.exportsRepo.findById(id);
    if (!row) {
      throw new NotFoundError('Export not found.');
    }
    return row;
  }

  private async writeAudit(
    entityId: string,
    action: AuditActionType,
    newValue: Record<string, unknown>,
    actor: ReportActor,
  ): Promise<void> {
    await this.audit.write(
      {
        entityType: 'report',
        entityId,
        action,
        newValue,
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
  }
}
