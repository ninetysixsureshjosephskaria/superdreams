import { auditLogs } from '@/database/schema';
import type { Executor } from '@/database/types';

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: AuditActionType;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

/** Writes redemption-request changes to the shared append-only `audit_logs` table. */
export class RedemptionRequestAuditRepository {
  public async write(entry: AuditEntry, executor: Executor): Promise<void> {
    await executor.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      userId: entry.userId,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      module: 'redemption-requests',
      correlationId: entry.correlationId ?? null,
    });
  }
}
