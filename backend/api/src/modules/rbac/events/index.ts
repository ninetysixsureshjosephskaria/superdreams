/** Authorization mode that produced a denial (for audit hooks). */
export type AuthorizationMode = 'role' | 'permission' | 'anyPermission' | 'allPermissions';

/** RBAC domain events — in-process, typed, no external messaging. */
export type RbacEvent =
  | { type: 'RoleAssigned'; userId: string; roleId: string; actorId: string | null; at: Date }
  | { type: 'RoleRemoved'; userId: string; roleId: string; actorId: string | null; at: Date }
  | {
      type: 'PermissionAssigned';
      roleId: string;
      permissionId: string;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'PermissionRemoved';
      roleId: string;
      permissionId: string;
      actorId: string | null;
      at: Date;
    }
  | {
      type: 'AuthorizationDenied';
      userId: string;
      required: readonly string[];
      mode: AuthorizationMode;
      at: Date;
    };

export type RbacEventType = RbacEvent['type'];

export type RbacEventHandler = (event: RbacEvent) => void | Promise<void>;

/** Minimal in-memory event bus for RBAC events (assignment + audit hooks). */
export class RbacEventBus {
  private readonly handlers = new Set<RbacEventHandler>();

  public subscribe(handler: RbacEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: RbacEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
