/**
 * Redemption-request domain events — in-process, typed. Informational only; they
 * never drive points/ledger state (that is committed transactionally in the
 * service). P2 intentionally publishes ONLY these events — it does NOT emit the
 * rewards module's `RewardRedeemed` (which has no production subscriber and is
 * `redeem()`'s own post-commit contract).
 */
export type RedemptionRequestEvent =
  | {
      type: 'RedemptionRequestSubmitted';
      requestId: string;
      memberId: string;
      pointsRequested: number;
      at: Date;
    }
  | {
      type: 'RedemptionRequestApproved';
      requestId: string;
      memberId: string;
      pointsRequested: number;
      transactionId: string;
      redemptionId: string;
      approvedByUserId: string;
      at: Date;
    }
  | {
      type: 'RedemptionRequestRejected';
      requestId: string;
      memberId: string;
      rejectedByUserId: string;
      at: Date;
    };

export type RedemptionRequestEventType = RedemptionRequestEvent['type'];

export type RedemptionRequestEventHandler = (event: RedemptionRequestEvent) => void | Promise<void>;

/** Minimal in-memory event bus for redemption-request events. */
export class RedemptionRequestEventBus {
  private readonly handlers = new Set<RedemptionRequestEventHandler>();

  public subscribe(handler: RedemptionRequestEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: RedemptionRequestEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
