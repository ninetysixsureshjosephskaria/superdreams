import { auditLogs } from '@/database/schema';
import type { Executor } from '@/database/types';

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditActionType;
  newValue?: unknown;
  userId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  module: string;
  correlationId?: string | null;
}

/** Writes to the shared append-only `audit_logs` table (optionally in a tx). */
export class GameAuditRepository {
  public async write(entry: AuditEntry, executor: Executor): Promise<void> {
    await executor.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      newValue: entry.newValue ?? null,
      userId: entry.userId,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      module: entry.module,
      correlationId: entry.correlationId ?? null,
    });
  }
}
