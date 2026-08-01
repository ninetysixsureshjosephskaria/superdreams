/** Games domain events — in-process, typed, no external messaging. */
export type GameEvent =
  | { type: 'GameStarted'; sessionId: string; gameId: string; memberId: string; at: Date }
  | {
      type: 'GameCompleted';
      sessionId: string;
      gameId: string;
      memberId: string;
      score: number;
      pointsAwarded: number;
      at: Date;
    };

export type GameEventType = GameEvent['type'];

export type GameEventHandler = (event: GameEvent) => void | Promise<void>;

/** Minimal in-memory event bus for games events. */
export class GameEventBus {
  private readonly handlers = new Set<GameEventHandler>();

  public subscribe(handler: GameEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: GameEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
