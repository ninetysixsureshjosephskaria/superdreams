import type { Database } from '@/database/client';
import { auditLogs } from '@/database/schema';

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
  module: string;
  correlationId?: string | null;
}

/** Writes to the shared append-only `audit_logs` table. */
export class AuditRepository {
  public constructor(private readonly db: Database) {}

  public async write(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      userId: entry.userId,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      module: entry.module,
      correlationId: entry.correlationId ?? null,
    });
  }
}
