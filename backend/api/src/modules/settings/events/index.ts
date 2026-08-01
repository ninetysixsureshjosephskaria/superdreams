/** Settings & Administration domain events — in-process, typed, no external messaging. */
export type SettingEvent =
  | { type: 'SettingUpdated'; key: string; categoryCode: string; actorId: string; at: Date }
  | { type: 'BrandingUpdated'; actorId: string; at: Date }
  | { type: 'LocalizationUpdated'; actorId: string; at: Date }
  | { type: 'SecuritySettingChanged'; key: string; actorId: string; at: Date }
  | { type: 'FeatureToggleChanged'; key: string; enabled: boolean; actorId: string; at: Date }
  | { type: 'MaintenanceModeEnabled'; windowId: string; actorId: string; at: Date }
  | { type: 'MaintenanceModeDisabled'; actorId: string; at: Date };

export type SettingEventType = SettingEvent['type'];

export type SettingEventHandler = (event: SettingEvent) => void | Promise<void>;

/** Minimal in-memory event bus for settings events. */
export class SettingEventBus {
  private readonly handlers = new Set<SettingEventHandler>();

  public subscribe(handler: SettingEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public async publish(event: SettingEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
