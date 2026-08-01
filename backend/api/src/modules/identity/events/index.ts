/**
 * Identity domain events. Prepared as an in-process, typed event structure with
 * **no external messaging** — future modules subscribe or replace the bus.
 */
export type IdentityEvent =
  | { type: 'OrganizationCreated'; organizationId: string; at: Date }
  | { type: 'OrganizationDeactivated'; organizationId: string; at: Date }
  | { type: 'UserCreated'; userId: string; email: string; at: Date }
  | { type: 'UserUpdated'; userId: string; at: Date }
  | { type: 'UserActivated'; userId: string; at: Date }
  | { type: 'UserSuspended'; userId: string; at: Date }
  | { type: 'UserDeactivated'; userId: string; at: Date };

export type IdentityEventType = IdentityEvent['type'];

export type IdentityEventHandler = (event: IdentityEvent) => void | Promise<void>;

/** Minimal in-memory event bus. Publishing awaits each handler in turn. */
export class IdentityEventBus {
  private readonly handlers = new Set<IdentityEventHandler>();

  public subscribe(handler: IdentityEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: IdentityEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
