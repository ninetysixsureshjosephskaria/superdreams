/**
 * Partner-referral domain events — in-process, typed, INFORMATIONAL only. They
 * never drive points/ledger state (that is committed transactionally by the
 * service inside the caller's transaction). Emission, if any, is a post-commit
 * responsibility of the wiring layer; there are no required subscribers.
 */
export type PartnerReferralEvent =
  | {
      type: 'PartnerReferralEarned';
      referralEarningId: string;
      sourceTransactionId: string;
      earnerMemberId: string;
      partnerMemberId: string;
      partnerTransactionId: string;
      rateBps: number;
      partnerPoints: number;
      at: Date;
    }
  | {
      type: 'PartnerReferralReversed';
      referralEarningId: string;
      sourceTransactionId: string;
      partnerMemberId: string;
      reversalTransactionId: string;
      at: Date;
    };

export type PartnerReferralEventType = PartnerReferralEvent['type'];

export type PartnerReferralEventHandler = (event: PartnerReferralEvent) => void | Promise<void>;

/** Minimal in-memory event bus for partner-referral events. */
export class PartnerReferralEventBus {
  private readonly handlers = new Set<PartnerReferralEventHandler>();

  public subscribe(handler: PartnerReferralEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: PartnerReferralEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
