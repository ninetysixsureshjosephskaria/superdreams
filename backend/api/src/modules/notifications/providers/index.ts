import { randomUUID } from 'node:crypto';

import type { NotificationChannel, NotificationDeliveryResult } from '../dto';

/** What a provider is asked to deliver. */
export interface ProviderMessage {
  notificationId: string;
  channel: NotificationChannel;
  recipient: string | null;
  subject: string | null;
  body: string;
}

/** The outcome of a single delivery attempt. */
export interface ProviderResult {
  result: NotificationDeliveryResult;
  providerMessageId: string | null;
  error: string | null;
}

/**
 * A delivery provider. New channels/providers are added by implementing this
 * interface and registering them — no business-logic changes required.
 */
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  readonly name: string;
  send(message: ProviderMessage): Promise<ProviderResult>;
}

/** In-app delivery: the notification row *is* the inbox, so it is delivered immediately. */
export class InAppProvider implements NotificationProvider {
  public readonly channel: NotificationChannel = 'IN_APP';
  public readonly name = 'in-app';

  public send(message: ProviderMessage): Promise<ProviderResult> {
    return Promise.resolve({
      result: 'DELIVERED',
      providerMessageId: message.notificationId,
      error: null,
    });
  }
}

/**
 * Mock external provider. No real integration is performed (external providers
 * are out of scope this phase): it accepts the message and returns SENT with a
 * synthetic id. Swap for a real provider without touching the queue/service.
 */
export class MockProvider implements NotificationProvider {
  public constructor(
    public readonly channel: NotificationChannel,
    public readonly name: string,
  ) {}

  public send(message: ProviderMessage): Promise<ProviderResult> {
    if (!message.recipient) {
      return Promise.resolve({
        result: 'FAILED',
        providerMessageId: null,
        error: 'No recipient address on file.',
      });
    }
    return Promise.resolve({
      result: 'SENT',
      providerMessageId: `${this.name}-${randomUUID()}`,
      error: null,
    });
  }
}

/** Resolves a provider for a channel. Missing channels are a configuration error. */
export class ProviderRegistry {
  private readonly providers = new Map<NotificationChannel, NotificationProvider>();

  public register(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  public get(channel: NotificationChannel): NotificationProvider | undefined {
    return this.providers.get(channel);
  }
}

/** Builds the default registry: in-app real + email/sms/push mocks. */
export function createDefaultProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new InAppProvider());
  registry.register(new MockProvider('EMAIL', 'mock-email'));
  registry.register(new MockProvider('SMS', 'mock-sms'));
  registry.register(new MockProvider('PUSH', 'mock-push'));
  return registry;
}
