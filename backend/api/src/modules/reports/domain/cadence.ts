import type { ScheduleFrequency } from '../dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Computes the next run time for a schedule after `from`.
 *
 * DAILY/WEEKLY/MONTHLY are computed natively. CUSTOM cron expressions are
 * validated on write but not fully evaluated here — advancing them is delegated
 * to the platform scheduler; as a safe in-module default the next run is set one
 * day out so a CUSTOM schedule still progresses rather than stalling. This is a
 * deliberate, documented seam (no cron engine dependency is introduced).
 */
export function nextRunAfter(frequency: ScheduleFrequency, from: Date, _cron: string | null): Date {
  switch (frequency) {
    case 'DAILY':
      return new Date(from.getTime() + DAY_MS);
    case 'WEEKLY':
      return new Date(from.getTime() + 7 * DAY_MS);
    case 'MONTHLY': {
      const next = new Date(from.getTime());
      next.setUTCMonth(next.getUTCMonth() + 1);
      return next;
    }
    case 'CUSTOM':
    default:
      return new Date(from.getTime() + DAY_MS);
  }
}
