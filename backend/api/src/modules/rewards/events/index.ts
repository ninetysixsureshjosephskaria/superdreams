import type { RewardDirection, RewardProgramStatus } from '../dto';

/** Reward domain events — in-process, typed, no external messaging. */
export type RewardEvent =
  | { type: 'RewardProgramCreated'; programId: string; actorId: string; at: Date }
  | {
      type: 'RewardProgramStatusChanged';
      programId: string;
      fromStatus: RewardProgramStatus;
      toStatus: RewardProgramStatus;
      actorId: string;
      at: Date;
    }
  | { type: 'RewardProgramActivated'; programId: string; actorId: string; at: Date }
  | { type: 'RewardProgramDeactivated'; programId: string; actorId: string; at: Date }
  | {
      type: 'RewardAllocated';
      memberId: string;
      transactionId: string;
      points: number;
      programId: string | null;
      actorId: string;
      at: Date;
    }
  | {
      type: 'RewardAdjusted';
      memberId: string;
      transactionId: string;
      direction: RewardDirection;
      points: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'RewardRedeemed';
      memberId: string;
      transactionId: string;
      redemptionId: string;
      points: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'RewardExpired';
      memberId: string;
      transactionId: string;
      points: number;
      at: Date;
    }
  | {
      type: 'RewardReversed';
      memberId: string;
      transactionId: string;
      reversalId: string;
      actorId: string;
      at: Date;
    };

export type RewardEventType = RewardEvent['type'];

export type RewardEventHandler = (event: RewardEvent) => void | Promise<void>;

/** Minimal in-memory event bus for reward events. */
export class RewardEventBus {
  private readonly handlers = new Set<RewardEventHandler>();

  public subscribe(handler: RewardEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: RewardEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
