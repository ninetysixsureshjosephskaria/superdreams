import type { InviteRoleType } from '../dto';

/**
 * Network domain events — in-process, typed. The Notifications module can
 * subscribe to represent invite/referral lifecycle events without a second
 * notification system (reuse, per rule 6).
 */
export type NetworkEvent =
  | {
      type: 'InviteCreated';
      inviteId: string;
      role: InviteRoleType;
      invitedByUserId: string | null;
      assignedPartnerId: string | null;
      assignedAdminId: string | null;
      at: Date;
    }
  | {
      type: 'InviteRevoked';
      inviteId: string;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'InviteDeleted';
      inviteId: string;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'InviteAccepted';
      inviteId: string;
      role: InviteRoleType;
      acceptedByUserId: string;
      acceptedByMemberId: string;
      invitedByUserId: string | null;
      partnerId: string | null;
      at: Date;
    }
  | {
      type: 'ReferralLinked';
      memberId: string;
      referredBy: string | null;
      partnerId: string | null;
      at: Date;
    };

export type NetworkEventType = NetworkEvent['type'];

export type NetworkEventHandler = (event: NetworkEvent) => void | Promise<void>;

/** Minimal in-memory event bus for network events. */
export class NetworkEventBus {
  private readonly handlers = new Set<NetworkEventHandler>();

  public subscribe(handler: NetworkEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: NetworkEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
