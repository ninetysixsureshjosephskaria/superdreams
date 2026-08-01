import type { InferInsertModel } from 'drizzle-orm';

import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import type { notifications } from '@/database/schema';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@/errors';

import { canTransition } from '../domain/state-machine';
import type {
  DeliveryData,
  NotificationActor,
  NotificationChannel,
  NotificationData,
  NotificationLogData,
  NotificationStatus,
  PaginatedNotifications,
  PaginatedTemplates,
  PreferenceData,
  QueueItemData,
  QueueRunResult,
  TemplateData,
  TemplatePreview,
} from '../dto';
import type { NotificationEventBus } from '../events';
import {
  toDelivery,
  toNotification,
  toNotificationLog,
  toQueueItem,
  toTemplate,
  type NotificationRow,
  type TemplateRow,
} from '../mappers';
import type { ProviderRegistry } from '../providers';
import type {
  NotificationAuditRepository,
  NotificationDeliveryRepository,
  NotificationEventMappingRepository,
  NotificationGroupRepository,
  NotificationLogRepository,
  NotificationPreferenceRepository,
  NotificationQueueRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  RecipientLookupRepository,
} from '../repositories';
import {
  extractVariables,
  missingVariables,
  renderTemplate,
  type TemplateVariables,
} from '../templates/render';
import {
  createNotificationSchema,
  createTemplateSchema,
  inboxQuerySchema,
  listNotificationsQuerySchema,
  listTemplatesQuerySchema,
  previewTemplateSchema,
  processQueueSchema,
  updatePreferencesSchema,
  updateTemplateSchema,
} from '../validators';

const MODULE = 'notifications';
const RETRY_BACKOFF_MS = 60_000;

type NotificationInsert = InferInsertModel<typeof notifications>;

/** How a created notification enters the pipeline. */
type CreateMode = 'DRAFT' | 'SEND' | 'SCHEDULE';

/**
 * Notification Center business logic: template CRUD + rendering, notification
 * creation/send/schedule, an idempotent delivery queue with retry + dead-letter,
 * a delivery state machine, an immutable lifecycle log, member inbox, and
 * per-user preferences. Providers are pluggable; notifications are event
 * consumers of the other modules (via `handleEvent`).
 */
export class NotificationService {
  public constructor(
    private readonly db: Database,
    private readonly templates: NotificationTemplateRepository,
    private readonly notifications: NotificationRepository,
    private readonly queue: NotificationQueueRepository,
    private readonly deliveries: NotificationDeliveryRepository,
    private readonly logs: NotificationLogRepository,
    private readonly preferences: NotificationPreferenceRepository,
    private readonly eventMappings: NotificationEventMappingRepository,
    private readonly groups: NotificationGroupRepository,
    private readonly recipients: RecipientLookupRepository,
    private readonly audit: NotificationAuditRepository,
    private readonly events: NotificationEventBus,
    private readonly providers: ProviderRegistry,
  ) {}

  // --- Templates -------------------------------------------------------------

