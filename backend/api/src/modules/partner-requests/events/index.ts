/**
 * Partner-request domain events — in-process, typed. The Notifications module can
 * subscribe to surface submission/decision events without a second notification
 * system (reuse). These events are informational only; they never drive role or
 * referral state (those are committed transactionally in the service).
 */
export type PartnerRequestEvent =
  | {
      type: 'PartnerRequestSubmitted';
      requestId: string;
      memberId: string;
      at: Date;
    }
  | {
      type: 'PartnerRequestApproved';
      requestId: string;
      memberId: string;
      approvedByUserId: string;
      at: Date;
    }
  | {
      type: 'PartnerRequestRejected';
      requestId: string;
      memberId: string;
      rejectedByUserId: string;
      at: Date;
    };

export type PartnerRequestEventType = PartnerRequestEvent['type'];

export type PartnerRequestEventHandler = (event: PartnerRequestEvent) => void | Promise<void>;

/** Minimal in-memory event bus for partner-request events. */
export class PartnerRequestEventBus {
  private readonly handlers = new Set<PartnerRequestEventHandler>();

  public subscribe(handler: PartnerRequestEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: PartnerRequestEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
