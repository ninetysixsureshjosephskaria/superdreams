import type { TransactionDirection, WalletStatus } from '../dto';

/** Wallet domain events — in-process, typed, no external messaging. */
export type WalletEvent =
  | { type: 'WalletCreated'; walletId: string; memberId: string; actorId: string; at: Date }
  | { type: 'WalletActivated'; walletId: string; actorId: string; at: Date }
  | { type: 'WalletSuspended'; walletId: string; actorId: string; reason: string | null; at: Date }
  | { type: 'WalletClosed'; walletId: string; actorId: string; reason: string | null; at: Date }
  | {
      type: 'WalletStatusChanged';
      walletId: string;
      fromStatus: WalletStatus;
      toStatus: WalletStatus;
      actorId: string;
      at: Date;
    }
  | {
      type: 'WalletCredited';
      walletId: string;
      transactionId: string;
      amountMinor: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'WalletDebited';
      walletId: string;
      transactionId: string;
      amountMinor: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'WalletAdjusted';
      walletId: string;
      transactionId: string;
      direction: TransactionDirection;
      amountMinor: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'WalletHoldPlaced';
      walletId: string;
      holdId: string;
      amountMinor: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'WalletHoldReleased';
      walletId: string;
      holdId: string;
      amountMinor: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'WalletTransactionReversed';
      walletId: string;
      transactionId: string;
      reversalId: string;
      actorId: string;
      at: Date;
    }
  | {
      type: 'StatementGenerated';
      walletId: string;
      statementId: string;
      actorId: string;
      at: Date;
    };

export type WalletEventType = WalletEvent['type'];

export type WalletEventHandler = (event: WalletEvent) => void | Promise<void>;

/** Minimal in-memory event bus for wallet events. */
export class WalletEventBus {
  private readonly handlers = new Set<WalletEventHandler>();

  public subscribe(handler: WalletEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: WalletEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
