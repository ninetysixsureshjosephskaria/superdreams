import type { ReportActor } from '../dto';
import type { ReportService } from '../services';

/** System actor used by scheduled (non-interactive) report runs. */
const SYSTEM_ACTOR: ReportActor = {
  userId: '00000000-0000-0000-0000-000000000000',
  ipAddress: null,
  userAgent: 'report-scheduler',
  correlationId: null,
};

export interface ReportScheduler {
  /** Runs all due schedules and processes any pending export jobs. Idempotent. */
  run(asOf?: Date, limit?: number): Promise<{ schedulesRun: number; exportsProcessed: number }>;
}

/**
 * Scheduled processing hook for reports. Designed to be invoked by the platform
 * job/scheduler infrastructure; the same logic backs on-demand export creation.
 */
export function createReportScheduler(service: ReportService): ReportScheduler {
  return {
    async run(
      asOf: Date = new Date(),
      limit = 50,
    ): Promise<{ schedulesRun: number; exportsProcessed: number }> {
      const schedulesRun = await service.runDueSchedules(SYSTEM_ACTOR, asOf, limit);
      const exportsProcessed = await service.processExports(SYSTEM_ACTOR, asOf, limit);
      return { schedulesRun, exportsProcessed };
    },
  };
}
