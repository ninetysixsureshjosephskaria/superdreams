import type { CampaignStatus } from '../dto';

/** Campaign domain events — in-process, typed, no external messaging. */
export type CampaignEvent =
  | { type: 'CampaignCreated'; campaignId: string; actorId: string; at: Date }
  | { type: 'CampaignUpdated'; campaignId: string; actorId: string; at: Date }
  | {
      type: 'CampaignStatusChanged';
      campaignId: string;
      fromStatus: CampaignStatus;
      toStatus: CampaignStatus;
      actorId: string;
      at: Date;
    }
  | { type: 'CampaignActivated'; campaignId: string; actorId: string; at: Date }
  | { type: 'CampaignPaused'; campaignId: string; actorId: string; at: Date }
  | { type: 'CampaignCompleted'; campaignId: string; actorId: string; at: Date }
  | { type: 'CampaignScheduled'; campaignId: string; actorId: string; at: Date }
  | {
      type: 'CampaignExecuted';
      campaignId: string;
      executionId: string;
      rewardsIssued: number;
      pointsIssued: number;
      actorId: string;
      at: Date;
    }
  | {
      type: 'CampaignRewardIssued';
      campaignId: string;
      memberId: string;
      points: number;
      rewardTransactionId: string;
      actorId: string;
      at: Date;
    }
  | {
      type: 'CampaignEnrolled';
      campaignId: string;
      memberId: string;
      actorId: string;
      at: Date;
    };

export type CampaignEventType = CampaignEvent['type'];

export type CampaignEventHandler = (event: CampaignEvent) => void | Promise<void>;

/** Minimal in-memory event bus for campaign events. */
export class CampaignEventBus {
  private readonly handlers = new Set<CampaignEventHandler>();

  public subscribe(handler: CampaignEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: CampaignEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
