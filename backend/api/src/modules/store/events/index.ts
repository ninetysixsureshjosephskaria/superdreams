/** Dream Store domain events — in-process, typed, no external messaging. */
export type StoreEvent =
  | { type: 'ProductCreated'; productId: string; actorId: string; at: Date }
  | { type: 'ProductUpdated'; productId: string; actorId: string; at: Date }
  | { type: 'ProductArchived'; productId: string; actorId: string; at: Date }
  | { type: 'CategoryCreated'; categoryId: string; actorId: string; at: Date }
  | { type: 'CategoryUpdated'; categoryId: string; actorId: string; at: Date }
  | {
      type: 'StockAdjusted';
      productId: string;
      change: number;
      stockAfter: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'ProductRedeemed';
      orderId: string;
      productId: string;
      memberId: string;
      points: number;
      at: Date;
    }
  | {
      type: 'OrderCancelled';
      orderId: string;
      memberId: string;
      refunded: number;
      actorId: string;
      at: Date;
    };

export type StoreEventType = StoreEvent['type'];

export type StoreEventHandler = (event: StoreEvent) => void | Promise<void>;

/** Minimal in-memory event bus for Dream Store events. */
export class StoreEventBus {
  private readonly handlers = new Set<StoreEventHandler>();

  public subscribe(handler: StoreEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: StoreEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
