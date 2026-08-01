import type { MemberStatus } from '../dto';

/** Member domain events — in-process, typed, no external messaging. */
export type MemberEvent =
  | { type: 'MemberCreated'; memberId: string; actorId: string; at: Date }
  | { type: 'MemberUpdated'; memberId: string; actorId: string; at: Date }
  | {
      type: 'MemberSuspended';
      memberId: string;
      actorId: string;
      reason: string | null;
      at: Date;
    }
  | { type: 'MemberReactivated'; memberId: string; actorId: string; at: Date }
  | { type: 'MemberArchived'; memberId: string; actorId: string; at: Date }
  | {
      type: 'MemberStatusChanged';
      memberId: string;
      fromStatus: MemberStatus | null;
      toStatus: MemberStatus;
      actorId: string;
      at: Date;
    }
  | { type: 'MemberNoteAdded'; memberId: string; noteId: string; actorId: string; at: Date }
  | {
      type: 'MemberDocumentAdded';
      memberId: string;
      documentId: string;
      actorId: string;
      at: Date;
    };

export type MemberEventType = MemberEvent['type'];

export type MemberEventHandler = (event: MemberEvent) => void | Promise<void>;

/** Minimal in-memory event bus for member events. */
export class MemberEventBus {
  private readonly handlers = new Set<MemberEventHandler>();

  public subscribe(handler: MemberEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: MemberEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
