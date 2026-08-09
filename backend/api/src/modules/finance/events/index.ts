import type { FinancialRequestType } from '../dto';

/** Finance domain events — in-process, typed, no external messaging. */
export type FinanceEvent =
  | {
      type: 'FinancialRequestSubmitted';
      requestId: string;
      requestType: FinancialRequestType;
      memberId: string;
      amountCents: number;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'DepositApproved';
      requestId: string;
      memberId: string;
      walletId: string;
      trancheId: string;
      transactionId: string;
      amountCents: number;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'WithdrawalApproved';
      requestId: string;
      memberId: string;
      walletId: string;
      transactionId: string;
      amountCents: number;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'FinancialRequestRejected';
      requestId: string;
      requestType: FinancialRequestType;
      memberId: string;
      reason: string;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'FinancialRequestHeld';
      requestId: string;
      requestType: FinancialRequestType;
      memberId: string;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'TrancheMatured';
      trancheId: string;
      memberId: string;
      walletId: string;
      bonusCents: number;
      transactionId: string | null;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'TrancheEarlyUnlocked';
      trancheId: string;
      memberId: string;
      walletId: string;
      feeCents: number;
      bonusForfeitedCents: number;
      transactionId: string | null;
      actorId: string | null;
      at: Date;
    };

export type FinanceEventType = FinanceEvent['type'];

export type FinanceEventHandler = (event: FinanceEvent) => void | Promise<void>;

/** Minimal in-memory event bus for finance events. */
export class FinanceEventBus {
  private readonly handlers = new Set<FinanceEventHandler>();

  public subscribe(handler: FinanceEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: FinanceEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
