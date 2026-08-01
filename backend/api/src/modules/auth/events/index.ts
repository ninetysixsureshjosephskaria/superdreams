/**
 * Authentication domain events — in-process, typed, no external messaging.
 */
export type AuthEvent =
  | { type: 'LoginSucceeded'; userId: string; sessionId: string; at: Date }
  | { type: 'LoginFailed'; email: string; reason: string; at: Date }
  | { type: 'LogoutCompleted'; userId: string; sessionId: string; at: Date }
  | { type: 'TokenRefreshed'; userId: string; sessionId: string; at: Date }
  | { type: 'RefreshTokenReuseDetected'; userId: string; sessionId: string; at: Date }
  | { type: 'SessionRevoked'; userId: string; sessionId: string; at: Date }
  | { type: 'PasswordResetRequested'; userId: string; at: Date }
  | { type: 'PasswordResetCompleted'; userId: string; at: Date }
  | { type: 'PasswordChanged'; userId: string; at: Date };

export type AuthEventType = AuthEvent['type'];

export type AuthEventHandler = (event: AuthEvent) => void | Promise<void>;

/** Minimal in-memory event bus for authentication events. */
export class AuthEventBus {
  private readonly handlers = new Set<AuthEventHandler>();

  public subscribe(handler: AuthEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: AuthEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
