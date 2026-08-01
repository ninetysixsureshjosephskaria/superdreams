/** Reports & Analytics domain events — in-process, typed, no external messaging. */
export type ReportEvent =
  | { type: 'ReportGenerated'; code: string; rowCount: number; actorId: string; at: Date }
  | { type: 'ReportScheduled'; scheduleId: string; code: string; actorId: string; at: Date }
  | { type: 'ReportExported'; exportId: string; code: string; format: string; at: Date }
  | { type: 'DashboardUpdated'; userId: string; at: Date }
  | { type: 'SavedFilterCreated'; savedFilterId: string; userId: string; at: Date };

export type ReportEventType = ReportEvent['type'];

export type ReportEventHandler = (event: ReportEvent) => void | Promise<void>;

/** Minimal in-memory event bus for report events. */
export class ReportEventBus {
  private readonly handlers = new Set<ReportEventHandler>();

  public subscribe(handler: ReportEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: ReportEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