  public async listTemplates(query: unknown): Promise<PaginatedTemplates> {
    const parsed = listTemplatesQuerySchema.parse(query);
    const { rows, total } = await this.templates.search(parsed);
    const items = await Promise.all(rows.map((row) => this.toTemplateDto(row)));
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async getTemplate(id: string): Promise<TemplateData> {
    return this.toTemplateDto(await this.requireTemplate(id));
  }

  public async createTemplate(input: unknown, actor: NotificationActor): Promise<TemplateData> {
    const data = createTemplateSchema.parse(input);
    if (await this.templates.findByCode(data.code)) {
      throw new ConflictError('A template with this code already exists.');
    }
    const groupId = await this.resolveGroupId(data.groupCode);
    const variables = extractVariables(`${data.subject ?? ''} ${data.body}`);

    const template = await this.templates.create({
      code: data.code,
      name: data.name,
      groupId,
      channel: data.channel,
      subject: data.subject ?? null,
      body: data.body,
      variables,
      locale: data.locale ?? 'en',
      status: data.status ?? 'DRAFT',
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await this.audit.write(
      {
        entityType: 'notification_template',
        entityId: template.id,
        action: 'CREATE',
        newValue: { code: template.code, channel: template.channel },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
    return this.toTemplateDto(template);
  }

  public async updateTemplate(
    id: string,
    input: unknown,
    actor: NotificationActor,
  ): Promise<TemplateData> {
    const data = updateTemplateSchema.parse(input);
    const template = await this.requireTemplate(id);

    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.locale !== undefined) values.locale = data.locale;
    if (data.status !== undefined) values.status = data.status;
    if (data.groupCode !== undefined) {
      values.groupId = data.groupCode ? await this.resolveGroupId(data.groupCode) : null;
    }
    const contentChanged = data.subject !== undefined || data.body !== undefined;
    const subject = data.subject !== undefined ? data.subject : template.subject;
    const body = data.body !== undefined ? data.body : template.body;
    if (data.subject !== undefined) values.subject = data.subject;
    if (data.body !== undefined) values.body = data.body;
    if (contentChanged) {
      values.variables = extractVariables(`${subject ?? ''} ${body}`);
      values.revision = template.revision + 1;
    }

    const updated = (await this.templates.update(id, values)) ?? template;
    await this.audit.write(
      {
        entityType: 'notification_template',
        entityId: id,
        action: 'UPDATE',
        newValue: { revision: updated.revision, status: updated.status },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
    return this.toTemplateDto(updated);
  }

  public async previewTemplate(id: string, input: unknown): Promise<TemplatePreview> {
    const data = previewTemplateSchema.parse(input);
    const template = await this.requireTemplate(id);
    const variables = (data.variables ?? {}) as TemplateVariables;
    const rendered = renderTemplate({ subject: template.subject, body: template.body }, variables);
    const declared = extractVariables(`${template.subject ?? ''} ${template.body}`);
    return { ...rendered, missingVariables: missingVariables(declared, variables) };
  }

  // --- Notifications: create / send / schedule -------------------------------

  public async createDraft(input: unknown, actor: NotificationActor): Promise<NotificationData> {
    return this.createNotification(input, actor, 'DRAFT');
  }

  public async send(input: unknown, actor: NotificationActor): Promise<NotificationData> {
    return this.createNotification(input, actor, 'SEND');
  }

  public async schedule(input: unknown, actor: NotificationActor): Promise<NotificationData> {
    const parsed = createNotificationSchema.parse(input);
    if (!parsed.scheduledAt) {
      throw new ValidationError('A scheduled notification requires scheduledAt.');
    }
    return this.createNotification(input, actor, 'SCHEDULE');
  }

  private async createNotification(
    input: unknown,
    actor: NotificationActor,
    mode: CreateMode,
  ): Promise<NotificationData> {
    const data = createNotificationSchema.parse(input);

    // Resolve recipient (member → inbox user).
    let recipientUserId = data.recipientUserId ?? null;
    let recipientMemberId = data.recipientMemberId ?? null;
    if (recipientMemberId) {
      const member = await this.recipients.memberById(recipientMemberId);
      if (!member) {
        throw new NotFoundError('Recipient member not found.');
      }
      recipientUserId = recipientUserId ?? member.userId;
    } else if (recipientUserId) {
      if (!(await this.recipients.userExists(recipientUserId))) {
        throw new NotFoundError('Recipient user not found.');
      }
      const member = await this.recipients.memberByUserId(recipientUserId);
      recipientMemberId = member?.memberId ?? null;
    }

    // Resolve content (template or inline).
    let channel: NotificationChannel;
    let subject: string | null;
    let body: string;
    let templateId: string | null = null;
    let groupId: string | null = null;
    const variables = (data.variables ?? {}) as TemplateVariables;

    if (data.templateCode) {
      const template = await this.templates.findByCode(data.templateCode.toUpperCase());
      if (!template) {
        throw new NotFoundError('Template not found.');
      }
      if (template.status !== 'ACTIVE') {
        throw new BusinessRuleError('Template is not active.');
      }
      const rendered = renderTemplate(
        { subject: template.subject, body: template.body },
        variables,
      );
      channel = data.channel ?? template.channel;
      subject = rendered.subject;
      body = rendered.body;
      templateId = template.id;
      groupId = template.groupId;
    } else {
      channel = data.channel!;
      subject = data.subject ?? null;
      body = data.body!;
      groupId = data.groupCode ? await this.resolveGroupId(data.groupCode) : null;
    }

    // Preference enforcement.
    const preferenceBlocked =
      recipientUserId != null &&
      !(await this.preferences.isEnabled(recipientUserId, channel, groupId));

    const scheduledAt =
      mode === 'SCHEDULE' && data.scheduledAt
        ? new Date(data.scheduledAt)
        : mode === 'SEND'
          ? new Date()
          : null;

    const notification = await withTransaction(this.db, async (tx) => {
      const values: NotificationInsert = {
        recipientUserId,
        recipientMemberId,
        templateId,
        groupId,
        channel,
        subject,
        body,
        data: variables,
        status: 'DRAFT',
        scheduledAt,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      };
      const created = await this.notifications.create(values, tx);
      await this.logs.append(
        { notificationId: created.id, action: 'created', toStatus: 'DRAFT', actorId: actor.userId },
        tx,
      );

      if (mode !== 'DRAFT') {
        if (preferenceBlocked) {
          await this.notifications.update(
            created.id,
            { status: 'CANCELLED', failedReason: 'Recipient has disabled this channel.' },
            tx,
          );
          await this.logs.append(
            {
              notificationId: created.id,
              action: 'suppressed',
              fromStatus: 'DRAFT',
              toStatus: 'CANCELLED',
              detail: 'Preference disabled',
              actorId: actor.userId,
            },
            tx,
          );
        } else {
          await this.notifications.update(created.id, { status: 'QUEUED' }, tx);
          await this.queue.enqueue(
            { notificationId: created.id, channel, scheduledAt: scheduledAt ?? new Date() },
            tx,
          );
          await this.logs.append(
            {
              notificationId: created.id,
              action: 'queued',
              fromStatus: 'DRAFT',
              toStatus: 'QUEUED',
              actorId: actor.userId,
            },
            tx,
          );
        }
      }

      await this.audit.write(
        {
          entityType: 'notification',
          entityId: created.id,
          action: 'CREATE',
          newValue: { channel, mode, templateId },
          userId: actor.userId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          module: MODULE,
          correlationId: actor.correlationId,
        },
        tx,
      );
      return created;
    });

    await this.events.publish({
      type: 'NotificationCreated',
      notificationId: notification.id,
      actorId: actor.userId,
      at: new Date(),
    });
    if (mode !== 'DRAFT' && !preferenceBlocked) {
      await this.events.publish({
        type: 'NotificationQueued',
        notificationId: notification.id,
        actorId: actor.userId,
        at: new Date(),
      });
    }
    return this.toNotificationDto(await this.requireNotification(notification.id));
  }

  // --- Queue processing (idempotent) -----------------------------------------

  public async processQueue(input: unknown, actor: NotificationActor): Promise<QueueRunResult> {
    const data = processQueueSchema.parse(input);
    const asOf = data.asOf ? new Date(data.asOf) : new Date();
    const due = await this.queue.listDue(asOf, data.limit ?? 100);

    const result: QueueRunResult = { processed: 0, sent: 0, failed: 0, dead: 0 };
    for (const item of due) {
      const claimed = await this.queue.claim(item.id);
      if (!claimed) {
        continue; // another processor won the claim — idempotent skip.
      }
      result.processed += 1;
      await this.deliver(
        claimed.id,
        claimed.notificationId,
        claimed.channel,
        claimed.attempts,
        claimed.maxAttempts,
        actor,
        result,
      );
    }
    return result;
  }

  private async deliver(
    queueId: string,
    notificationId: string,
    channel: NotificationChannel,
    priorAttempts: number,
    maxAttempts: number,
    actor: NotificationActor,
    result: QueueRunResult,
  ): Promise<void> {
    const notification = await this.notifications.findById(notificationId);
    if (!notification || notification.status === 'CANCELLED') {
      await this.queue.markResult(queueId, {
        status: 'CANCELLED',
        attempts: priorAttempts,
        lastError: null,
        nextAttemptAt: null,
        processed: true,
      });
      return;
    }

    await this.transition(notification, 'SENDING', 'sending', actor);
    const attempt = priorAttempts + 1;
    const provider = this.providers.get(channel);
    if (!provider) {
      await this.failDelivery(
        queueId,
        notification,
        channel,
        attempt,
        maxAttempts,
        'No provider configured for channel.',
        actor,
        result,
      );
      return;
    }

    const recipient = notification.recipientUserId ?? notification.recipientMemberId;
    const outcome = await provider.send({
      notificationId,
      channel,
      recipient,
      subject: notification.subject,
      body: notification.body,
    });

    if (outcome.result === 'FAILED') {
      await this.failDelivery(
        queueId,
        notification,
        channel,
        attempt,
        maxAttempts,
        outcome.error ?? 'Delivery failed.',
        actor,
        result,
      );
      return;
    }

    // SENT or DELIVERED.
    await this.deliveries.append({
      notificationId,
      channel,
      result: outcome.result,
      provider: provider.name,
      providerMessageId: outcome.providerMessageId,
      error: null,
      attempt,
    });
    if (outcome.result === 'DELIVERED') {
      await this.notifications.update(notificationId, {
        status: 'DELIVERED',
        sentAt: new Date(),
        deliveredAt: new Date(),
      });
      await this.logs.append({
        notificationId,
        action: 'delivered',
        fromStatus: 'SENDING',
        toStatus: 'DELIVERED',
        actorId: actor.userId,
      });
      await this.events.publish({
        type: 'NotificationSent',
        notificationId,
        channel,
        at: new Date(),
      });
      await this.events.publish({
        type: 'NotificationDelivered',
        notificationId,
        channel,
        at: new Date(),
      });
    } else {
      await this.notifications.update(notificationId, { status: 'SENT', sentAt: new Date() });
      await this.logs.append({
        notificationId,
        action: 'sent',
        fromStatus: 'SENDING',
        toStatus: 'SENT',
        actorId: actor.userId,
      });
      await this.events.publish({
        type: 'NotificationSent',
        notificationId,
        channel,
        at: new Date(),
      });
    }
    await this.queue.markResult(queueId, {
      status: 'SENT',
      attempts: attempt,
      lastError: null,
      nextAttemptAt: null,
      processed: true,
    });
    result.sent += 1;
  }

  private async failDelivery(
    queueId: string,
    notification: NotificationRow,
    channel: NotificationChannel,
    attempt: number,
    maxAttempts: number,
    error: string,
    actor: NotificationActor,
    result: QueueRunResult,
  ): Promise<void> {
    await this.deliveries.append({
      notificationId: notification.id,
      channel,
      result: 'FAILED',
      provider: this.providers.get(channel)?.name ?? 'unknown',
      providerMessageId: null,
      error,
      attempt,
    });
    await this.notifications.update(notification.id, { status: 'FAILED', failedReason: error });
    await this.logs.append({
      notificationId: notification.id,
      action: 'failed',
      fromStatus: 'SENDING',
      toStatus: 'FAILED',
      detail: error,
      actorId: actor.userId,
    });
    await this.events.publish({
      type: 'NotificationFailed',
      notificationId: notification.id,
      channel,
      error,
      at: new Date(),
    });

    if (attempt < maxAttempts) {
      // Re-queue for retry.
      await this.notifications.update(notification.id, { status: 'QUEUED' });
      await this.logs.append({
        notificationId: notification.id,
        action: 'requeued',
        fromStatus: 'FAILED',
        toStatus: 'QUEUED',
        detail: `attempt ${attempt}/${maxAttempts}`,
        actorId: actor.userId,
      });
      await this.queue.markResult(queueId, {
        status: 'PENDING',
        attempts: attempt,
        lastError: error,
        nextAttemptAt: new Date(Date.now() + RETRY_BACKOFF_MS),
        processed: false,
      });
      result.failed += 1;
    } else {
      // Dead-letter.
      await this.queue.markResult(queueId, {
        status: 'DEAD',
        attempts: attempt,
        lastError: error,
        nextAttemptAt: null,
        processed: true,
      });
      await this.logs.append({
        notificationId: notification.id,
        action: 'dead_letter',
        detail: `Exhausted ${maxAttempts} attempts`,
        actorId: actor.userId,
      });
      result.dead += 1;
    }
  }

  public async retry(id: string, actor: NotificationActor): Promise<NotificationData> {
    const notification = await this.requireNotification(id);
    if (notification.status !== 'FAILED') {
      throw new BusinessRuleError('Only failed notifications can be retried.');
    }
    await this.notifications.update(id, { status: 'QUEUED', failedReason: null });
    const requeued = await this.queue.resetForRetry(id);
    if (!requeued) {
      await this.queue.enqueue({
        notificationId: id,
        channel: notification.channel,
        scheduledAt: new Date(),
      });
    }
    await this.logs.append({
      notificationId: id,
      action: 'retry',
      fromStatus: 'FAILED',
      toStatus: 'QUEUED',
      actorId: actor.userId,
    });
    await this.writeAudit(id, 'UPDATE', { action: 'retry' }, actor);
    return this.toNotificationDto(await this.requireNotification(id));
  }

  public async cancel(id: string, actor: NotificationActor): Promise<NotificationData> {
    const notification = await this.requireNotification(id);
    if (!['DRAFT', 'QUEUED'].includes(notification.status)) {
      throw new BusinessRuleError('Only draft or queued notifications can be cancelled.');
    }
    await this.notifications.update(id, { status: 'CANCELLED' });
    await this.queue.cancel(id);
    await this.logs.append({
      notificationId: id,
      action: 'cancelled',
      fromStatus: notification.status,
      toStatus: 'CANCELLED',
      actorId: actor.userId,
    });
    await this.writeAudit(id, 'UPDATE', { action: 'cancel' }, actor);
    return this.toNotificationDto(await this.requireNotification(id));
  }

  // --- Admin reads -----------------------------------------------------------

  public async list(query: unknown): Promise<PaginatedNotifications> {
    const parsed = listNotificationsQuerySchema.parse(query);
    const { rows, total } = await this.notifications.search(parsed);
    const items = await Promise.all(rows.map((row) => this.toNotificationDto(row)));
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async get(id: string): Promise<NotificationData> {
    return this.toNotificationDto(await this.requireNotification(id));
  }

  public async getDeliveries(id: string): Promise<DeliveryData[]> {
    await this.requireNotification(id);
    return (await this.deliveries.listByNotification(id)).map(toDelivery);
  }

  public async getLogs(id: string): Promise<NotificationLogData[]> {
    await this.requireNotification(id);
    return (await this.logs.listByNotification(id)).map(toNotificationLog);
  }

  public async getQueue(
    status?: string,
  ): Promise<{ items: QueueItemData[]; counts: Record<string, number> }> {
    const counts = await this.queue.counts();
    const items = status
      ? (await this.queue.listByStatus(status as QueueItemData['status'])).map(toQueueItem)
      : [];
    return { items, counts };
  }

  // --- Member inbox & preferences --------------------------------------------

  public async getInbox(userId: string, query: unknown): Promise<PaginatedNotifications> {
    const parsed = inboxQuerySchema.parse(query);
    const { rows, total } = await this.notifications.inbox(userId, parsed);
    const items = await Promise.all(rows.map((row) => this.toNotificationDto(row)));
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async unreadCount(userId: string): Promise<number> {
    return this.notifications.unreadCount(userId);
  }

  public async markRead(id: string, userId: string, read: boolean): Promise<NotificationData> {
    const notification = await this.requireOwned(id, userId);
    await this.notifications.update(id, {
      readAt: read ? (notification.readAt ?? new Date()) : null,
    });
    if (read) {
      await this.logs.append({ notificationId: id, action: 'read', actorId: userId });
      await this.events.publish({
        type: 'NotificationRead',
        notificationId: id,
        userId,
        at: new Date(),
      });
    }
    return this.toNotificationDto(await this.requireNotification(id));
  }

  public async archive(id: string, userId: string): Promise<NotificationData> {
    const notification = await this.requireOwned(id, userId);
    await this.notifications.update(id, { archivedAt: notification.archivedAt ?? new Date() });
    await this.logs.append({ notificationId: id, action: 'archived', actorId: userId });
    await this.events.publish({
      type: 'NotificationArchived',
      notificationId: id,
      userId,
      at: new Date(),
    });
    return this.toNotificationDto(await this.requireNotification(id));
  }

  public async getPreferences(userId: string): Promise<PreferenceData[]> {
    const rows = await this.preferences.listByUser(userId);
    return Promise.all(
      rows.map(async (row) => ({
        channel: row.channel,
        groupCode: row.groupId ? await this.groups.codeById(row.groupId) : null,
        enabled: row.enabled,
      })),
    );
  }

  public async updatePreferences(
    userId: string,
    input: unknown,
    actor: NotificationActor,
  ): Promise<PreferenceData[]> {
    const data = updatePreferencesSchema.parse(input);
    for (const pref of data.preferences) {
      const groupId = pref.groupCode ? await this.resolveGroupId(pref.groupCode) : null;
      await this.preferences.upsert({
        userId,
        channel: pref.channel,
        groupId,
        enabled: pref.enabled,
        updatedBy: actor.userId,
      });
    }
    await this.audit.write(
      {
        entityType: 'notification_preference',
        entityId: userId,
        action: 'UPDATE',
        newValue: { count: data.preferences.length },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
    await this.events.publish({ type: 'PreferenceUpdated', userId, at: new Date() });
    return this.getPreferences(userId);
  }

  // --- Event consumer --------------------------------------------------------

  /**
   * Consumes a domain event from another module. If an active event→template
   * mapping exists, creates and sends a notification for the recipient. Callers
   * pass the recipient + variables; no business logic is duplicated here.
   */
  public async handleEvent(
    eventType: string,
    recipient: { recipientUserId?: string; recipientMemberId?: string },
    variables: TemplateVariables,
    actor: NotificationActor,
  ): Promise<NotificationData | null> {
    const mapping = await this.eventMappings.findByEventType(eventType);
    if (!mapping) {
      return null;
    }
    const template = await this.templates.findById(mapping.templateId);
    if (!template || template.status !== 'ACTIVE') {
      return null;
    }
    return this.send(
      {
        templateCode: template.code,
        channel: mapping.channel,
        variables,
        recipientUserId: recipient.recipientUserId,
        recipientMemberId: recipient.recipientMemberId,
      },
      actor,
    );
  }

  // --- Internals -------------------------------------------------------------

  private async transition(
    notification: NotificationRow,
    to: NotificationStatus,
    action: string,
    actor: NotificationActor,
  ): Promise<void> {
    if (!canTransition(notification.status, to)) {
      throw new BusinessRuleError(
        `Cannot transition notification from ${notification.status} to ${to}.`,
      );
    }
    await this.notifications.update(notification.id, { status: to });
    await this.logs.append({
      notificationId: notification.id,
      action,
      fromStatus: notification.status,
      toStatus: to,
      actorId: actor.userId,
    });
  }

  private async resolveGroupId(code: string | null | undefined): Promise<string | null> {
    if (!code) {
      return null;
    }
    const group = await this.groups.findByCode(code.toUpperCase());
    if (!group) {
      throw new ValidationError(`Unknown notification group: ${code}.`);
    }
    return group.id;
  }

  private async toTemplateDto(row: TemplateRow): Promise<TemplateData> {
    const groupCode = row.groupId ? await this.groups.codeById(row.groupId) : null;
    return toTemplate(row, groupCode);
  }

  private async toNotificationDto(row: NotificationRow): Promise<NotificationData> {
    const groupCode = row.groupId ? await this.groups.codeById(row.groupId) : null;
    return toNotification(row, groupCode);
  }

  private async writeAudit(
    entityId: string,
    action: 'CREATE' | 'UPDATE',
    newValue: Record<string, unknown>,
    actor: NotificationActor,
  ): Promise<void> {
    await this.audit.write(
      {
        entityType: 'notification',
        entityId,
        action,
        newValue,
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
  }

  private async requireTemplate(id: string): Promise<TemplateRow> {
    const template = await this.templates.findById(id);
    if (!template) {
      throw new NotFoundError('Template not found.');
    }
    return template;
  }

  private async requireNotification(id: string): Promise<NotificationRow> {
    const notification = await this.notifications.findById(id);
    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }
    return notification;
  }

  private async requireOwned(id: string, userId: string): Promise<NotificationRow> {
    const notification = await this.requireNotification(id);
    if (notification.recipientUserId !== userId) {
      throw new NotFoundError('Notification not found.');
    }
    return notification;
  }
}
