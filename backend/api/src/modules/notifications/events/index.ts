import type { NotificationChannel } from '../dto';

/** Notification domain events — in-process, typed, no external messaging. */
export type NotificationEvent =
  | { type: 'NotificationCreated'; notificationId: string; actorId: string; at: Date }
  | { type: 'NotificationQueued'; notificationId: string; actorId: string; at: Date }
  | {
      type: 'NotificationSent';
      notificationId: string;
      channel: NotificationChannel;
      at: Date;
    }
  | {
      type: 'NotificationDelivered';
      notificationId: string;
      channel: NotificationChannel;
      at: Date;
    }
  | {
      type: 'NotificationFailed';
      notificationId: string;
      channel: NotificationChannel;
      error: string;
      at: Date;
    }
  | { type: 'NotificationRead'; notificationId: string; userId: string; at: Date }
  | { type: 'NotificationArchived'; notificationId: string; userId: string; at: Date }
  | { type: 'PreferenceUpdated'; userId: string; at: Date };

export type NotificationEventType = NotificationEvent['type'];

export type NotificationEventHandler = (event: NotificationEvent) => void | Promise<void>;

/** Minimal in-memory event bus for notification events. */
export class NotificationEventBus {
  private readonly handlers = new Set<NotificationEventHandler>();

  public subscribe(handler: NotificationEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: NotificationEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
